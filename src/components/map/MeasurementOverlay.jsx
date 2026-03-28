import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Polyline, CircleMarker, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const MI_TO_KM = 1.60934
const MI_PER_DAY = 24

function formatDistRows(miles, prefix = '') {
  const km = miles * MI_TO_KM
  const days = miles / MI_PER_DAY
  const miStr = miles < 10 ? miles.toFixed(1) : Math.round(miles)
  const kmStr = km < 10 ? km.toFixed(1) : Math.round(km)
  let timeStr
  if (days < 0.1) timeStr = `${Math.round(days * 24)}h`
  else if (days < 1) timeStr = `${(days * 24).toFixed(1)}h`
  else if (days < 2) timeStr = `${days.toFixed(1)} days`
  else timeStr = `${days.toFixed(1)} days`
  return { prefix, mi: `${miStr} mi`, km: `${kmStr} km`, time: `~${timeStr}` }
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

function segmentDist(a, b) {
  // Euclidean distance in map pixels (CRS.Simple)
  const dy = b[0] - a[0]
  const dx = b[1] - a[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function makeLabelIcon({ prefix, mi, km, time }) {
  const header = prefix ? `<div style="color:#d4a843;font-weight:600;margin-bottom:2px;">${prefix}</div>` : ''
  return L.divIcon({
    className: '',
    html: `<div style="
      background: rgba(18,18,18,0.92);
      border: 1px solid rgba(255,255,255,0.18);
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      color: #e0e0e0;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      line-height: 1.4;
      padding: 4px 8px;
      border-radius: 5px;
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -100%);
      margin-top: -8px;
    ">${header}<div>${mi}</div><div>${km}</div><div style="color:#9a9894;">${time}</div></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

function MeasurementClickHandler({ active, onPoint, onFinish }) {
  useMapEvents({
    click(e) {
      if (!active) return
      onPoint([e.latlng.lat, e.latlng.lng])
    },
    dblclick(e) {
      if (!active) return
      L.DomEvent.stop(e)
      onFinish()
    },
  })
  return null
}

export const MeasurementOverlay = forwardRef(function MeasurementOverlay(
  { active, pixelsPerMile },
  ref
) {
  const [points, setPoints] = useState([])
  const [finished, setFinished] = useState(false)

  const clear = useCallback(() => {
    setPoints([])
    setFinished(false)
  }, [])

  useImperativeHandle(ref, () => ({ clear }), [clear])

  // Clear when deactivated
  useEffect(() => {
    if (!active) clear()
  }, [active, clear])

  // Escape key clears
  useEffect(() => {
    if (!active) return
    const handler = (e) => {
      if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, clear])

  const handlePoint = useCallback((pt) => {
    if (finished) {
      // Start a new measurement chain
      setPoints([pt])
      setFinished(false)
    } else {
      setPoints((prev) => [...prev, pt])
    }
  }, [finished])

  const handleFinish = useCallback(() => {
    setFinished(true)
  }, [])

  if (!active || points.length === 0) return <MeasurementClickHandler active={active} onPoint={handlePoint} onFinish={handleFinish} />

  // Compute segment distances
  const segments = []
  let totalPx = 0
  for (let i = 1; i < points.length; i++) {
    const px = segmentDist(points[i - 1], points[i])
    totalPx += px
    segments.push({ from: points[i - 1], to: points[i], px })
  }
  const totalMiles = totalPx / pixelsPerMile

  return (
    <>
      <MeasurementClickHandler active={active} onPoint={handlePoint} onFinish={handleFinish} />

      {/* Dashed gold line */}
      <Polyline
        positions={points}
        pathOptions={{ color: '#d4a843', weight: 2, dashArray: '6,6', opacity: 0.9 }}
      />

      {/* Point markers */}
      {points.map((pt, i) => (
        <CircleMarker
          key={i}
          center={pt}
          radius={4}
          pathOptions={{ color: '#1a1a1a', weight: 1.5, fillColor: '#d4a843', fillOpacity: 0.9 }}
        />
      ))}

      {/* Segment distance labels */}
      {segments.map((seg, i) => {
        const miles = seg.px / pixelsPerMile
        return (
          <Marker
            key={`seg-${i}`}
            position={midpoint(seg.from, seg.to)}
            icon={makeLabelIcon(formatDistRows(miles))}
            interactive={false}
          />
        )
      })}

      {/* Total distance label at last point (only for multi-segment) */}
      {segments.length > 1 && (
        <Marker
          position={points[points.length - 1]}
          icon={makeLabelIcon(formatDistRows(totalMiles, 'Total'))}
          interactive={false}
        />
      )}
    </>
  )
})
