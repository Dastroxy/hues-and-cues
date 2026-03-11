import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGame, joinGame, generatePlayerId } from '../gameLogic'
import { PLAYER_COLORS } from '../colors'

export default function HomePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [color, setColor] = useState(PLAYER_COLORS[0])
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const playerId = generatePlayerId()

  async function handleCreate() {
    if (!name.trim()) return setError('Enter your name')
    setLoading(true)
    try {
      const gameId = await createGame({ id: playerId, name: name.trim(), color, isHost: true })
      navigate(`/lobby/${gameId}`)
    } catch (e) { setError('Failed to create game') }
    setLoading(false)
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter your name')
    if (!joinCode.trim()) return setError('Enter a game code')
    setLoading(true)
    try {
      await joinGame(joinCode.trim().toUpperCase(), { id: playerId, name: name.trim(), color, isHost: false })
      navigate(`/lobby/${joinCode.trim().toUpperCase()}`)
    } catch (e) { setError('Failed to join game') }
    setLoading(false)
  }

  return (
    <div className="page fade-in">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          THE COLORFUL PARTY GAME
        </div>
        <h1 style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2), var(--accent3))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HUES & CUES
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontSize: '1rem' }}>
          Point to the perfect hue. Give the perfect cue.
        </p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        {mode === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={() => setMode('create')}>
              <span>Create Game</span>
            </button>
            <button className="btn" onClick={() => setMode('join')}>
              <span>Join Game</span>
            </button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Your Name</div>
              <input className="input" placeholder="Enter name..." value={name} onChange={e => setName(e.target.value)} maxLength={20} />
            </div>

            {mode === 'join' && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Game Code</div>
                <input className="input" placeholder="Enter 6-letter code..." value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} style={{ letterSpacing: '0.2em', fontWeight: 800 }} />
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>Pick Your Color</div>
              <div className="color-picker">
                {PLAYER_COLORS.map(c => (
                  <div key={c} className={`color-swatch ${c === color ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
                ))}
              </div>
            </div>

            {error && <div style={{ color: 'var(--accent2)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setMode('home'); setError('') }}>
                <span>Back</span>
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={loading} onClick={mode === 'create' ? handleCreate : handleJoin}>
                <span>{loading ? 'Loading...' : mode === 'create' ? 'Create Game' : 'Join Game'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
