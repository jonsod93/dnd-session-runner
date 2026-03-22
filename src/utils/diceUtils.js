export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

// Evaluate a dice expression string like "2d6+8", "d20+4", "1d4-1"
// Returns { label, detail, total } or null if invalid
export function evalDiceExpr(exprRaw) {
  const expr = exprRaw.trim().toLowerCase()

  // d20±N (attack roll format)
  const attackM = expr.match(/^d20([+-]\d+)?$/)
  if (attackM) {
    const mod   = attackM[1] ? parseInt(attackM[1]) : 0
    const roll  = rollDie(20)
    const total = roll + mod
    const modStr = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : ''
    return {
      label:    `d20${modStr}`,
      detail:   `[${roll}]${modStr} = ${total}`,
      total,
      rollType: 'attack',
    }
  }

  // NdM[±K]
  const diceM = expr.match(/^(\d+)d(\d+)([+-]\d+)?$/)
  if (diceM) {
    const count  = parseInt(diceM[1])
    const sides  = parseInt(diceM[2])
    const mod    = diceM[3] ? parseInt(diceM[3]) : 0
    const rolls  = Array.from({ length: count }, () => rollDie(sides))
    const sum    = rolls.reduce((a, b) => a + b, 0)
    const total  = sum + mod
    const modStr  = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : ''
    const rollStr = count > 1 ? `[${rolls.join('+')}]` : `[${rolls[0]}]`
    return {
      label:    `${count}d${sides}${modStr}`,
      detail:   `${rollStr}${modStr} = ${total}`,
      total,
      rollType: 'damage',
    }
  }

  return null
}

// Parse text into segments for rich rendering.
// Segments: { type: 'text', text }
//         | { type: 'roll', text, expr }
//         | { type: 'spell', text }
//
// spellRegex is an optional pre-compiled RegExp for spell-name detection.
export function parseRichText(text, spellRegex) {
  if (!text) return [{ type: 'text', text: '' }]

  // Pass 1: split on dice expressions
  const diceSegments = _parseDice(text)

  // Pass 2: within text segments, split on spell names
  if (!spellRegex) return diceSegments
  return diceSegments.flatMap((seg) =>
    seg.type === 'text' ? _parseSpells(seg.text, spellRegex) : [seg]
  )
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseDice(text) {
  const segments = []
  // Match (priority order):
  //   [+-]N to hit     → attack roll
  //   (NdM[±K])        → damage in parens
  //   \bNdM[±K]\b      → standalone dice expr
  const re = /([+-]\d+\s+to\s+hit)|(\(\d+d\d+(?:[+-]\d+)?\))|(\b\d+d\d+(?:[+-]\d+)?\b)/gi
  let lastIdx = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      segments.push({ type: 'text', text: text.slice(lastIdx, m.index) })
    }
    if (m[1]) {
      const modPart = m[1].match(/[+-]\d+/)[0]
      segments.push({ type: 'roll', text: m[1], expr: `d20${modPart}` })
    } else if (m[2]) {
      segments.push({ type: 'roll', text: m[2], expr: m[2].slice(1, -1) })
    } else if (m[3]) {
      segments.push({ type: 'roll', text: m[3], expr: m[3] })
    }
    lastIdx = re.lastIndex
  }
  if (lastIdx < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIdx) })
  }
  return segments
}

function _parseSpells(text, spellRegex) {
  const segments = []
  const re = new RegExp(spellRegex.source, 'gi')
  let lastIdx = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      segments.push({ type: 'text', text: text.slice(lastIdx, m.index) })
    }
    segments.push({ type: 'spell', text: m[0] })
    lastIdx = re.lastIndex
  }
  if (lastIdx < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIdx) })
  }
  return segments.length ? segments : [{ type: 'text', text }]
}
