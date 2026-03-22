import { useState, useEffect, useRef } from 'react'
import { Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { notionPageUrl, fetchPageProps, fetchPageBlocks, blocksToPreview } from '../../utils/notionUtils'

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
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="
      width:28px;height:28px;display:flex;align-items:center;justify-content:center;
      font-size:18px;color:${color};
      text-shadow:0 0 4px rgba(0,0,0,0.8),0 0 8px rgba(0,0,0,0.5);
      cursor:pointer;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));
    ">${sym}</div>`,
  })
}

// ── Notion preview cache ─────────────────────────────────────────────────────
const previewCache = new Map()

export function POIMarker({ poi, onEdit, onRemove }) {
  const [hovered, setHovered] = useState(false)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(null)

  const icon = makeIcon(poi.icon, poi.color)

  // Fetch Notion preview on hover
  useEffect(() => {
    if (!hovered || !poi.notionPageId) return
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
  }, [hovered, poi.notionPageId])

  return (
    <Marker
      position={poi.position}
      icon={icon}
      eventHandlers={{
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false),
        contextmenu: (e) => {
          L.DomEvent.preventDefault(e)
          onEdit?.(poi)
        },
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, -14]}
        opacity={1}
        permanent={false}
        className="poi-tooltip-wrapper"
      >
        <div className="bg-[#1e1e1e] border border-white/[0.12] rounded-lg shadow-xl min-w-[200px] max-w-[320px] text-left" style={{ margin: '-8px -12px' }}>
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#e6e6e6]">{poi.name}</span>
              {preview?.types?.length > 0 && (
                <span className="text-[10px] text-[#787774] border border-white/[0.1] px-1.5 py-0.5 rounded">
                  {preview.types[0]}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-3 py-2">
            {loading && (
              <p className="text-[11px] text-[#787774] italic">Loading preview…</p>
            )}
            {!loading && preview?.blurb && (
              <p className="text-[11px] text-[#787774] leading-relaxed line-clamp-4">
                {preview.blurb}
              </p>
            )}
            {!loading && preview?.content && !preview.blurb && (
              <p className="text-[11px] text-[#787774] leading-relaxed line-clamp-4">
                {preview.content}
              </p>
            )}
            {!loading && !preview && !poi.notionPageId && (
              <p className="text-[11px] text-[#787774] italic">No linked page</p>
            )}
          </div>

          {/* Actions */}
          <div className="px-3 py-1.5 border-t border-white/[0.06] flex items-center gap-2">
            {poi.notionPageId && (
              <a
                href={notionPageUrl(poi.notionPageId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-gold-400 hover:text-gold-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                View page →
              </a>
            )}
            <div className="flex-1" />
            <button
              className="text-[10px] text-[#787774] hover:text-[#e6e6e6] transition-colors"
              onClick={(e) => { e.stopPropagation(); onEdit?.(poi) }}
            >
              Edit
            </button>
            <button
              className="text-[10px] text-[#787774] hover:text-red-400 transition-colors"
              onClick={(e) => { e.stopPropagation(); onRemove?.(poi.id) }}
            >
              Delete
            </button>
          </div>
        </div>
      </Tooltip>
    </Marker>
  )
}
