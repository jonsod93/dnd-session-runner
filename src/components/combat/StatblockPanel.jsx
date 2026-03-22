import { useState } from 'react'
import { abilityMod, formatMod, getDamageTypeColor, d20 } from '../../utils/combatUtils'
import { parseRichText, evalDiceExpr } from '../../utils/diceUtils'
import { SPELL_REGEX } from '../../data/srdSpellNames'

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

function PropLine({ label, value, colorDamageTypes }) {
  if (!value) return null
  const text = Array.isArray(value) ? value.join(', ') : value
  return (
    <p className="text-xs text-[#e6e6e6] leading-relaxed">
      <span className="font-medium text-[#e6e6e6]">{label} </span>
      {colorDamageTypes ? <ColoredDamageText text={text} /> : <span className="text-[#787774]">{text}</span>}
    </p>
  )
}

// Colorizes damage type names anywhere in text (e.g. "one of the following: acid, cold, fire, lightning or poison")
const DAMAGE_TYPE_RE = new RegExp(
  '\\b(' + DAMAGE_TYPES.join('|') + ')\\b',
  'gi'
)

function ColoredDamageText({ text }) {
  if (!text) return null
  const parts = []
  let lastIdx = 0
  const re = new RegExp(DAMAGE_TYPE_RE.source, 'gi')
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(<span key={lastIdx}>{text.slice(lastIdx, m.index)}</span>)
    const color = getDamageTypeColor(m[1])
    parts.push(<span key={m.index} style={{ color }} className="font-medium">{m[0]}</span>)
    lastIdx = re.lastIndex
  }
  if (lastIdx < text.length) parts.push(<span key={lastIdx}>{text.slice(lastIdx)}</span>)
  return <span className="text-[#787774]">{parts.length > 0 ? parts : text}</span>
}

// ── Damage type detection from action text ────────────────────────────────────
const DAMAGE_TYPES = ['fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic', 'bludgeoning', 'piercing', 'slashing']

// Detect the damage type that follows a dice expression in the text
function detectDamageContext(fullText, segmentIndex, segments) {
  // Look at text segments after the current roll to find "X damage"
  for (let j = segmentIndex + 1; j < segments.length && j <= segmentIndex + 3; j++) {
    if (segments[j].type === 'text') {
      const afterText = segments[j].text.toLowerCase()
      for (const dt of DAMAGE_TYPES) {
        if (afterText.match(new RegExp(`^\\s*\\)?\\s*${dt}\\s+damage`))) return dt
      }
    }
  }
  return null
}

// Detect attack type from full action text (e.g., "Melee Weapon Attack", "Ranged Spell Attack")
function detectAttackType(fullText) {
  const m = fullText.match(/(melee|ranged)\s+(weapon|spell)\s+attack/i)
  if (m) return `${m[1]} ${m[2]} attack`
  // Check for breath weapon, etc.
  if (/breath/i.test(fullText)) return 'Breath weapon'
  return null
}

// Detect what damage type a "to hit" roll deals from context
function detectHitDamageType(fullText) {
  // Find the damage type mentioned after the hit notation
  const hitIdx = fullText.toLowerCase().indexOf('to hit')
  if (hitIdx < 0) return null
  const after = fullText.slice(hitIdx).toLowerCase()
  for (const dt of DAMAGE_TYPES) {
    if (after.includes(`${dt} damage`)) return dt
  }
  return null
}

// ── Highlight key terms in plain text ────────────────────────────────────────
// Matches: DC X [Ability] saving throw, AC X, ability score names,
// slash ranges like 30/120, and distance measurements
const KEY_TERM_RE = new RegExp(
  '(' +
    // DC X [Ability] saving throw (full phrase)
    'DC\\s+\\d+(?:\\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma))?(?:\\s+saving\\s+throw)?' +
    '|' +
    // AC followed by a number
    '\\bAC\\s+\\d+' +
    '|' +
    // Standalone ability score names (full words only)
    '\\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\\b' +
    '|' +
    // Slash ranges like 30/120 ft, 80/320 ft.
    '\\b\\d+\\/\\d+(?:\\s*(?:ft\\.?|feet|foot|miles?))?' +
    '|' +
    // Distance measurements with area shapes
    '(?:\\d+[\\s-](?:foot|feet|ft\\.?|mile|miles))\\b(?:\\s+(?:cone|sphere|cube|line|radius|emanation))?' +
  ')',
  'gi'
)

