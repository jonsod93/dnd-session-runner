import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'Combat Tracker', to: '/' },
  { label: 'Map',            to: '/map' },
]

export default function Navigation() {
  return (
    <nav className="h-12 bg-[#1a1a1a] border-b border-white/[0.06] flex items-stretch px-5 shrink-0">
      {/* App title */}
      <div className="flex items-center mr-7">
        <span className="font-display text-sm font-semibold tracking-[0.22em] text-gold-400 uppercase select-none">
          Mythranos
        </span>
      </div>

      <div className="w-px bg-white/[0.06] my-3 mr-6" />

      {/* Tabs */}
      <div className="flex items-stretch gap-0.5">
        {tabs.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center px-3 text-sm border-b-2 transition-colors duration-150',
                isActive
                  ? 'border-gold-400 text-[#e6e6e6]'
                  : 'border-transparent text-[#787774] hover:text-[#e6e6e6]',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
