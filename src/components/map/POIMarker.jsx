import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { notionPageUrl, fetchPageProps, fetchPageBlocks, fetchFullPage, blocksToPreview } from '../../utils/notionUtils'

// ── Icon types ───────────────────────────────────────────────────────────────
const PIN_TYPES = {
  city:    { label: 'City',    svg: '●' },
  town:    { label: 'Town',    svg: '◆' },
  village: { label: 'Village', svg: '▲' },
  castle:  { label: 'Castle',  svg: '⛫' },
  ruins:   { label: 'Ruins',   svg: '☆' },
  cave:    { label: 'Cave',    svg: '◎' },
  port:    { label: 'Port',    svg: '⚓' },
  generic: { label: 'Marker',  svg: '◉' },
}

export { PIN_TYPES }

function makeIcon(icon = 'generic', color = '#facc15') {
  const sym = PIN_TYPES[icon]?.svg ?? '◉'
  return L.divIcon({
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    html: `<div style="
      width:48px;height:48px;display:flex;align-items:center;justify-content:center;
      font-size:32px;color:${color};
      text-shadow:0 0 6px rgba(0,0,0,0.9),0 0 12px rgba(0,0,0,0.6);
      cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.7));
    ">${sym}</div>`,
  })
}

// ── Notion preview cache ─────────────────────────────────────────────────────
const previewCache = new Map()

