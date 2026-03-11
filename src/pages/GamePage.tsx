import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  listenToGame, submitCue1, submitGuess, submitCue2,
  passCue2, advancePhase, finalizeRound, advanceToNextRound,
  generatePlayerId, computeRoundScores
} from '../gameLogic'
import { COLOR_GRID, ROW_LABELS, COL_LABELS, getColor } from '../colors'
import type { GameState, Guess } from '../types'

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<GameState | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [cueInput, setCueInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playerId = generatePlayerId()

  useEffect(() => {
    if (!gameId) return
    const unsub = listenToGame(gameId, s => {
      setState(s)
      if (s?.phase === 'results') navigate(`/game/${gameId}/results`)
      if (s?.phase === 'lobby') navigate(`/lobby/${gameId}`)
    })
    return unsub
  }, [gameId])

  // between_rounds countdown — host advances after 4s
  useEffect(() => {
    if (!state || !gameId) return
    if (state.phase !== 'between_rounds') {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      setCountdown(0)
      return
    }

    const isHost = state.hostId === playerId
    setCountdown(4)
    let tick = 4

    countdownRef.current = setInterval(() => {
      tick -= 1
      setCountdown(tick)

      if (tick <= 0) {
        clearInterval(countdownRef.current!)
        countdownRef.current = null

        if (isHost) {
          advanceToNextRound(gameId, state as any)
        }
      }
    }, 1000)

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [state?.phase, state?.roundNumber, gameId])

  if (!state || !state.players) {
    return <div className="page"><div className="pulse" style={{ color: 'var(--text-muted)' }}>Loading game...</div></div>
  }
  if (!state.players[playerId]) {
    return <div className="page"><div className="pulse" style={{ color: 'var(--text-muted)' }}>Joining game...</div></div>
  }

  const {
    phase, cueGiverId, players, guesses, cue1, cue2,
    cue2Passed, scores, roundNumber, totalRounds, targetRow, targetCol
  } = state

  const isCueGiver = playerId === cueGiverId
  const cueGiverName = players[cueGiverId]?.name ?? 'Unknown'
  const allPlayers = Object.values(players)
  const guessers = allPlayers.filter(p => p.id !== cueGiverId)

  const myGuesses: Guess[] = guesses?.[playerId] ? Object.values(guesses[playerId]) : []
  const hasGuess1 = myGuesses.some(g => g.round === 1)
  const hasGuess2 = myGuesses.some(g => g.round === 2)

  const guessedCount1 = guessers.filter(p => {
    const pg: Guess[] = guesses?.[p.id] ? Object.values(guesses[p.id]) : []
    return pg.some(g => g.round === 1)
  }).length
  const guessedCount2 = guessers.filter(p => {
    const pg: Guess[] = guesses?.[p.id] ? Object.values(guesses[p.id]) : []
    return pg.some(g => g.round === 2)
  }).length
  const allGuess1Done = guessers.length > 0 && guessedCount1 === guessers.length
  const allGuess2Done = guessers.length > 0 && guessedCount2 === guessers.length

  const allGuessesFlat: Array<{ playerId: string; row: number; col: number; round: number }> = []
  if (guesses) {
    Object.values(guesses).forEach(pg => {
      if (pg) Object.values(pg).forEach((g: Guess) => allGuessesFlat.push(g))
    })
  }

  const showTarget = phase === 'scoring' || phase === 'between_rounds' || phase === 'results'
  const roundScores = (phase === 'scoring' || phase === 'between_rounds')
    ? computeRoundScores(state)
    : (state.roundScores ?? {})

  const boardClickable =
    (!isCueGiver && phase === 'guess1' && !hasGuess1) ||
    (!isCueGiver && phase === 'guess2' && !hasGuess2)

  async function handleCue1Submit() {
    if (!cueInput.trim() || !gameId) return setError('Enter a clue first')
    if (cueInput.trim().includes(' ')) return setError('Must be a single word')
    setLoading(true); setError('')
    await submitCue1(gameId, cueInput.trim())
    setCueInput(''); setLoading(false)
  }

  async function handleGuess(round: 1 | 2) {
    if (!selectedCell || !gameId) return setError('Tap a color first')
    setLoading(true); setError('')
    await submitGuess(gameId, playerId, selectedCell.row, selectedCell.col, round)
    setSelectedCell(null); setLoading(false)
  }

  async function handleCue2Submit() {
    if (!cueInput.trim() || !gameId) return setError('Enter a cue')
    if (cueInput.trim().split(/\s+/).length > 2) return setError('Max 2 words')
    setLoading(true); setError('')
    await submitCue2(gameId, cueInput.trim())
    setCueInput(''); setLoading(false)
  }

  async function handleFinalizeRound() {
    if (!gameId || loading) return
    setLoading(true)
    try {
      await finalizeRound(gameId, state)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div className="topbar" style={{ padding: '0.75rem 1rem', flexShrink: 0 }}>
        <span className="logo-text">HUES & CUES</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {roundNumber}/{totalRounds}
          </span>
          <div className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', fontSize: '0.65rem' }}>
            {cueGiverName.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>

        {/* Phase banner */}
        <div className="phase-banner fade-in" style={{ fontSize: '0.78rem' }}>
          <div className="phase-dot pulse" />
          <span>
            {phase === 'cue1' && (isCueGiver ? 'Give a 1-word clue for your secret color' : `Waiting for ${cueGiverName}'s clue...`)}
            {phase === 'guess1' && (isCueGiver ? `Waiting for players... (${guessedCount1}/${guessers.length})` : hasGuess1 ? 'First guess locked — waiting for others...' : 'Tap a color — first guess')}
            {phase === 'cue2' && (isCueGiver ? 'Give a 2-word clue or pass' : `Waiting for ${cueGiverName}'s 2nd clue...`)}
            {phase === 'guess2' && (isCueGiver ? `Waiting for players... (${guessedCount2}/${guessers.length})` : hasGuess2 ? 'Second guess locked — waiting for others...' : 'Tap a color — second guess')}
            {phase === 'scoring' && 'Round complete — check the results!'}
            {phase === 'between_rounds' && `Next round starting in ${countdown}...`}
          </span>
        </div>

        {/* Cue boxes */}
        {cue1 && (
          <div className="cue-box fade-in">
            <span className="cue-box-label">CUE 1</span>
            {cue1.toUpperCase()}
          </div>
        )}
        {cue2 && (
          <div className="cue-box fade-in" style={{ borderColor: 'var(--accent2)' }}>
            <span className="cue-box-label" style={{ color: 'var(--accent2)', background: 'var(--surface2)' }}>CUE 2</span>
            {cue2.toUpperCase()}
          </div>
        )}
        {cue2Passed && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem', border: '1.5px dashed var(--border)' }}>
            Cue giver passed on the second cue
          </div>
        )}

        {/* COLOR BOARD */}
        <div className="color-grid-outer" style={{ flexShrink: 0, cursor: boardClickable ? 'crosshair' : 'default' }}>
          <div className="color-grid">
            <div className="grid-label" />
            {COL_LABELS.map(l => <div key={`cl-${l}`} className="grid-label">{l}</div>)}
            {COLOR_GRID.map((rowColors, ri) => (
              <>
                <div key={`rl-${ri}`} className="grid-label">{ROW_LABELS[ri]}</div>
                {rowColors.map((hex, ci) => {
                  const isTarget = (showTarget || (isCueGiver && (phase === 'cue1' || phase === 'cue2'))) && ri === targetRow && ci === targetCol
                  const isInFrame = showTarget && !isTarget &&
                    Math.max(Math.abs(ri - targetRow), Math.abs(ci - targetCol)) <= 2
                  const isSelected = !isCueGiver && selectedCell?.row === ri && selectedCell?.col === ci
                  const cellGuesses = allGuessesFlat.filter(g => g.row === ri && g.col === ci)
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className={`color-cell${isTarget ? ' target' : ''}${isInFrame ? ' in-frame' : ''}${isSelected ? ' selected' : ''}`}
                      style={{ background: hex, position: 'relative', opacity: boardClickable ? 1 : 0.88 }}
                      onClick={() => {
                        if (!boardClickable) return
                        setError('')
                        if (!isCueGiver && phase === 'guess1' && !hasGuess1) setSelectedCell({ row: ri, col: ci })
                        else if (!isCueGiver && phase === 'guess2' && !hasGuess2) setSelectedCell({ row: ri, col: ci })
                      }}
                    >
                      {cellGuesses.map((g, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'absolute',
                            width: g.round === 2 ? '6px' : '9px',
                            height: g.round === 2 ? '6px' : '9px',
                            borderRadius: '50%',
                            background: players[g.playerId]?.color ?? '#fff',
                            border: `1.5px ${g.round === 2 ? 'dashed' : 'solid'} rgba(255,255,255,0.9)`,
                            top: `${20 + (idx % 3) * 25}%`,
                            left: `${20 + Math.floor(idx / 3) * 25}%`,
                            pointerEvents: 'none',
                            zIndex: 10,
                          }}
                        />
                      ))}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>

        {/* ACTION PANELS */}

        {/* CUE GIVER — cue1: show target color */}
        {isCueGiver && phase === 'cue1' && (
          <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Your Secret Target — only you can see this
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface2)', border: '2px solid var(--accent)' }}>
              <div style={{
                width: 52, height: 52,
                background: getColor(targetRow, targetCol),
                border: '3px solid #fff',
                flexShrink: 0,
                boxShadow: `0 0 24px ${getColor(targetRow, targetCol)}99`,
              }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                  {ROW_LABELS[targetRow]}{COL_LABELS[targetCol]}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  No color names or position references allowed!
                </div>
              </div>
            </div>
            <input
              className="input"
              placeholder="One-word clue (e.g. ocean, rust, mango)..."
              value={cueInput}
              onChange={e => setCueInput(e.target.value.replace(/\s+/g, ''))}
              maxLength={30}
              onKeyDown={e => e.key === 'Enter' && handleCue1Submit()}
            />
            {error && <div style={{ color: 'var(--accent2)', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>}
            <button className="btn btn-primary" disabled={!cueInput.trim() || loading} onClick={handleCue1Submit}>
              <span>Submit Clue & Start Round</span>
            </button>
          </div>
        )}

        {/* CUE GIVER — waiting for guess1 */}
        {isCueGiver && phase === 'guess1' && (
          <div className="card fade-in">
            {allGuess1Done
              ? <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => advancePhase(gameId!, 'cue2')}>
                  <span>All Guessed — Give 2nd Clue</span>
                </button>
              : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                  Waiting for players... ({guessedCount1}/{guessers.length})
                </div>
            }
          </div>
        )}

        {/* CUE GIVER — cue2: show target again for reference */}
        {isCueGiver && phase === 'cue2' && (
          <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--surface2)', border: '2px solid var(--border-bright)' }}>
              <div style={{
                width: 36, height: 36,
                background: getColor(targetRow, targetCol),
                border: '2px solid #fff',
                flexShrink: 0,
                boxShadow: `0 0 16px ${getColor(targetRow, targetCol)}88`,
              }} />
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Target</div>
                <div style={{ fontWeight: 800 }}>{ROW_LABELS[targetRow]}{COL_LABELS[targetCol]}</div>
              </div>
            </div>
            <input
              className="input"
              placeholder="Two-word clue (e.g. deep sea, summer sky)..."
              value={cueInput}
              onChange={e => setCueInput(e.target.value)}
              maxLength={40}
              onKeyDown={e => e.key === 'Enter' && handleCue2Submit()}
            />
            {error && <div style={{ color: 'var(--accent2)', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => passCue2(gameId!)}>
                <span>Pass</span>
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={!cueInput.trim() || loading} onClick={handleCue2Submit}>
                <span>Submit 2nd Clue</span>
              </button>
            </div>
          </div>
        )}

        {/* CUE GIVER — waiting for guess2 */}
        {isCueGiver && phase === 'guess2' && (
          <div className="card fade-in">
            {allGuess2Done
              ? <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => advancePhase(gameId!, 'scoring')}>
                  <span>All Guessed — Reveal & Score</span>
                </button>
              : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                  Waiting for players... ({guessedCount2}/{guessers.length})
                </div>
            }
          </div>
        )}

        {/* GUESSER — first guess */}
        {!isCueGiver && phase === 'guess1' && (
          hasGuess1
            ? <div style={{ padding: '0.75rem', border: '1.5px solid var(--accent3)', color: 'var(--accent3)', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                ✓ First guess locked in — waiting for others
              </div>
            : <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedCell
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, background: getColor(selectedCell.row, selectedCell.col), border: '2px solid #fff', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700 }}>{ROW_LABELS[selectedCell.row]}{COL_LABELS[selectedCell.col]} selected</span>
                    </div>
                  : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>👆 Tap a color on the board above</div>
                }
                {error && <div style={{ color: 'var(--accent2)', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>}
                <button className="btn btn-primary" disabled={!selectedCell || loading} onClick={() => handleGuess(1)}>
                  <span>Lock In First Guess</span>
                </button>
              </div>
        )}

        {/* GUESSER — second guess */}
        {!isCueGiver && phase === 'guess2' && (
          hasGuess2
            ? <div style={{ padding: '0.75rem', border: '1.5px solid var(--accent3)', color: 'var(--accent3)', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                ✓ Second guess locked in — waiting for others
              </div>
            : <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedCell
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, background: getColor(selectedCell.row, selectedCell.col), border: '2px solid #fff', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700 }}>{ROW_LABELS[selectedCell.row]}{COL_LABELS[selectedCell.col]} selected</span>
                    </div>
                  : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>👆 Tap a color on the board above</div>
                }
                {error && <div style={{ color: 'var(--accent2)', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>}
                <button className="btn btn-primary" disabled={!selectedCell || loading} onClick={() => handleGuess(2)}>
                  <span>Lock In Second Guess</span>
                </button>
              </div>
        )}

        {/* SCORING / BETWEEN_ROUNDS panel */}
        {(phase === 'scoring' || phase === 'between_rounds') && (
          <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3>Round {roundNumber} Results</h3>
              {phase === 'between_rounds' && (
                <span className="badge pulse" style={{ color: 'var(--accent3)', borderColor: 'var(--accent3)', fontSize: '0.65rem' }}>
                  NEXT ROUND IN {countdown}s
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', background: 'var(--surface2)', border: '2px solid var(--border-bright)' }}>
              <div style={{
                width: 32, height: 32,
                background: getColor(targetRow, targetCol),
                border: '2px solid #fff',
                flexShrink: 0,
                boxShadow: `0 0 16px ${getColor(targetRow, targetCol)}88`,
              }} />
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secret Target</div>
                <div style={{ fontWeight: 800 }}>{ROW_LABELS[targetRow]}{COL_LABELS[targetCol]}</div>
              </div>
            </div>
            {allPlayers.map(p => (
              <div className="score-row" key={p.id}>
                <div className="score-dot" style={{ background: p.color }} />
                <span className="score-name">{p.name}{p.id === playerId ? ' ★' : ''}</span>
                {p.id === cueGiverId && (
                  <span className="badge" style={{ fontSize: '0.55rem', color: 'var(--accent)', borderColor: 'var(--accent)', marginRight: '0.25rem' }}>CUE</span>
                )}
                <span style={{ color: 'var(--accent3)', fontWeight: 800, marginLeft: 'auto' }}>
                  +{roundScores[p.id] ?? 0}
                </span>
              </div>
            ))}
            {isCueGiver && phase === 'scoring' && (
              <button className="btn btn-primary" disabled={loading} onClick={handleFinalizeRound} style={{ width: '100%' }}>
                <span>{loading ? 'Processing...' : state.roundNumber >= state.totalRounds ? 'See Final Results →' : 'Next Round →'}</span>
              </button>
            )}
            {!isCueGiver && phase === 'scoring' && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Waiting for cue giver to continue...
              </div>
            )}
          </div>
        )}

        {/* Scoreboard */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scoreboard</div>
          {[...allPlayers].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)).map(p => {
            const maxScore = Math.max(...allPlayers.map(pp => scores[pp.id] ?? 0), 1)
            return (
              <div className="score-row" key={p.id}>
                <div className="score-dot" style={{ background: p.color }} />
                <span className="score-name">{p.name}{p.id === playerId ? ' ★' : ''}</span>
                <div className="score-bar-wrap">
                  <div className="score-bar" style={{ background: p.color, width: `${((scores[p.id] ?? 0) / maxScore) * 100}%` }} />
                </div>
                <span className="score-pts">{scores[p.id] ?? 0}</span>
              </div>
            )
          })}
        </div>

        {/* Players status */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Players</div>
          {allPlayers.map(p => {
            const pg: Guess[] = guesses?.[p.id] ? Object.values(guesses[p.id]) : []
            const g1 = pg.some(g => g.round === 1)
            const g2 = pg.some(g => g.round === 2)
            return (
              <div className="player-row" key={p.id} style={{ borderColor: p.id === cueGiverId ? 'var(--accent)' : 'var(--border)' }}>
                <div className="player-dot" style={{ background: p.color }} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>{p.name}{p.id === playerId ? ' ★' : ''}</span>
                {p.id === cueGiverId
                  ? <span className="badge" style={{ fontSize: '0.6rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}>CUE</span>
                  : <span style={{ fontSize: '0.75rem', color: g1 || g2 ? 'var(--accent3)' : 'var(--text-muted)', fontWeight: 700 }}>
                      {g2 ? '✓✓' : g1 ? '✓' : '...'}
                    </span>
                }
              </div>
            )
          })}
        </div>

        {/* Scoring guide */}
        <div className="card" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 2 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Scoring</div>
          <div>🎯 Exact — <strong style={{ color: 'var(--accent3)' }}>3 pts</strong></div>
          <div>🟡 1 away — <strong style={{ color: 'var(--accent3)' }}>2 pts</strong></div>
          <div>🟠 2 away — <strong style={{ color: 'var(--accent3)' }}>1 pt</strong></div>
          <div>⬛ Outside — <strong>0 pts</strong></div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
            🎙️ Cue giver: <strong style={{ color: 'var(--accent3)' }}>1 pt</strong> per piece in frame (2 pts in 3-player), max <strong style={{ color: 'var(--accent3)' }}>9</strong>
          </div>
        </div>

      </div>
    </div>
  )
}
