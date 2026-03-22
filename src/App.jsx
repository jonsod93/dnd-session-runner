import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import CombatTracker from './pages/CombatTracker.jsx'
import MapPage from './pages/MapPage.jsx'

export default function App() {
  return (
    <div className="flex flex-col h-full bg-slate-950">
      <Navigation />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<CombatTracker />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </main>
    </div>
  )
}
