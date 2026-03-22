const UPCOMING_FEATURES = [
  {
    icon: '⚔️',
    title: 'Initiative Order',
    description: 'Track turn order across all combatants. Roll initiative, reorder as needed, and advance rounds with a single tap.',
  },
  {
    icon: '❤️',
    title: 'HP Tracking',
    description: 'Live hit point management for PCs and monsters alike. Apply damage, healing, and temp HP with quick controls.',
  },
  {
    icon: '🔮',
    title: 'Conditions',
    description: 'Tag combatants with status conditions — Poisoned, Stunned, Invisible and more — with automatic reminders.',
  },
  {
    icon: '🎲',
    title: 'Creature Stats',
    description: 'Quick-access stat blocks sourced from your Improved Initiative export — AC, saves, and abilities at a glance.',
  },
]

export default function CombatTracker() {
  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="label-section mb-2">Session Tools</p>
          <h1 className="font-display text-3xl font-semibold text-slate-100 tracking-wide">
            Combat Tracker
          </h1>
          <p className="mt-2 text-slate-400 font-body text-lg leading-relaxed">
            Keep the fight moving. Full combat management for your sessions is on the way.
          </p>
          <div className="rule-gold mt-5" />
        </div>

        {/* Feature preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {UPCOMING_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-900 border border-slate-700/60 rounded-md p-5 flex gap-4"
            >
              <span className="text-2xl shrink-0 mt-0.5">{feature.icon}</span>
              <div>
                <h3 className="font-display text-sm font-semibold tracking-wide text-gold-400 uppercase mb-1">
                  {feature.title}
                </h3>
                <p className="text-slate-400 font-body text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Status badge */}
        <div className="mt-8 flex items-center gap-3 text-slate-500 text-sm font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500/50 ring-2 ring-amber-500/20" />
          In development — placeholder page
        </div>

      </div>
    </div>
  )
}
