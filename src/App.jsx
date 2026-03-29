import { useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import CombatTracker from './pages/CombatTracker.jsx'
import MapPage from './pages/MapPage.jsx'
import GeneratorsPage from './pages/GeneratorsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SpotifyCallback from './pages/SpotifyCallback.jsx'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { useGsapHover } from './hooks/useGsapHover.js'

function AuthGate({ children }) {
  const { authed } = useAuth()
  if (!authed) return <LoginPage />
  return children
}

export default function App() {
  const appRef = useRef(null)
  useGsapHover(appRef)

  return (
    <AuthProvider>
      <AuthGate>
        <div ref={appRef} className="flex flex-col h-full bg-surface-0">
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
