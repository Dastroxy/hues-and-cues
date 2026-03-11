export type GamePhase =
  | 'lobby'
  | 'cue1'
  | 'guess1'
  | 'cue2'
  | 'guess2'
  | 'scoring'
  | 'between_rounds'
  | 'results'

export interface Player {
  id: string
  name: string
  color: string
  score: number
  isHost: boolean
  ready: boolean
}

export interface Guess {
  playerId: string
  row: number
  col: number
  round: 1 | 2
}

export interface GameState {
  phase: GamePhase
  players: Record<string, Player>
  hostId: string
  cueGiverId: string
  cueGiverOrder: string[]
  currentCueGiverIndex: number
  targetRow: number
  targetCol: number
  cue1: string
  cue2: string
  cue2Passed: boolean
  guesses: Record<string, Record<string, Guess>>
  scores: Record<string, number>
  roundScores: Record<string, number>
  roundNumber: number
  totalRounds: number
  usedCues: string[]
  createdAt: number
}
