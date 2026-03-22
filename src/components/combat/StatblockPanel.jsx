import { abilityMod, formatMod } from '../../utils/combatUtils'

const ABILITIES = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']

// ── Usage parsing ─────────────────────────────────────────────────────────────
function parseUsage(usageStr) {
  if (!usageStr) return null
  if (/recharge\s*\d/i.test(usageStr)) return { type: 'recharge', count: 1 }
  const m = usageStr.match(/(\d+)\s*\/\s*(day|short|long|rest)/i)
  if (m) return { type: 'uses', count: parseInt(m[1]) }
  return null
}

// ── Usage checkbox strip ──────────────────────────────────────────────────────
function UsageBoxes({ trackKey, count, usage, onUsageChange }) {
  if (!onUsageChange) return null
  const used = usage?.[trackKey] ?? 0
  return (
    <div className="inline-flex items-center gap-1 ml-2">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          title={i < used ? 'Click to unmark' : 'Mark as used'}
          onClick={(e) => {
            e.stopPropagation()
            // Click on a checked box → uncheck it and all after; click unchecked → check up to it
            onUsageChange(trackKey, i < used ? i : i + 1)
          }}
          className={[
            'w-3.5 h-3.5 rounded-sm border transition-colors',
            i < used
              ? 'bg-gold-500 border-gold-400'
              : 'border-slate-500 hover:border-gold-500 bg-transparent',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Rule() {
  return <hr className="border-gold-600/30 my-2.5" />
}

// ── Property line ─────────────────────────────────────────────────────────────
function PropLine({ label, value }) {
  if (!value) return null
  return (
    <p className="text-xs text-slate-300 leading-relaxed">
      <span className="font-semibold text-slate-200">{label} </span>
      {value}
    </p>
  )
}

// ── Single ability/action entry (always expanded) ─────────────────────────────
function AbilityEntry({ item, usage, onUsageChange }) {
  const usageInfo = parseUsage(item.Usage)
  return (
    <div className="mb-3">
      <div className="flex items-start gap-1 flex-wrap">
        <span className="text-xs font-bold text-slate-200 leading-relaxed">
          {item.Name}
        </span>
        {item.Usage && (
          <span className="text-xs text-slate-500 italic">({item.Usage})</span>
        )}
        {usageInfo && (
          <UsageBoxes
            trackKey={item.Name}
            count={usageInfo.count}
            usage={usage}
            onUsageChange={onUsageChange}
          />
        )}
      </div>
      {(item.Content || item.Description) && (
        <p className="text-xs text-slate-400 leading-relaxed mt-0.5 whitespace-pre-wrap">
          {item.Content ?? item.Description}
        </p>
      )}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, items, usage, onUsageChange, legendaryPerRound }) {
  if (!items?.length) return null
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 mb-2">
        <p className="label-section">{title}</p>
        {legendaryPerRound != null && (
          <UsageBoxes
            trackKey={`__${title}`}
            count={legendaryPerRound}
            usage={usage}
            onUsageChange={onUsageChange}
          />
        )}
      </div>
      {items.map((item, i) => (
        <AbilityEntry
          key={`${item.Name}-${i}`}
          item={item}
          usage={usage}
          onUsageChange={onUsageChange}
        />
      ))}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function StatblockPanel({ combatant, onClear, onUsageChange }) {
  return (
    <div className="w-80 shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0 min-h-[52px]">
        {combatant ? (
          <>
            <h3 className="font-display text-sm font-semibold text-slate-100 truncate pr-2">
              {combatant.name}
            </h3>
            <button
              onClick={onClear}
              className="text-slate-500 hover:text-slate-300 shrink-0 text-sm leading-none"
              title="Clear statblock view"
            >
              ✕
            </button>
          </>
        ) : (
          <h3 className="font-display text-xs uppercase tracking-widest text-slate-600">
            Statblock
          </h3>
        )}
      </div>

      {/* Body */}
      {!combatant ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-slate-600 text-sm leading-relaxed">
            Click on a combatant row to view statblock details.
          </p>
        </div>
      ) : !combatant.statblock ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-slate-600 text-sm">No statblock available.</p>
        </div>
      ) : (
        <StatblockBody
          sb={combatant.statblock}
          usage={combatant.usage ?? {}}
          onUsageChange={onUsageChange}
        />
      )}
    </div>
  )
}

function StatblockBody({ sb, usage, onUsageChange }) {
  const saves  = sb.Saves?.map((s) => `${s.Name} ${formatMod(s.Modifier)}`).join(', ')
  const skills = sb.Skills?.map((s) => `${s.Name} ${formatMod(s.Modifier)}`).join(', ')

  // Legendary actions per round: explicit field or default 3
  const legendaryPerRound =
    sb.LegendaryActions?.length
      ? (sb.LegendaryActionsCount ?? 3)
      : null

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 text-xs space-y-0">
      {/* Type & source */}
      <p className="text-slate-400 italic mb-0.5">{sb.Type}</p>
      {sb.Source && <p className="text-slate-600 text-[10px] mb-2">Source: {sb.Source}</p>}

      {/* Core stats row */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-1.5">
        {sb.AC?.Value != null && (
          <span>
            <span className="text-slate-500">AC </span>
            <span className="font-semibold text-slate-200">{sb.AC.Value}</span>
            {sb.AC.Notes ? <span className="text-slate-500"> ({sb.AC.Notes})</span> : null}
          </span>
        )}
        {sb.HP?.Value != null && (
          <span>
            <span className="text-slate-500">HP </span>
            <span className="font-semibold text-slate-200">{sb.HP.Value}</span>
            {sb.HP.Notes ? <span className="text-slate-500"> ({sb.HP.Notes})</span> : null}
          </span>
        )}
        {sb.ChallengeRating && (
          <span>
            <span className="text-slate-500">CR </span>
            <span className="font-semibold text-slate-200">{sb.ChallengeRating}</span>
          </span>
        )}
        {sb.Speed && (
          <span>
            <span className="text-slate-500">Speed </span>
            <span className="text-slate-300">{sb.Speed}</span>
          </span>
        )}
      </div>

      <Rule />

      {/* Ability scores */}
      {sb.Abilities && (
        <>
          <div className="grid grid-cols-6 gap-1 text-center mb-1">
            {ABILITIES.map((a) => (
              <div key={a}>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">{a}</div>
                <div className="text-slate-200 font-semibold font-mono text-xs mt-0.5">
                  {sb.Abilities[a]}
                </div>
                <div className="text-slate-500 text-[10px]">
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
        <PropLine label="Saving Throws"       value={saves} />
        <PropLine label="Skills"              value={skills} />
        <PropLine label="Damage Vulnerabilities" value={sb.DamageVulnerabilities} />
        <PropLine label="Damage Resistances"  value={sb.DamageResistances} />
        <PropLine label="Damage Immunities"   value={sb.DamageImmunities} />
        <PropLine label="Condition Immunities" value={sb.ConditionImmunities} />
        <PropLine label="Senses"              value={sb.Senses} />
        <PropLine label="Languages"           value={sb.Languages} />
      </div>

      {(saves || skills || sb.DamageVulnerabilities || sb.DamageResistances ||
        sb.DamageImmunities || sb.ConditionImmunities || sb.Senses || sb.Languages) && (
        <Rule />
      )}

      {/* Traits & actions */}
      <Section title="Traits"            items={sb.Traits}           usage={usage} onUsageChange={onUsageChange} />
      <Section title="Actions"           items={sb.Actions}          usage={usage} onUsageChange={onUsageChange} />
      <Section title="Bonus Actions"     items={sb.BonusActions}     usage={usage} onUsageChange={onUsageChange} />
      <Section title="Reactions"         items={sb.Reactions}        usage={usage} onUsageChange={onUsageChange} />
      <Section
        title="Legendary Actions"
        items={sb.LegendaryActions}
        usage={usage}
        onUsageChange={onUsageChange}
        legendaryPerRound={legendaryPerRound}
      />
      <Section title="Mythic Actions"    items={sb.MythicActions}    usage={usage} onUsageChange={onUsageChange} />
      <Section title="Lair Actions"      items={sb.LairActions}      usage={usage} onUsageChange={onUsageChange} />

      {sb.Description && (
        <>
          <Rule />
          <p className="text-slate-400 italic leading-relaxed">{sb.Description}</p>
        </>
      )}

      <div className="h-4" /> {/* bottom breathing room */}
    </div>
  )
}
