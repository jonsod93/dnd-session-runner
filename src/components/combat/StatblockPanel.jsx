import { abilityMod, formatMod } from '../../utils/combatUtils'

const ABILITIES = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']

// ── Usage parsing — checks both Usage field and item Name ─────────────────────
function parseUsage(item) {
  const text = [item.Usage ?? '', item.Name ?? ''].join(' ')
  if (/recharge\s*\d/i.test(text)) return { type: 'recharge', count: 1 }
  const m = text.match(/(\d+)\s*\/\s*(day|short|long|rest)/i)
  if (m) return { type: 'uses', count: parseInt(m[1]) }
  return null
}

// ── Usage checkbox strip ──────────────────────────────────────────────────────
function UsageBoxes({ trackKey, count, usage, onUsageChange }) {
  if (!onUsageChange) return null
  const used = usage?.[trackKey] ?? 0
  return (
    <div className="inline-flex items-center gap-1 ml-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          title={i < used ? 'Click to unmark' : 'Mark as used'}
          onClick={(e) => {
            e.stopPropagation()
            onUsageChange(trackKey, i < used ? i : i + 1)
          }}
          className={[
            'w-3 h-3 rounded-sm border transition-colors',
            i < used
              ? 'bg-gold-400 border-gold-400'
              : 'border-white/20 hover:border-gold-400/60 bg-transparent',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

function Rule() {
  return <hr className="border-white/[0.06] my-3" />
}

function PropLine({ label, value }) {
  if (!value) return null
  return (
    <p className="text-[11px] text-[#e6e6e6] leading-relaxed">
      <span className="font-medium text-[#e6e6e6]">{label} </span>
      <span className="text-[#787774]">{value}</span>
    </p>
  )
}

function AbilityEntry({ item, usage, onUsageChange }) {
  const usageInfo = parseUsage(item)
  return (
    <div className="mb-3">
      <div className="flex items-start flex-wrap gap-x-1.5 gap-y-0.5">
        <span className="text-[11px] font-semibold text-[#e6e6e6] leading-relaxed">
          {item.Name}
        </span>
        {item.Usage && (
          <span className="text-[11px] text-[#787774] italic">({item.Usage})</span>
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
        <p className="text-[11px] text-[#787774] leading-relaxed mt-0.5 whitespace-pre-wrap">
          {item.Content ?? item.Description}
        </p>
      )}
    </div>
  )
}

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
    <div className="w-80 shrink-0 bg-[#1e1e1e] border-l border-white/[0.06] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0 min-h-[48px]">
        {combatant ? (
          <>
            <h3 className="text-sm font-medium text-[#e6e6e6] truncate pr-2">
              {combatant.name}
            </h3>
            <button
              onClick={onClear}
              className="text-[#787774] hover:text-[#e6e6e6] shrink-0 text-sm leading-none transition-colors"
              title="Clear view"
            >
              ✕
            </button>
          </>
        ) : (
          <h3 className="label-section">Statblock</h3>
        )}
      </div>

      {/* Body */}
      {!combatant ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-[#787774] text-sm leading-relaxed">
            Click on a combatant row to view statblock details.
          </p>
        </div>
      ) : !combatant.statblock ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-[#787774] text-sm">No statblock available.</p>
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
  const legendaryPerRound = sb.LegendaryActions?.length ? (sb.LegendaryActionsCount ?? 3) : null

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {/* Type & source */}
      <p className="text-[11px] text-[#787774] italic mb-0.5">{sb.Type}</p>
      {sb.Source && (
        <p className="text-[10px] text-[#787774]/60 mb-3">Source: {sb.Source}</p>
      )}

      {/* Core stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-2">
        {sb.AC?.Value != null && (
          <span className="text-[11px]">
            <span className="text-[#787774]">AC </span>
            <span className="font-medium text-[#e6e6e6]">{sb.AC.Value}</span>
            {sb.AC.Notes ? <span className="text-[#787774]"> ({sb.AC.Notes})</span> : null}
          </span>
        )}
        {sb.HP?.Value != null && (
          <span className="text-[11px]">
            <span className="text-[#787774]">HP </span>
            <span className="font-medium text-[#e6e6e6]">{sb.HP.Value}</span>
            {sb.HP.Notes ? <span className="text-[#787774]"> ({sb.HP.Notes})</span> : null}
          </span>
        )}
        {sb.ChallengeRating && (
          <span className="text-[11px]">
            <span className="text-[#787774]">CR </span>
            <span className="font-medium text-[#e6e6e6]">{sb.ChallengeRating}</span>
          </span>
        )}
        {sb.Speed && (
          <span className="text-[11px]">
            <span className="text-[#787774]">Speed </span>
            <span className="text-[#e6e6e6]">{sb.Speed}</span>
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
                <div className="label-section mb-0.5">{a}</div>
                <div className="text-[#e6e6e6] font-medium font-mono text-[11px]">
                  {sb.Abilities[a]}
                </div>
                <div className="text-[#787774] text-[10px]">
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
        <PropLine label="Saving Throws"          value={saves} />
        <PropLine label="Skills"                 value={skills} />
        <PropLine label="Damage Vulnerabilities" value={sb.DamageVulnerabilities} />
        <PropLine label="Damage Resistances"     value={sb.DamageResistances} />
        <PropLine label="Damage Immunities"      value={sb.DamageImmunities} />
        <PropLine label="Condition Immunities"   value={sb.ConditionImmunities} />
        <PropLine label="Senses"                 value={sb.Senses} />
        <PropLine label="Languages"              value={sb.Languages} />
      </div>

      {(saves || skills || sb.DamageVulnerabilities || sb.DamageResistances ||
        sb.DamageImmunities || sb.ConditionImmunities || sb.Senses || sb.Languages) && <Rule />}

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
          <p className="text-[11px] text-[#787774] italic leading-relaxed">{sb.Description}</p>
        </>
      )}
      <div className="h-4" />
    </div>
  )
}
