import { useState, useRef, useCallback, useEffect } from 'react'
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

// Parse X/day groups from spellcasting content text
// e.g. "3/day each: clairvoyance, geas ... 1/day: wish" → [{count:3, label:'3/day each'}, {count:1, label:'1/day'}]
function parseSpellcastingUsage(content) {
  if (!content) return []
  const groups = []
  const re = /(\d+)\s*\/\s*day(?: each)?\s*:/gi
  let m
  while ((m = re.exec(content)) !== null) {
    const count = parseInt(m[1])
    const label = m[0].replace(/:$/, '').trim()
    const suffix = `${count}/day`
    // Deduplicate if same count appears twice (unlikely but safe)
    const key = groups.some((g) => g.suffix === suffix) ? `${suffix}#${groups.length}` : suffix
    groups.push({ count, label, suffix: key })
  }
  return groups
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
    <p className="text-sm text-[#e6e6e6] leading-relaxed">
      <span className="font-medium text-[#e6e6e6]">{label} </span>
      {colorDamageTypes ? <ColoredDamageText text={text} /> : <span className="text-[#b8b5b0]">{text}</span>}
    </p>
  )
}

// ── Damage type detection from action text ────────────────────────────────────
const DAMAGE_TYPES = ['fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic', 'bludgeoning', 'piercing', 'slashing']

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
  return <span className="text-[#b8b5b0]">{parts.length > 0 ? parts : text}</span>
}

