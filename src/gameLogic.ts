import { ref, set, update, onValue, off, get } from 'firebase/database'
import { db } from './firebase'
import type { GameState, Player, Guess } from './types'
import { getScore } from './colors'

export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function generatePlayerId(): string {
  let id = sessionStorage.getItem('hac_player_id')
  if (!id) {
    id = Math.random().toString(36).substring(2, 12)
    sessionStorage.setItem('hac_player_id', id)
  }
  return id
}

export async function createGame(hostPlayer: Omit<Player, 'score' | 'ready'>): Promise<string> {
  const gameId = generateGameId()
  const initialState: GameState = {
    phase: 'lobby',
    players: { [hostPlayer.id]: { ...hostPlayer, score: 0, ready: false } },
    hostId: hostPlayer.id,
    cueGiverId: hostPlayer.id,
    cueGiverOrder: [],
    currentCueGiverIndex: 0,
    targetRow: 0,
    targetCol: 0,
    cue1: '',
    cue2: '',
    cue2Passed: false,
    guesses: {},
    scores: { [hostPlayer.id]: 0 },
    roundScores: {},
    roundNumber: 0,
    totalRounds: 0,
    usedCues: [],
    createdAt: Date.now(),
  }
  await set(ref(db, `games/${gameId}`), initialState)
  return gameId
}

export async function joinGame(gameId: string, player: Omit<Player, 'score' | 'ready'>): Promise<void> {
  await update(ref(db, `games/${gameId}/players/${player.id}`), {
    ...player, score: 0, ready: false,
  })
  await update(ref(db, `games/${gameId}/scores`), { [player.id]: 0 })
}

export async function startGame(gameId: string, state: GameState): Promise<void> {
  const playerIds = Object.keys(state.players)
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5)
  const totalRounds = playerIds.length >= 7 ? playerIds.length : playerIds.length * 2
  await update(ref(db, `games/${gameId}`), {
    cueGiverOrder: shuffled,
    currentCueGiverIndex: 0,
    cueGiverId: shuffled[0],
    totalRounds,
    roundNumber: 1,
    phase: 'cue1',
    guesses: {},
    roundScores: {},
    scoringFinalized: false,
    cue1: '',
    cue2: '',
    cue2Passed: false,
    targetRow: Math.floor(Math.random() * 20),
    targetCol: Math.floor(Math.random() * 24),
  })
}

export async function submitCue1(gameId: string, cue: string): Promise<void> {
  await update(ref(db, `games/${gameId}`), {
    cue1: cue,
    phase: 'guess1',
  })
}

export async function submitGuess(
  gameId: string,
  playerId: string,
  row: number,
  col: number,
  round: 1 | 2
): Promise<void> {
  const key = round === 1 ? '0' : '1'
  await update(ref(db, `games/${gameId}/guesses/${playerId}`), {
    [key]: { playerId, row, col, round },
  })
}

export async function submitCue2(gameId: string, cue: string): Promise<void> {
  await update(ref(db, `games/${gameId}`), { cue2: cue, phase: 'guess2' })
}

export async function passCue2(gameId: string): Promise<void> {
  await update(ref(db, `games/${gameId}`), { cue2Passed: true, phase: 'scoring' })
}

export async function advancePhase(gameId: string, phase: string): Promise<void> {
  await update(ref(db, `games/${gameId}`), { phase })
}

export function computeRoundScores(state: GameState): Record<string, number> {
  const { guesses, targetRow, targetCol, cueGiverId, players } = state
  const roundScores: Record<string, number> = {}
  const playerIds = Object.keys(players).filter(id => id !== cueGiverId)
  Object.keys(players).forEach(id => (roundScores[id] = 0))
  const numPlayers = Object.keys(players).length
  let cueGiverPoints = 0

  playerIds.forEach(pid => {
    const pGuesses: Guess[] = guesses?.[pid] ? Object.values(guesses[pid]) : []
    let playerPoints = 0
    pGuesses.forEach(g => {
      const pts = getScore(g.row, g.col, targetRow, targetCol)
      playerPoints += pts
      if (pts > 0) cueGiverPoints += numPlayers <= 3 ? 2 : 1
    })
    roundScores[pid] = playerPoints
  })

  roundScores[cueGiverId] = Math.min(9, cueGiverPoints)
  return roundScores
}

