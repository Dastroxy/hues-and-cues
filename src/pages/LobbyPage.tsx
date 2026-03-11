import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listenToGame, startGame, generatePlayerId } from '../gameLogic'
import type { GameState } from '../types'

export default function LobbyPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<GameState | null>(null)
  const playerId = generatePlayerId()

  useEffect(() => {
    if (!gameId) return
    const unsub = listenToGame(gameId, (s) => {
      setState(s)
      if (s?.phase === 'cue1') navigate(`/game/${gameId}`)
    })
    return unsub
  }, [gameId])

  const isHost = state?.hostId === playerId
  const players = state ? Object.values(state.players) : []
  const canStart = players.length >= 2

  async function handleStart() {
    if (!gameId || !state) return
    await startGame(gameId, state)
  }

  if (!state) return <div className="page"><div className="pulse" style={{ color: 'var(--text-muted)' }}>Connecting...</div></div>

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <span className="logo-text">HUES & CUES</span>
        <div className="badge" style={{ color: 'var(--accent3)', borderColor: 'var(--accent3)' }}>LOBBY</div>
      </div>

      <div className="page" style={{ flex: 1, justifyContent: 'flex-start', paddingTop: '3rem' }}>
        <div style={{ width: '100%', maxWidth: 500 }}>
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Game Code</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '0.3em', color: 'var(--accent)' }}>{gameId}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Share this code with other players</div>
          </div>

          <div className="card fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Players ({players.length})</h3>
            <div className="player-list">
              {players.map(p => (
                <div className="player-row" key={p.id}>
                  <div className="player-dot" style={{ background: p.color }} />
                  <span style={{ fontWeight: 600, flex: 1 }}>{p.name}</span>
                  {p.id === state.hostId && (
                    <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', fontSize: '0.65rem' }}>HOST</span>
                  )}
                  {p.id === playerId && (
                    <span className="badge" style={{ color: 'var(--accent3)', borderColor: 'var(--accent3)', fontSize: '0.65rem' }}>YOU</span>
                  )}
                </div>
              ))}
            </div>

            {isHost && (
              <div style={{ marginTop: '1.5rem' }}>
                {!canStart && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Need at least 2 players to start.</div>}
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={!canStart} onClick={handleStart}>
                  <span>Start Game</span>
                </button>
              </div>
            )}

            {!isHost && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
