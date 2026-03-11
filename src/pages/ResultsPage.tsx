import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listenToGame, restartGame, generatePlayerId } from '../gameLogic'
import type { GameState } from '../types'

export default function ResultsPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<GameState | null>(null)
  const playerId = generatePlayerId()

  useEffect(() => {
    if (!gameId) return
    const unsub = listenToGame(gameId, s => {
      setState(s)
      if (s?.phase === 'lobby') navigate(`/lobby/${gameId}`)
    })
    return unsub
  }, [gameId])

  if (!state) return <div className="page"><div className="pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div></div>

  const players = Object.values(state.players)
  const sorted = [...players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0))
  const isHost = state.hostId === playerId
  const winner = sorted[0]

  async function handlePlayAgain() {
    if (!gameId) return
    await restartGame(gameId, state!)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <span className="logo-text">HUES & CUES</span>
        <div className="badge" style={{ color: 'var(--accent2)', borderColor: 'var(--accent2)' }}>GAME OVER</div>
      </div>

      <div className="page fade-in" style={{ flex: 1 }}>
        <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Winner</div>
          <h1 style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>
            {winner?.name}
          </h1>
          <div style={{ fontSize: '1.1rem', color: 'var(--accent3)', fontWeight: 700, marginBottom: '2rem' }}>
            {state.scores[winner?.id] ?? 0} points
          </div>

          <div className="podium">
            {sorted.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                className="podium-card"
                style={{
                  order: i === 0 ? 1 : i === 1 ? 0 : 2,
                  minHeight: i === 0 ? 160 : i === 1 ? 120 : 90,
                  borderColor: i === 0 ? 'var(--accent)' : 'var(--border-bright)',
                  justifyContent: 'flex-end',
                }}
              >
                <div className="podium-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div style={{ width: 20, height: 20, background: p.color, border: '2px solid rgba(255,255,255,0.2)', margin: '0.5rem auto 0.25rem' }} />
                <div className="podium-name">{p.name}</div>
                <div className="podium-pts">{state.scores[p.id] ?? 0} pts</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ textAlign: 'left', marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Full Rankings</h3>
            <div className="score-list">
              {sorted.map((p, i) => (
                <div className="score-row" key={p.id}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, minWidth: 24, color: 'var(--text-muted)' }}>#{i + 1}</span>
                  <div className="score-dot" style={{ background: p.color }} />
                  <span className="score-name">{p.name}{p.id === playerId ? ' (you)' : ''}</span>
                  <span className="score-pts">{state.scores[p.id] ?? 0}</span>
                </div>
              ))}
            </div>

            {isHost && (
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={handlePlayAgain}>
                <span>Play Again (Back to Lobby)</span>
              </button>
            )}
            {!isHost && (
              <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                Waiting for host to start a new game...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
