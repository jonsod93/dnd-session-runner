import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import CombatTracker from './pages/CombatTracker.jsx'
import MapPage from './pages/MapPage.jsx'
import GeneratorsPage from './pages/GeneratorsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SpotifyCallback from './pages/SpotifyCallback.jsx'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'

function AuthGate({ children }) {
  const { authed } = useAuth()
  if (!authed) return <LoginPage />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <div className="flex flex-col h-full bg-surface-0">
          <Navigation />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<CombatTracker />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/spotify-callback" element={<SpotifyCallback />} />
              <Route path="/generators" element={<GeneratorsPage />} />
            </Routes>
          </main>
        </div>
      </AuthGate>
    </AuthProvider>
  )
}