// Detect the damage type that follows a dice expression in the text
function detectDamageContext(fullText, segmentIndex, segments) {
  // Look at text segments after the current roll to find "X damage"
  // Tolerates markdown markers (__,*) between the roll and damage type
  for (let j = segmentIndex + 1; j < segments.length && j <= segmentIndex + 3; j++) {
    if (segments[j].type === 'text') {
      const afterText = segments[j].text.toLowerCase()
      for (const dt of DAMAGE_TYPES) {
        if (afterText.match(new RegExp(`^[\\s_*)*]*${dt}\\s+damage`))) return dt
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
// ability (skill) checks, slash ranges like 30/120, and distance measurements
const ABILITY_NAMES = 'Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma'
const SKILL_NAMES = 'Athletics|Acrobatics|Sleight of Hand|Stealth|Arcana|History|Investigation|Nature|Religion|Animal Handling|Insight|Medicine|Perception|Survival|Deception|Intimidation|Performance|Persuasion'
const KEY_TERM_RE = new RegExp(
  '(' +
    // DC X [Ability] saving throw (full phrase — ability name only captured with "saving throw")
    'DC\\s+\\d+(?:\\s+(?:' + ABILITY_NAMES + ')\\s+saving\\s+throw)?' +
    '|' +
    // "DC equals X" or "DC equals 10 + ..." patterns
    'DC\\s+equals\\s+[\\d+\\s+\\w\'\u2019]+' +
    '|' +
    // "spell save DC [N]"
    '\\bspell\\s+save\\s+DC(?:\\s+\\d+)?' +
    '|' +
    // AC followed by a number
    '\\bAC\\s+\\d+' +
    '|' +
    // Level references: "3rd level or lower", "4th level or higher", "Nth-level"
    '\\b\\d+(?:st|nd|rd|th)[- ]level(?:\\s+(?:or\\s+(?:lower|higher|above|below)))?\\b' +
    '|' +
    // Ability (Skill) check — e.g. "Wisdom (Perception) check"
    '\\b(?:' + ABILITY_NAMES + ')\\s*\\(\\s*(?:' + SKILL_NAMES + ')\\s*\\)(?:\\s+checks?)?' +
    '|' +
    // "ability check(s)", "ability score(s)", "spellcasting ability", "saving throw(s)"
    '\\b(?:ability\\s+checks?|ability\\s+scores?|spellcasting\\s+ability|saving\\s+throws?)\\b' +
    '|' +
    // Standalone ability score names (full words only)
    '\\b(?:' + ABILITY_NAMES + ')\\b' +
    '|' +
    // Slash ranges like 30/120 ft, 80/320 ft.
    '\\b\\d+\\/\\d+(?:\\s*(?:ft\\.?|feet|foot|miles?))?' +
    '|' +
    // Distance measurements with area shapes (supports comma-separated numbers like 1,000)
    '(?:\\d[\\d,]*[\\s-](?:foot|feet|ft\\.?|mile|miles))\\b(?:\\s+(?:cone|sphere|cube|line|radius|emanation))?' +
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
      <span key={m.index} className="text-[#e6e6e6] font-semibold">{m[0]}</span>
    )
    lastIdx = re.lastIndex
  }
  if (lastIdx < text.length) parts.push(<span key={lastIdx}>{text.slice(lastIdx)}</span>)
  return parts.length > 1 ? <>{parts}</> : <span>{text}</span>
}

// Export for reuse in SpellDrawer
export { HighlightedText, RichContent, DAMAGE_TYPES }

// ── Rich text renderer: dice rolls + spell names ──────────────────────────────
function RichContent({ text, onRoll, onSpellClick, className, actionName, enableSpellLinks = true }) {
  if (!text) return null
  const segments = parseRichText(text, enableSpellLinks ? SPELL_REGEX : null)

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
                ? "font-mono font-semibold underline decoration-dotted underline-offset-2 cursor-pointer transition-opacity hover:opacity-80"
                : "font-mono font-semibold text-[#e6e6e6] hover:text-white underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
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
        // Color average damage numbers that precede a dice roll
        // Uses the damage type color if detected, otherwise defaults to white (#e6e6e6)
        // Pattern: "Hit: 5 (1d6+2) cold damage" or "takes an extra 10 (3d6) damage"
        // Tolerates trailing markdown markers (__,*) between the number and dice roll
        if (seg.type === 'text' && i + 1 < segments.length && segments[i + 1].type === 'roll') {
          const nextColor = rollColors[i + 1]?.color ?? '#e6e6e6'
          const m = seg.text.match(/^(.*?)(\d+)(\s*[_*]*)$/)
          if (m) {
            return (
              <span key={i}>
                <HighlightedText text={m[1]} />
                <span style={{ color: nextColor }} className="font-semibold">{m[2]}</span>
                {m[3]}
              </span>
            )
          }
        }
        // Color "X damage" text that follows a colored damage roll
        // e.g., ") cold damage" after "(16d8)" should be colored
        // Tolerates leading markdown markers (__,*) between the dice roll and damage type
        if (seg.type === 'text' && i > 0 && rollColors[i - 1]?.color) {
          const prevColor = rollColors[i - 1].color
          const dmgMatch = seg.text.match(/^([\s_*)]*)([a-zA-Z]+\s+damage)\b(.*)$/i)
          if (dmgMatch) {
            const dmgType = dmgMatch[2].split(/\s+/)[0].toLowerCase()
            if (DAMAGE_TYPES.includes(dmgType)) {
              return (
                <span key={i}>
                  {dmgMatch[1]}
                  <span style={{ color: prevColor }} className="font-medium">{dmgMatch[2]}</span>
                  <HighlightedText text={dmgMatch[3]} />
                </span>
              )
            }
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
  // Enable spell name linking when the trait is about spellcasting
  // Matches: "Spellcasting", "Innate Spellcasting", "Utility Spells", "Combat Spells", etc.
  const nameOrContent = `${item.Name ?? ''} ${content ?? ''}`
  const isSpellcastingSection = /spellcasting/i.test(item.Name ?? '')
    || (/\bspells?\b/i.test(item.Name ?? '') && /can cast|spellcasting ability|spell save/i.test(nameOrContent))
  return (
    <div className="mb-3.5">
      <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
        <span className="text-sm font-semibold text-[#e6e6e6] leading-relaxed">
          {item.Name}
        </span>
        {item.Usage && (
          <span className="text-sm text-[#9a9894] italic">({item.Usage})</span>
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
        <p className="text-sm text-[#b8b5b0] leading-relaxed mt-0.5 whitespace-pre-wrap">
          <RichContent text={content} onRoll={onRoll} onSpellClick={onSpellClick} actionName={item.Name} enableSpellLinks={isSpellcastingSection} />
        </p>
      )}
      {/* X/day usage checkboxes for spellcasting traits */}
      {isSpellcastingSection && (() => {
        const groups = parseSpellcastingUsage(content)
        if (!groups.length) return null
        return (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            {groups.map((g) => (
              <div key={g.suffix} className="flex items-center gap-1">
                <span className="text-xs text-[#9a9894]">{g.label}</span>
                <UsageBoxes
                  trackKey={`${item.Name}::${g.suffix}`}
                  count={g.count}
                  usage={usage}
                  onUsageChange={onUsageChange}
                />
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

function Section({ title, items, usage, onUsageChange, legendaryPerRound, onRoll, onSpellClick }) {
  if (!items?.length) return null
  return (
    <div className="mb-1">
      <hr className="border-white/[0.06] my-3" />
      <div className="sticky top-0 -mx-4 px-4 py-1 bg-[#1e1e1e] z-10 flex items-center gap-2 mb-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] leading-none text-gold-400">{title}</p>
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
          <p className="text-xs text-[#9a9894] mb-2">No custom lair actions added.</p>
        )}
        {customLairActions.map((action, i) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <p className="text-sm text-[#e6e6e6] leading-relaxed flex-1">{action}</p>
            <button
              className="text-[#9a9894] hover:text-red-400 text-sm shrink-0 mt-0.5"
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
                <p className="text-sm font-semibold text-[#e6e6e6] leading-relaxed">{action.Name}</p>
              )}
              <p className="text-sm text-[#b8b5b0] leading-relaxed whitespace-pre-wrap">
                {action.Content ?? action.Description}
              </p>
            </div>
          ))}
        </div>
      ))}

      {grouped.length === 0 && customLairActions.length === 0 && (
        <p className="text-[#b8b5b0] text-sm text-center mt-4">
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
        className="flex-1 bg-transparent border-b border-white/[0.1] py-1 text-sm text-[#e6e6e6] focus:outline-none focus:border-gold-400 placeholder:text-[#787774] transition-colors"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="text-sm text-[#9a9894] hover:text-[#e6e6e6] disabled:opacity-30 px-2 py-1 rounded transition-colors"
      >
        +
      </button>
    </form>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
const MIN_WIDTH = 280
const MAX_WIDTH = 700
const DEFAULT_WIDTH = 320

export function StatblockPanel({ combatant, combatants, onClear, onUsageChange, onRoll, onSpellClick, customLairActions, onAddCustomLairAction, onRemoveCustomLairAction, mobileOverlay = false }) {
  const isLair = combatant?.type === 'lair'
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('statblock-panel-width')
    return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(saved))) : DEFAULT_WIDTH
  })
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return
      // Dragging the left edge: moving mouse left = wider panel
      const delta = startX.current - e.clientX
      const newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW.current + delta))
      setWidth(newW)
    }
    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setWidth((w) => { localStorage.setItem('statblock-panel-width', String(w)); return w })
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (mobileOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0 min-h-[48px]">
          <h3 className="text-sm font-medium text-[#e6e6e6] truncate pr-2">
            {combatant?.name}
          </h3>
          <button
            onClick={onClear}
            className="text-[#9a9894] hover:text-[#e6e6e6] shrink-0 text-sm leading-none transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        {isLair ? (
          <LairActionBody
            combatants={combatants ?? []}
            customLairActions={customLairActions ?? []}
            onAddCustomLairAction={onAddCustomLairAction}
            onRemoveCustomLairAction={onRemoveCustomLairAction}
          />
        ) : !combatant?.statblock ? (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <p className="text-[#b8b5b0] text-sm">No statblock available.</p>
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

  return (
    <div className="shrink-0 bg-[#1e1e1e] border-l border-white/[0.06] flex flex-col relative" style={{ width }}>
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-gold-400/30 active:bg-gold-400/50 transition-colors"
      />
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0 min-h-[48px]">
        {combatant ? (
          <>
            <h3 className="text-sm font-medium text-[#e6e6e6] truncate pr-2">
              {combatant.name}
            </h3>
            <button
              onClick={onClear}
              className="text-[#9a9894] hover:text-[#e6e6e6] shrink-0 text-sm leading-none transition-colors"
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
          <p className="text-[#b8b5b0] text-sm leading-relaxed">
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
          <p className="text-[#b8b5b0] text-sm">No statblock available.</p>
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

export function StatblockBody({ sb, usage, onUsageChange, onRoll, onSpellClick, compact }) {
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

  const statsHeader = (
    <div className={compact ? 'px-4 py-3' : 'shrink-0 px-4 py-3 bg-[#1e1e1e] border-b border-white/[0.06]'}>
      {/* Type & CR */}
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <p className="text-sm text-[#9a9894] italic">{sb.Type}</p>
        {sb.ChallengeRating && (
          <span className="text-sm text-[#9a9894] font-medium shrink-0">CR {sb.ChallengeRating}</span>
        )}
      </div>
      {sb.Source && (
        <p className="text-xs text-[#787774]/60 mb-3">Source: {sb.Source}</p>
      )}

      {/* Core stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-2">
        {sb.AC?.Value != null && (
          <span className="text-sm">
            <span className="text-[#9a9894]">AC </span>
            <span className="font-medium text-[#e6e6e6]">{sb.AC.Value}</span>
            {sb.AC.Notes ? <span className="text-[#b8b5b0]"> ({sb.AC.Notes})</span> : null}
          </span>
        )}
        {sb.HP?.Value != null && (
          <span className="text-sm">
            <span className="text-[#9a9894]">HP </span>
            <span className="font-medium text-[#e6e6e6]">{sb.HP.Value}</span>
            {sb.HP.Notes ? <span className="text-[#b8b5b0]"> ({sb.HP.Notes})</span> : null}
          </span>
        )}
        {sb.Speed && (
          <span className="text-sm">
            <span className="text-[#9a9894]">Speed </span>
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
                <div className="text-[#e6e6e6] font-medium font-mono text-sm">
                  {sb.Abilities[a]}
                </div>
                <div className="text-[#9a9894] text-xs">
                  ({formatMod(abilityMod(sb.Abilities[a]))})
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* In compact mode (preview), everything scrolls together */}
      {!compact && statsHeader}

      {/* ── Scrollable content: properties, traits, actions, etc. ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
      {compact && <div className="-mx-4 -mt-3">{statsHeader}</div>}

      {/* Properties */}
      <div className="space-y-1 mb-2">
        {/* Rollable saving throws */}
        {sb.Saves?.length > 0 && (
          <p className="text-sm text-[#e6e6e6] leading-relaxed">
            <span className="font-medium text-[#e6e6e6]">Saving Throws </span>
            <span className="text-[#b8b5b0]">
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
          <p className="text-sm text-[#e6e6e6] leading-relaxed">
            <span className="font-medium text-[#e6e6e6]">Skills </span>
            <span className="text-[#b8b5b0]">
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
          <p className="text-sm text-[#b8b5b0] italic leading-relaxed">{sb.Description}</p>
        </>
      )}
      <div className="h-4" />
      </div>
    </div>
  )
}
