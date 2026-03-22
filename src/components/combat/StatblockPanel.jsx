import { abilityMod, formatMod } from '../../utils/combatUtils'

const ABILITIES = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']

function Rule() {
  return <hr className="border-gold-600/40 my-3" />
}

function PropLine({ label, value }) {
  if (!value) return null
  return (
    <p className="text-xs text-slate-300 leading-relaxed">
      <span className="font-semibold text-slate-200">{label} </span>
      {value}
    </p>
  )
}

function Section({ title, items, onItemClick }) {
  if (!items?.length) return null
  return (
    <div className="mb-3">
      <p className="label-section mb-1.5">{title}</p>
      {items.map((item, i) => (
        <div key={i} className="mb-2">
          <button
            className="text-left w-full group"
            onClick={() => onItemClick(item.Name, item.Content ?? item.Description ?? '')}
          >
            <span className="text-xs font-semibold text-slate-200 group-hover:text-gold-400 transition-colors">
              {item.Name}
              {item.Usage ? ` (${item.Usage})` : ''}
            </span>
          </button>
          <p className="text-xs text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
            {item.Content ?? item.Description ?? ''}
          </p>
        </div>
      ))}
    </div>
  )
}

export function StatblockPanel({ combatant, onClose, onAbilityClick }) {
  const sb = combatant?.statblock

  if (!sb) {
    return (
      <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col">
        <PanelHeader name={combatant?.name} onClose={onClose} />
        <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
          No statblock
        </div>
      </div>
    )
  }

  const saves = sb.Saves?.map((s) => `${s.Name} ${formatMod(s.Modifier)}`).join(', ')
  const skills = sb.Skills?.map((s) => `${s.Name} ${formatMod(s.Modifier)}`).join(', ')

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0">
      <PanelHeader name={combatant.name} onClose={onClose} />

      <div className="flex-1 overflow-y-auto px-4 py-3 text-xs">
        {/* Type & source */}
        <p className="text-slate-400 italic mb-0.5">{sb.Type}</p>
        {sb.Source && (
          <p className="text-slate-600 text-[10px] mb-3">Source: {sb.Source}</p>
        )}

        {/* Core stats */}
        <div className="flex gap-4 mb-1">
          {sb.AC?.Value != null && (
            <div>
              <span className="text-slate-400">AC </span>
              <span className="text-slate-200 font-mono font-semibold">{sb.AC.Value}</span>
              {sb.AC.Notes && <span className="text-slate-500"> ({sb.AC.Notes})</span>}
            </div>
          )}
          {sb.HP?.Value != null && (
            <div>
              <span className="text-slate-400">HP </span>
              <span className="text-slate-200 font-mono font-semibold">{sb.HP.Value}</span>
              {sb.HP.Notes && <span className="text-slate-500"> ({sb.HP.Notes})</span>}
            </div>
          )}
          {sb.ChallengeRating && (
            <div>
              <span className="text-slate-400">CR </span>
              <span className="text-slate-200 font-mono font-semibold">{sb.ChallengeRating}</span>
            </div>
          )}
        </div>
        {sb.Speed && <p className="text-slate-400 mb-1">Speed {sb.Speed}</p>}

        <Rule />

        {/* Ability scores */}
        {sb.Abilities && (
          <>
            <div className="grid grid-cols-6 gap-1 text-center mb-1">
              {ABILITIES.map((a) => (
                <div key={a}>
                  <div className="text-[10px] text-slate-500 uppercase">{a}</div>
                  <div className="text-slate-200 font-mono font-semibold text-xs">
                    {sb.Abilities[a]}
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    ({formatMod(abilityMod(sb.Abilities[a]))})
                  </div>
                </div>
              ))}
            </div>
            <Rule />
          </>
        )}

        {/* Properties */}
        <div className="space-y-1 mb-2">
          <PropLine label="Saving Throws" value={saves} />
          <PropLine label="Skills" value={skills} />
          <PropLine label="Damage Vulnerabilities" value={sb.DamageVulnerabilities} />
          <PropLine label="Damage Resistances" value={sb.DamageResistances} />
          <PropLine label="Damage Immunities" value={sb.DamageImmunities} />
          <PropLine label="Condition Immunities" value={sb.ConditionImmunities} />
          <PropLine label="Senses" value={sb.Senses} />
          <PropLine label="Languages" value={sb.Languages} />
        </div>

        <Rule />

        {/* Abilities & actions */}
        <Section title="Traits" items={sb.Traits} onItemClick={onAbilityClick} />
        <Section title="Actions" items={sb.Actions} onItemClick={onAbilityClick} />
        <Section title="Bonus Actions" items={sb.BonusActions} onItemClick={onAbilityClick} />
        <Section title="Reactions" items={sb.Reactions} onItemClick={onAbilityClick} />
        <Section title="Legendary Actions" items={sb.LegendaryActions} onItemClick={onAbilityClick} />
        <Section title="Mythic Actions" items={sb.MythicActions} onItemClick={onAbilityClick} />

        {sb.Description && (
          <>
            <Rule />
            <p className="text-slate-400 italic leading-relaxed">{sb.Description}</p>
          </>
        )}
      </div>
    </div>
  )
}

function PanelHeader({ name, onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
      <h3 className="font-display text-sm font-semibold text-slate-100 truncate pr-2">{name}</h3>
      <button
        onClick={onClose}
        className="text-slate-500 hover:text-slate-300 shrink-0 leading-none text-base"
      >
        ✕
      </button>
    </div>
  )
}
