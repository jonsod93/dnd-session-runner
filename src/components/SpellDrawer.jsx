import { useState, useEffect } from 'react'
import { spellNameToSlug } from '../data/srdSpellNames'
import { HighlightedText, RichContent } from './combat/StatblockPanel'
import { useIsMobile } from '../hooks/useIsMobile'

const CACHE_PREFIX = 'mythranos-spell-v2-'

export function SpellDrawer({ spellName, onClose, onRoll }) {
  const isMobile = useIsMobile()
  const [spell,   setSpell]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!spellName) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setSpell(null)

    const slug     = spellNameToSlug(spellName)
    const cacheKey = CACHE_PREFIX + slug
    const cached   = localStorage.getItem(cacheKey)

    if (cached) {
      setSpell(JSON.parse(cached))
      setLoading(false)
      return
    }

    // Try SRD slug directly first, then fall back to name filter
    const srdSlug = `srd_${slug}`
    fetch(`https://api.open5e.com/v2/spells/${srdSlug}/`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status)
        return r.json()
      })
      .catch(() =>
        // Fallback: exact name lookup, prefer SRD sources
        fetch(`https://api.open5e.com/v2/spells/?name=${encodeURIComponent(spellName)}&limit=10`)
          .then((r) => r.ok ? r.json() : Promise.reject())
          .then((data) => {
            const results = data.results ?? []
            // Prefer srd source, then srd-2024, then any
            const pick = results.find((r) => r.document?.key === 'srd-2014')
                      ?? results.find((r) => r.document?.key === 'srd-2024')
                      ?? results.find((r) => r.document?.key?.startsWith('srd'))
                      ?? results[0]
            if (!pick) throw new Error('not found')
            return pick
          })
      )
      .then((data) => {
        if (cancelled) return
        localStorage.setItem(cacheKey, JSON.stringify(data))
        setSpell(data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Spell data not available.')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [spellName])

  // Escape to close
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const drawerClass = isMobile
    ? 'fixed inset-x-0 bottom-0 z-[2100] glass-modal !rounded-b-none !rounded-t-xl flex flex-col'
    : 'fixed left-1/2 -translate-x-1/2 z-[2100] glass-modal !rounded-xl flex flex-col'
  const drawerStyle = isMobile
    ? { maxHeight: '55vh', boxShadow: '0 -6px 32px rgba(0,0,0,0.5)' }
    : { bottom: '16px', maxHeight: '38vh', width: '50vw', boxShadow: '0 -6px 32px rgba(0,0,0,0.5)' }

  return (
    <div className={drawerClass} style={drawerStyle}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-[#e6e6e6]">
            {loading ? 'Loading…' : (spell?.name ?? spellName)}
          </h3>
          {!loading && spell && <SpellMeta spell={spell} />}
        </div>
        <button
          onClick={onClose}
          className="text-[#9a9894] hover:text-[#e6e6e6] text-sm leading-none transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <p className="text-[#b8b5b0] text-sm">Loading spell data…</p>
        )}
        {error && (
          <p className="text-red-400/70 text-sm">{error}</p>
        )}
        {spell && <SpellBody spell={spell} onRoll={onRoll} />}
      </div>
    </div>
  )
}

function SpellMeta({ spell }) {
  const level  = spell.level
  const school = typeof spell.school === 'object' ? spell.school?.name : spell.school
  const label  = level === 0
    ? `${school ?? ''} cantrip`.trim()
    : `${ordinal(level)}-level ${(school ?? '').toLowerCase()}`.trim()
  return <span className="text-sm text-[#9a9894] italic">{label}</span>
}

function SpellBody({ spell, onRoll }) {
  const props = [
    spell.casting_time && `Casting Time: ${spell.casting_time}`,
    spell.range        && `Range: ${spell.range === '0.1' ? 'Touch' : `${spell.range}ft.`}`,
    spell.components   && `Components: ${spell.components}`,
    spell.duration     && `Duration: ${spell.duration}`,
  ].filter(Boolean)

  return (
    <div>
      {props.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-0.5 mb-3">
          {props.map((p, i) => (
            <span key={i} className="text-sm text-[#9a9894]"><HighlightedText text={p} /></span>
          ))}
        </div>
      )}
      {spell.desc && (
        <p className="text-sm text-[#b8b5b0] leading-relaxed whitespace-pre-wrap">
          <RichContent text={spell.desc} onRoll={onRoll} enableSpellLinks={false} actionName={spell.name} />
        </p>
      )}
      {spell.higher_level && (
        <p className="text-sm text-[#b8b5b0] leading-relaxed mt-3 whitespace-pre-wrap">
          <span className="font-medium text-[#e6e6e6]">At Higher Levels. </span>
          <RichContent text={spell.higher_level} onRoll={onRoll} enableSpellLinks={false} actionName={spell.name} />
        </p>
      )}
    </div>
  )
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