function HighlightedText({ text }) {
  const parts = []
  let lastIdx = 0
  const re = new RegExp(KEY_TERM_RE.source, 'gi')
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(<span key={lastIdx}>{text.slice(lastIdx, m.index)}</span>)
    parts.push(
      <span key={m.index} className="text-[#c8c8c8] font-semibold">{m[0]}</span>
    )
    lastIdx = re.lastIndex
  }
  if (lastIdx < text.length) parts.push(<span key={lastIdx}>{text.slice(lastIdx)}</span>)
  return parts.length > 1 ? <>{parts}</> : <span>{text}</span>
}

// Export for reuse in SpellDrawer
export { HighlightedText, RichContent, DAMAGE_TYPES }

// ── Rich text renderer: dice rolls + spell names ──────────────────────────────
function RichContent({ text, onRoll, onSpellClick, className, actionName }) {
  if (!text) return null
  const segments = parseRichText(text, SPELL_REGEX)

  // Pre-compute damage type for each roll segment
  const rollColors = segments.map((seg, i) => {
    if (seg.type !== 'roll') return null
    const damageType = seg.expr.startsWith('d20')
      ? null
      : detectDamageContext(text, i, segments)
    return damageType ? { damageType, color: getDamageTypeColor(damageType) } : null
  })

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'roll') {
          const rc = rollColors[i]
          const color = rc?.color
          const damageType = rc?.damageType
          const attackType = detectAttackType(text)

          return (
            <button
              key={i}
              className={color
                ? "font-mono underline decoration-dotted underline-offset-2 cursor-pointer transition-opacity hover:opacity-80"
                : "font-mono text-[#e6e6e6] hover:text-white underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
              }
              style={color ? { color } : undefined}
              onClick={(e) => {
                e.stopPropagation()
                const result = evalDiceExpr(seg.expr)
                if (result && onRoll) {
                  onRoll({
                    ...result,
                    context: attackType || actionName || null,
                    damageType: seg.expr.startsWith('d20') ? null : damageType,
                    damageTypeColor: seg.expr.startsWith('d20') ? null : color,
                  })
                }
              }}
              title={`Roll ${seg.expr}`}
            >
              {seg.text}
            </button>
          )
        }
        if (seg.type === 'spell') {
          return (
            <button
              key={i}
              className="text-[#e6e6e6] hover:text-white underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onSpellClick?.(seg.text)
              }}
              title={`View ${seg.text}`}
            >
              {seg.text}
            </button>
          )
        }
        // Color average damage numbers that precede a colored damage roll
        // Pattern: "Hit: 5 (1d6+2) cold damage" — the "5 " before "(1d6+2)" gets colored
        if (seg.type === 'text' && i + 1 < segments.length && rollColors[i + 1]?.color) {
          const nextColor = rollColors[i + 1].color
          // Check if text ends with a number (the average)
          const m = seg.text.match(/^(.*?)(\d+)(\s*)$/)
          if (m) {
            return (
              <span key={i}>
                <HighlightedText text={m[1]} />
                <span style={{ color: nextColor }} className="font-medium">{m[2]}</span>
                {m[3]}
              </span>
            )
          }
        }
        // Color "X damage" text that follows a colored damage roll
        // e.g., ") cold damage" after "(16d8)" should be colored
        if (seg.type === 'text' && i > 0 && rollColors[i - 1]?.color) {
          const prevColor = rollColors[i - 1].color
          const dmgMatch = seg.text.match(/^(\s*\)?\s*)(\w+\s+damage)\b(.*)$/i)
          if (dmgMatch) {
            return (
              <span key={i}>
                {dmgMatch[1]}
                <span style={{ color: prevColor }} className="font-medium">{dmgMatch[2]}</span>
                <HighlightedText text={dmgMatch[3]} />
              </span>
            )
          }
        }
        return <span key={i}><HighlightedText text={seg.text} /></span>
      })}
    </span>
  )
}

function AbilityEntry({ item, usage, onUsageChange, onRoll, onSpellClick }) {
  const usageInfo = parseUsage(item)
  const content   = item.Content ?? item.Description
  return (
    <div className="mb-3.5">
      <div className="flex items-start flex-wrap gap-x-1.5 gap-y-0.5">
        <span className="text-xs font-semibold text-[#e6e6e6] leading-relaxed">
          {item.Name}
        </span>
        {item.Usage && (
          <span className="text-xs text-[#787774] italic">({item.Usage})</span>
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
      {content && (
        <p className="text-xs text-[#787774] leading-relaxed mt-0.5 whitespace-pre-wrap">
          <RichContent text={content} onRoll={onRoll} onSpellClick={onSpellClick} actionName={item.Name} />
        </p>
      )}
    </div>
  )
}

function Section({ title, items, usage, onUsageChange, legendaryPerRound, onRoll, onSpellClick }) {
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
          onRoll={onRoll}
          onSpellClick={onSpellClick}
        />
      ))}
    </div>
  )
}