export async function finalizeRound(gameId: string, state: GameState): Promise<void> {
  const snap = await get(ref(db, `games/${gameId}`))
  if (!snap.exists()) return
  const fresh = snap.val() as GameState & { scoringFinalized?: boolean }
  if (fresh.scoringFinalized) return

  await update(ref(db, `games/${gameId}`), { scoringFinalized: true })

  const roundScores = computeRoundScores(fresh)
  const newScores: Record<string, number> = {}
  Object.keys(fresh.players).forEach(id => {
    newScores[id] = (fresh.scores[id] ?? 0) + (roundScores[id] ?? 0)
  })

  const isLastRound = fresh.roundNumber >= fresh.totalRounds

  if (isLastRound) {
    await update(ref(db, `games/${gameId}`), {
      scores: newScores,
      roundScores,
      phase: 'results',
    })
  } else {
    const nextIndex = fresh.currentCueGiverIndex + 1
    // Wrap around if we've gone through all players
    const safeIndex = nextIndex % fresh.cueGiverOrder.length
    const nextCueGiver = fresh.cueGiverOrder[safeIndex]

    // Guard: if nextCueGiver is still undefined something is deeply wrong
    if (!nextCueGiver) {
      console.error('nextCueGiver undefined — forcing results', { nextIndex, safeIndex, order: fresh.cueGiverOrder })
      await update(ref(db, `games/${gameId}`), {
        scores: newScores,
        roundScores,
        phase: 'results',
      })
      return
    }

    await update(ref(db, `games/${gameId}`), {
      scores: newScores,
      roundScores,
      phase: 'between_rounds',
      nextRoundData: {
        roundNumber: fresh.roundNumber + 1,
        currentCueGiverIndex: safeIndex,
        cueGiverId: nextCueGiver,
      },
    })
  }
}


export async function advanceToNextRound(
  gameId: string,
  state: GameState & { nextRoundData?: { roundNumber: number; currentCueGiverIndex: number; cueGiverId: string } }
): Promise<void> {
  const next = state.nextRoundData
  if (!next) return
  await update(ref(db, `games/${gameId}`), {
    phase: 'cue1',
    roundNumber: next.roundNumber,
    currentCueGiverIndex: next.currentCueGiverIndex,
    cueGiverId: next.cueGiverId,
    guesses: {},
    cue1: '',
    cue2: '',
    cue2Passed: false,
    roundScores: {},
    scoringFinalized: false,
    nextRoundData: null,
    targetRow: Math.floor(Math.random() * 20),
    targetCol: Math.floor(Math.random() * 24),
  })
}

export async function restartGame(gameId: string, state: GameState): Promise<void> {
  const resetScores: Record<string, number> = {}
  Object.keys(state.players).forEach(id => (resetScores[id] = 0))
  const playerIds = Object.keys(state.players)
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5)
  const totalRounds = playerIds.length >= 7 ? playerIds.length : playerIds.length * 2
  await update(ref(db, `games/${gameId}`), {
    scores: resetScores,
    roundScores: {},
    guesses: {},
    cueGiverOrder: shuffled,
    currentCueGiverIndex: 0,
    cueGiverId: shuffled[0],
    totalRounds,
    roundNumber: 1,
    phase: 'lobby',
    cue1: '',
    cue2: '',
    cue2Passed: false,
    usedCues: [],
    scoringFinalized: false,
    nextRoundData: null,
  })
}

export function listenToGame(
  gameId: string,
  callback: (state: GameState | null) => void
) {
  const gameRef = ref(db, `games/${gameId}`)
  onValue(gameRef, snap =>
    callback(snap.exists() ? (snap.val() as GameState) : null)
  )
  return () => off(gameRef)
}
