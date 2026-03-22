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

  // NdM[±K] — allow optional spaces around the operator (e.g. "1d4 + 1")
  const diceM = expr.match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/)
  if (diceM) {
    const count  = parseInt(diceM[1])
    const sides  = parseInt(diceM[2])
    const mod    = diceM[3] ? parseInt(diceM[3].replace(/\s+/g, '')) : 0
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
  //   [+-]N to hit           → attack roll
  //   (NdM[ ± K])            → damage in parens (spaces around operator allowed)
  //   \bNdM[ ± K]\b          → standalone dice expr (spaces around operator allowed)
  // Note: [lL] accepted as "1" — common OCR/data typo (e.g. "l6d8" for "16d8")
  const re = /([+-]\d+\s+to\s+hit)|(\([lL\d]+d\d+\s*(?:[+-]\s*\d+)?\s*\))|(\b[lL\d]+d\d+\s*(?:[+-]\s*\d+)?(?=\s|[^a-zA-Z]|$))/gi
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
      // Strip spaces and fix l→1 so "l6d8" → expr "16d8"
      const inner = m[2].slice(1, -1).replace(/\s+/g, '').replace(/[lL]/g, '1')
      segments.push({ type: 'roll', text: m[2], expr: inner })
    } else if (m[3]) {
      const expr = m[3].replace(/\s+/g, '').replace(/[lL]/g, '1')
      segments.push({ type: 'roll', text: m[3], expr })
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
