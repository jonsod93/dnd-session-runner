import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'Combat Tracker', to: '/' },
  { label: 'Map', to: '/map' },
]

export default function Navigation() {
  return (
    <nav className="h-14 bg-slate-900 border-b border-slate-700 flex items-stretch px-4 shrink-0">
      {/* App title */}
      <div className="flex items-center mr-8">
        <span className="font-display text-lg font-semibold tracking-widest text-gold-400 uppercase select-none">
          Mythranos
        </span>
      </div>

      {/* Decorative vertical separator */}
      <div className="w-px bg-slate-700 my-3 mr-6" />

      {/* Tabs */}
      <div className="flex items-stretch gap-1">
        {tabs.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center px-4 text-sm font-body font-medium tracking-wide border-b-2 transition-colors duration-150',
                isActive
                  ? 'border-gold-400 text-gold-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500',
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