// ── Lair Action panel ─────────────────────────────────────────────────────────
function LairActionBody({ combatants, customLairActions, onAddCustomLairAction, onRemoveCustomLairAction }) {
  // Collect lair actions from all combatant statblocks
  const grouped = combatants
    .filter((c) => c.type !== 'lair' && c.statblock?.LairActions?.length)
    .map((c) => ({ name: c.name, actions: c.statblock.LairActions }))

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {/* Custom lair actions */}
      <div className="mb-4">
        <p className="label-section mb-2">Custom</p>
        {customLairActions.length === 0 && (
          <p className="text-[11px] text-[#787774] mb-2">No custom lair actions added.</p>
        )}
        {customLairActions.map((action, i) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <p className="text-xs text-[#e6e6e6] leading-relaxed flex-1">{action}</p>
            <button
              className="text-[#787774] hover:text-red-400 text-xs shrink-0 mt-0.5"
              onClick={() => onRemoveCustomLairAction(i)}
            >
              ✕
            </button>
          </div>
        ))}
        <AddCustomLairAction onAdd={onAddCustomLairAction} />
      </div>

      {/* Lair actions from statblocks */}
      {grouped.map(({ name, actions }) => (
        <div key={name} className="mb-4">
          <p className="label-section mb-2">{name}</p>
          {actions.map((action, i) => (
            <div key={i} className="mb-2.5">
              {action.Name && (
                <p className="text-xs font-semibold text-[#e6e6e6] leading-relaxed">{action.Name}</p>
              )}
              <p className="text-xs text-[#787774] leading-relaxed whitespace-pre-wrap">
                {action.Content ?? action.Description}
              </p>
            </div>
          ))}
        </div>
      ))}

      {grouped.length === 0 && customLairActions.length === 0 && (
        <p className="text-[#787774] text-sm text-center mt-4">
          No lair actions found in current combat.
        </p>
      )}
    </div>
  )
}

function AddCustomLairAction({ onAdd }) {
  const [text, setText] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const t = text.trim()
        if (t) { onAdd(t); setText('') }
      }}
      className="flex gap-2 mt-1"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add custom lair action…"
        className="flex-1 bg-transparent border-b border-white/[0.1] py-1 text-xs text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="text-xs text-[#787774] hover:text-[#e6e6e6] disabled:opacity-30 px-2 py-1 rounded transition-colors"
      >
        +
      </button>
    </form>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function StatblockPanel({ combatant, combatants, onClear, onUsageChange, onRoll, onSpellClick, customLairActions, onAddCustomLairAction, onRemoveCustomLairAction }) {
  const isLair = combatant?.type === 'lair'

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
      ) : isLair ? (
        <LairActionBody
          combatants={combatants ?? []}
          customLairActions={customLairActions ?? []}
          onAddCustomLairAction={onAddCustomLairAction}
          onRemoveCustomLairAction={onRemoveCustomLairAction}
        />
      ) : !combatant.statblock ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-[#787774] text-sm">No statblock available.</p>
        </div>
      ) : (
        <StatblockBody
          sb={combatant.statblock}
          usage={combatant.usage ?? {}}
          onUsageChange={onUsageChange}
          onRoll={onRoll ? (result) => onRoll({ ...result, combatantName: combatant.name }) : null}
          onSpellClick={onSpellClick}
        />
      )}
    </div>
  )
}

