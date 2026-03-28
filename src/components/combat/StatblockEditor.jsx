import { useState, useEffect } from 'react'

const TEMPLATE = {
  Name: 'New Creature',
  Type: 'Medium humanoid, neutral',
  Source: 'Homebrew',
  ChallengeRating: '1',
  AC: { Value: 13, Notes: 'leather armor' },
  HP: { Value: 22, Notes: '4d8 + 4' },
  Speed: '30 ft.',
  InitiativeModifier: 1,
  Abilities: { Str: 12, Dex: 14, Con: 12, Int: 10, Wis: 11, Cha: 10 },
  Saves: [],
  Skills: [],
  DamageVulnerabilities: [],
  DamageResistances: [],
  DamageImmunities: [],
  ConditionImmunities: [],
  Senses: 'passive Perception 10',
  Languages: 'Common',
  Traits: [],
  Actions: [
    {
      Name: 'Attack',
      Content: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.',
    },
  ],
  BonusActions: [],
  Reactions: [],
  LegendaryActions: [],
}

export function StatblockEditor({ initial, onSave, onCancel, title }) {
  const [json, setJson] = useState(() =>
    JSON.stringify(initial ?? TEMPLATE, null, 2)
  )
  const [error, setError] = useState(null)

  useEffect(() => {
    setJson(JSON.stringify(initial ?? TEMPLATE, null, 2))
    setError(null)
  }, [initial])

  const handleSave = () => {
    try {
      const parsed = JSON.parse(json)
      if (!parsed.Name?.trim()) {
        setError('Statblock must have a Name field.')
        return
      }
      setError(null)
      onSave(parsed)
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-0">
      {/* Header */}
      <div className="shrink-0 px-5 py-2.5 border-b border-white/[0.05] flex items-center gap-3 min-h-[48px]">
        <h2 className="text-sm font-medium text-[#e6e6e6]">{title ?? 'Edit Statblock'}</h2>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className="btn-neon-gold text-xs px-3 py-1.5"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="btn-action"
        >
          Cancel
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 px-5 py-2 bg-red-400/10 border-b border-red-400/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 p-4 overflow-hidden">
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          className="w-full h-full bg-surface-2 border border-white/[0.06] rounded-2xl p-4 font-mono text-xs text-[#e6e6e6] focus:outline-none focus:border-gold-400/40 focus:shadow-neon-gold resize-none leading-relaxed transition-all"
          placeholder="Paste statblock JSON here..."
        />
      </div>
    </div>
  )
}
