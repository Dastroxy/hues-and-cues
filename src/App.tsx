import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'
import ResultsPage from './pages/ResultsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lobby/:gameId" element={<LobbyPage />} />
      <Route path="/game/:gameId" element={<GamePage />} />
      <Route path="/game/:gameId/results" element={<ResultsPage />} />
    </Routes>
  )
}