export function StatblockBody({ sb, usage, onUsageChange, onRoll, onSpellClick }) {
  const legendaryPerRound = sb.LegendaryActions?.length ? (sb.LegendaryActionsCount ?? 3) : null

  const sectionProps = { usage, onUsageChange, onRoll, onSpellClick }

  const handleAbilityRoll = (label, mod) => {
    if (!onRoll) return
    const roll = d20()
    const total = roll + mod
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`
    onRoll({
      label: `d20${modStr}`,
      detail: `[${roll}]${modStr} = ${total}`,
      total,
      rollType: 'attack',
      context: label,
    })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Sticky header: type, stats, ability scores ──────────────── */}
      <div className="shrink-0 px-4 py-3 bg-[#1e1e1e] border-b border-white/[0.06]">
        {/* Type & CR */}
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <p className="text-xs text-[#787774] italic">{sb.Type}</p>
          {sb.ChallengeRating && (
            <span className="text-xs text-[#787774] font-medium shrink-0">CR {sb.ChallengeRating}</span>
          )}
        </div>
        {sb.Source && (
          <p className="text-[11px] text-[#787774]/60 mb-3">Source: {sb.Source}</p>
        )}

        {/* Core stats */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-2">
          {sb.AC?.Value != null && (
            <span className="text-xs">
              <span className="text-[#787774]">AC </span>
              <span className="font-medium text-[#e6e6e6]">{sb.AC.Value}</span>
              {sb.AC.Notes ? <span className="text-[#787774]"> ({sb.AC.Notes})</span> : null}
            </span>
          )}
          {sb.HP?.Value != null && (
            <span className="text-xs">
              <span className="text-[#787774]">HP </span>
              <span className="font-medium text-[#e6e6e6]">{sb.HP.Value}</span>
              {sb.HP.Notes ? <span className="text-[#787774]"> ({sb.HP.Notes})</span> : null}
            </span>
          )}
          {sb.Speed && (
            <span className="text-xs">
              <span className="text-[#787774]">Speed </span>
              <span className="text-[#e6e6e6]">{sb.Speed}</span>
            </span>
          )}
        </div>

        {/* Ability scores */}
        {sb.Abilities && (
          <>
            <hr className="border-white/[0.06] my-3" />
            <div className="grid grid-cols-6 gap-1 text-center">
              {ABILITIES.map((a) => (
                <div key={a}>
                  <div className="label-section mb-0.5">{a}</div>
                  <div className="text-[#e6e6e6] font-medium font-mono text-xs">
                    {sb.Abilities[a]}
                  </div>
                  <div className="text-[#787774] text-[11px]">
                    ({formatMod(abilityMod(sb.Abilities[a]))})
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Scrollable content: properties, traits, actions, etc. ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">

      {/* Properties */}
      <div className="space-y-1 mb-2">
        {/* Rollable saving throws */}
        {sb.Saves?.length > 0 && (
          <p className="text-xs text-[#e6e6e6] leading-relaxed">
            <span className="font-medium text-[#e6e6e6]">Saving Throws </span>
            <span className="text-[#787774]">
              {sb.Saves.map((s, i) => (
                <span key={s.Name}>
                  {i > 0 && ', '}
                  <button
                    className="text-[#e6e6e6] hover:text-white underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
                    onClick={() => handleAbilityRoll(`${s.Name} Saving Throw`, s.Modifier)}
                    title={`Roll ${s.Name} Save ${formatMod(s.Modifier)}`}
                  >
                    {s.Name} {formatMod(s.Modifier)}
                  </button>
                </span>
              ))}
            </span>
          </p>
        )}
        {/* Rollable skills */}
        {sb.Skills?.length > 0 && (
          <p className="text-xs text-[#e6e6e6] leading-relaxed">
            <span className="font-medium text-[#e6e6e6]">Skills </span>
            <span className="text-[#787774]">
              {sb.Skills.map((s, i) => (
                <span key={s.Name}>
                  {i > 0 && ', '}
                  <button
                    className="text-[#e6e6e6] hover:text-white underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
                    onClick={() => handleAbilityRoll(`${s.Name}`, s.Modifier)}
                    title={`Roll ${s.Name} ${formatMod(s.Modifier)}`}
                  >
                    {s.Name} {formatMod(s.Modifier)}
                  </button>
                </span>
              ))}
            </span>
          </p>
        )}
        <PropLine label="Damage Vulnerabilities" value={sb.DamageVulnerabilities} colorDamageTypes />
        <PropLine label="Damage Resistances"     value={sb.DamageResistances}     colorDamageTypes />
        <PropLine label="Damage Immunities"      value={sb.DamageImmunities}      colorDamageTypes />
        <PropLine label="Condition Immunities"   value={sb.ConditionImmunities} />
        <PropLine label="Senses"                 value={sb.Senses} />
        <PropLine label="Languages"              value={sb.Languages} />
      </div>

      {(sb.Saves?.length || sb.Skills?.length || sb.DamageVulnerabilities || sb.DamageResistances ||
        sb.DamageImmunities || sb.ConditionImmunities || sb.Senses || sb.Languages) && <Rule />}

      <Section title="Traits"            items={sb.Traits}           {...sectionProps} />
      <Section title="Actions"           items={sb.Actions}          {...sectionProps} />
      <Section title="Bonus Actions"     items={sb.BonusActions}     {...sectionProps} />
      <Section title="Reactions"         items={sb.Reactions}        {...sectionProps} />
      <Section
        title="Legendary Actions"
        items={sb.LegendaryActions}
        legendaryPerRound={legendaryPerRound}
        {...sectionProps}
      />
      <Section title="Mythic Actions"    items={sb.MythicActions}    {...sectionProps} />
      <Section title="Lair Actions"      items={sb.LairActions}      {...sectionProps} />

      {sb.Description && (
        <>
          <Rule />
          <p className="text-xs text-[#787774] italic leading-relaxed">{sb.Description}</p>
        </>
      )}
      <div className="h-4" />
      </div>
    </div>
  )
}