export function POIMarker({ poi, onEdit, onRemove }) {
  const map = useMap()
  const [hovered, setHovered] = useState(false)
  const [tooltipHovered, setTooltipHovered] = useState(false)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showFullInfo, setShowFullInfo] = useState(false)
  const [tooltipPos, setTooltipPos] = useState(null)
  const hideTimer = useRef(null)

  const icon = makeIcon(poi.icon, poi.color)

  const isVisible = hovered || tooltipHovered

  // Position the tooltip above the marker in screen coordinates
  const updateTooltipPos = useCallback(() => {
    if (!map) return
    const mapEl = map.getContainer()
    const rect = mapEl.getBoundingClientRect()
    const point = map.latLngToContainerPoint(poi.position)
    if (!point) return
    setTooltipPos({ x: rect.left + point.x, y: rect.top + point.y - 28 })
  }, [map, poi.position])

  // Fetch Notion preview on hover
  useEffect(() => {
    if (!isVisible || !poi.notionPageId) return
    if (previewCache.has(poi.notionPageId)) {
      setPreview(previewCache.get(poi.notionPageId))
      return
    }

    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchPageProps(poi.notionPageId),
      fetchPageBlocks(poi.notionPageId),
    ])
      .then(([props, blocks]) => {
        if (cancelled) return
        const data = { ...props, content: blocksToPreview(blocks) }
        previewCache.set(poi.notionPageId, data)
        setPreview(data)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [isVisible, poi.notionPageId])

  // Update position on map move/zoom
  useEffect(() => {
    if (!isVisible) return
    updateTooltipPos()
    map.on('move zoom', updateTooltipPos)
    return () => map.off('move zoom', updateTooltipPos)
  }, [isVisible, map, updateTooltipPos])

  const scheduleHide = () => {
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      setHovered(false)
      setTooltipHovered(false)
    }, 150)
  }

  const cancelHide = () => {
    clearTimeout(hideTimer.current)
  }

  return (
    <>
      <Marker
        position={poi.position}
        icon={icon}
        eventHandlers={{
          mouseover: () => { cancelHide(); setHovered(true); updateTooltipPos() },
          mouseout: () => scheduleHide(),
          contextmenu: (e) => {
            L.DomEvent.preventDefault(e)
            onEdit?.(poi)
          },
        }}
      />

      {/* Custom tooltip portal - rendered outside Leaflet so it's hoverable */}
      {isVisible && tooltipPos && createPortal(
        <div
          className="fixed z-[1500] pointer-events-auto"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
          onMouseEnter={() => { cancelHide(); setTooltipHovered(true) }}
          onMouseLeave={() => { setTooltipHovered(false); scheduleHide() }}
        >
          <div className="bg-[#1e1e1e] border border-white/[0.12] rounded-lg shadow-xl min-w-[220px] max-w-[340px] text-left mb-2">
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#e6e6e6]">{poi.name}</span>
                {preview?.types?.length > 0 && (
                  <span className="text-xs text-[#9a9894] border border-white/[0.1] px-1.5 py-0.5 rounded">
                    {preview.types[0]}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-3 py-2">
              {loading && (
                <p className="text-xs text-[#b8b5b0] italic">Loading preview...</p>
              )}
              {!loading && preview?.blurb && (
                <p className="text-xs text-[#b8b5b0] leading-relaxed line-clamp-4">
                  {preview.blurb}
                </p>
              )}
              {!loading && preview?.content && !preview.blurb && (
                <p className="text-xs text-[#b8b5b0] leading-relaxed line-clamp-4">
                  {preview.content}
                </p>
              )}
              {!loading && !preview && !poi.notionPageId && (
                <p className="text-xs text-[#9a9894] italic">No linked page</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-3 py-1.5 border-t border-white/[0.06] flex items-center gap-2">
              {poi.notionPageId && (
                <>
                  <a
                    href={notionPageUrl(poi.notionPageId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    View page
                  </a>
                  <button
                    className="text-xs text-[#9a9894] hover:text-[#e6e6e6] transition-colors"
                    onClick={() => setShowFullInfo(true)}
                  >
                    Full info
                  </button>
                </>
              )}
              <div className="flex-1" />
              <button
                className="text-xs text-[#9a9894] hover:text-[#e6e6e6] transition-colors"
                onClick={() => { onEdit?.(poi) }}
              >
                Edit
              </button>
              <button
                className="text-xs text-[#9a9894] hover:text-red-400 transition-colors"
                onClick={() => { onRemove?.(poi.id) }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full info modal */}
      {showFullInfo && createPortal(
        <LocationInfoModal
          poi={poi}
          preview={preview}
          onClose={() => setShowFullInfo(false)}
        />,
        document.body
      )}
    </>
  )
}

// ── Full location info modal ─────────────────────────────────────────────────
function LocationInfoModal({ poi, preview, onClose }) {
  const [fullContent, setFullContent] = useState(null)
  const [relations, setRelations] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Fetch full page content and relations
  useEffect(() => {
    if (!poi.notionPageId) { setLoading(false); return }
    let cancelled = false

    Promise.all([
      fetchPageBlocks(poi.notionPageId).then((blocks) => blocksToPreview(blocks, 10000)),
      fetchFullPage(poi.notionPageId),
    ])
      .then(([content, pageData]) => {
        if (cancelled) return
        setFullContent(content)
        setRelations(pageData.relations)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [poi.notionPageId])

  // Relation badge categories with labels
  const RELATION_LABELS = [
    { key: 'childLocations', label: 'Sublocations' },
    { key: 'npcs', label: 'NPCs' },
    { key: 'organizations', label: 'Organizations' },
    { key: 'peoples', label: 'Peoples' },
    { key: 'quests', label: 'Quests' },
    { key: 'items', label: 'Items' },
    { key: 'killedHere', label: 'Killed Here' },
  ]

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-8"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e1e] border border-white/[0.12] rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-medium text-[#e6e6e6]">{poi.name}</h2>
              {preview?.types?.map((t) => (
                <span key={t} className="text-xs text-[#9a9894] border border-white/[0.1] px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {poi.notionPageId && (
                <a
                  href={notionPageUrl(poi.notionPageId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gold-400 hover:text-gold-300 transition-colors"
                >
                  Open in Notion
                </a>
              )}
              <button
                className="text-[#9a9894] hover:text-[#e6e6e6] text-sm leading-none transition-colors"
                onClick={onClose}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Blurb */}
          {preview?.blurb && (
            <p className="text-sm text-[#b8b5b0] mt-2 italic">{preview.blurb}</p>
          )}

          {/* Relation badges */}
          {relations && (() => {
            const hasAny = RELATION_LABELS.some(({ key }) => relations[key]?.length)
            if (!hasAny) return null
            return (
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                {RELATION_LABELS.map(({ key, label }) => {
                  const items = relations[key]
                  if (!items?.length) return null
                  return (
                    <div key={key} className="flex items-start gap-1.5">
                      <span className="text-xs text-[#9a9894] uppercase tracking-wider mt-0.5 shrink-0">{label}:</span>
                      <div className="flex flex-wrap gap-1">
                        {items.map((item) => (
                          <span
                            key={item.id}
                            className="text-xs text-[#e6e6e6] bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded"
                          >
                            {item.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <p className="text-sm text-[#b8b5b0] italic">Loading page content...</p>
          )}
          {!loading && fullContent && (
            <div className="text-sm text-[#b8b5b0] leading-relaxed whitespace-pre-wrap">
              {fullContent}
            </div>
          )}
          {!loading && !fullContent && (
            <p className="text-sm text-[#b8b5b0] italic">No content available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
