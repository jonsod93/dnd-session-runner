import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const tabs = [
  { label: 'Combat Tracker', to: '/' },
  { label: 'Map',            to: '/map' },
  { label: 'Generators',     to: '/generators' },
]

export default function Navigation() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [menuOpen])

  return (
    <nav className="h-12 bg-surface-1 border-b border-white/[0.05] flex items-stretch px-5 shrink-0 relative z-[1001] grain-overlay" style={{ background: 'linear-gradient(180deg, #141418 0%, #111114 100%)' }}>
      {/* App title */}
      <div className="flex items-center mr-7">
        <span className="font-display text-sm font-semibold tracking-[0.22em] text-gold-400 uppercase select-none">
          Mythranos
        </span>
      </div>

      {/* Desktop: divider + tabs */}
      <div className="max-lg:hidden w-px bg-white/[0.06] my-3 mr-6" />
      <div className="max-lg:hidden flex items-stretch gap-0.5">
        {tabs.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center px-3 text-sm border-b-2 transition-colors duration-150',
                isActive
                  ? 'border-[#FF7A45] tab-gradient-b text-[#e6e6e6]'
                  : 'border-transparent text-[#9a9894] hover:text-[#e6e6e6]',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div className="flex-1" />

      {/* Desktop: Sign Out */}
      <button
        onClick={logout}
        className="max-lg:hidden flex items-center text-sm text-[#9a9894] hover:text-[#e6e6e6] transition-colors"
      >
        Sign Out
      </button>

      {/* Mobile: hamburger */}
      <div ref={menuRef} className="lg:hidden flex items-center">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          aria-label="Menu"
        >
          <span className={`block w-5 h-px bg-[#9a9894] transition-all duration-200 origin-center ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
          <span className={`block w-5 h-px bg-[#9a9894] transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-px bg-[#9a9894] transition-all duration-200 origin-center ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute top-12 right-0 w-48 bg-surface-2 border border-white/[0.08] rounded-bl-xl shadow-glass z-50 overflow-hidden">
            {tabs.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  [
                    'block px-4 py-3 text-sm transition-colors border-l-2',
                    isActive
                      ? 'border-[#FF7A45] tab-gradient-l text-[#e6e6e6] bg-white/[0.05]'
                      : 'border-transparent text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.04]',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="border-t border-white/[0.06]" />
            <button
              onClick={() => { setMenuOpen(false); logout() }}
              className="block w-full text-left px-4 py-3 text-sm text-[#9a9894] hover:text-[#e6e6e6] hover:bg-white/[0.04] transition-colors border-l-2 border-transparent"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
