import { useEffect, useMemo, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/**
 * Catmull-Rom spline interpolation for smooth curves through waypoints.
 * Returns an array of [lat, lng] pairs with extra interpolated points.
 */
function catmullRomSpline(points, pointsPerSegment = 16) {
  if (points.length < 3) return points

  const result = []

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    for (let t = 0; t < pointsPerSegment; t++) {
      const f = t / pointsPerSegment
      const f2 = f * f
      const f3 = f2 * f

      const lat = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * f +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * f2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * f3
      )
      const lng = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * f +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * f2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * f3
      )

      result.push([lat, lng])
    }
  }

  result.push(points[points.length - 1])
  return result
}

/**
 * Splits waypoints into segments, breaking at teleport points.
 * Returns array of { positions: [[lat,lng],...], teleport: bool } segments.
 */
export function buildSegments(waypoints) {
  if (waypoints.length === 0) return []

  const segments = []
  let current = { positions: [], teleport: false }

  for (const wp of waypoints) {
    if (wp.teleport && current.positions.length > 0) {
      segments.push(current)
      current = { positions: [wp.position], teleport: true }
    } else {
      current.positions.push(wp.position)
    }
  }
  if (current.positions.length > 0) segments.push(current)
  return segments
}

export function TravelPath({ waypoints, visible, editing }) {
  const map = useMap()
  const layerRef = useRef(null)

  const segments = useMemo(() => buildSegments(waypoints), [waypoints])

  useEffect(() => {
    // Clean up previous layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    if (!visible || segments.length === 0) return

    const group = L.layerGroup()

    segments.forEach((segment) => {
      if (segment.positions.length < 2) return

      // Smooth the path with Catmull-Rom spline
      const smoothed = catmullRomSpline(segment.positions)

      const line = L.polyline(smoothed, {
        color: '#1a1a1a',
        weight: 2,
        opacity: 0.7,
        dashArray: '5, 5',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      })
      group.addLayer(line)
    })

    waypoints.forEach((wp, i) => {
      const isFirst = i === 0
      const isLast = i === waypoints.length - 1
      const isEvent = wp.type === 'event'

      // In edit mode, show all waypoints; otherwise only events + first/last
      if (!editing && !isFirst && !isLast && !isEvent) return

      const showAsMinor = editing && !isFirst && !isLast && !isEvent

      const radius = showAsMinor ? 3 : (isFirst || isLast ? 6 : 5)
      const fillColor = showAsMinor ? '#64748b' : '#d4a843'
      const fillOpacity = showAsMinor ? 0.7 : 0.9

      const circle = L.circleMarker(wp.position, {
        radius,
        fillColor,
        fillOpacity,
        color: '#000',
        weight: showAsMinor ? 1 : 1.5,
        opacity: showAsMinor ? 0.4 : 0.6,
        interactive: !!editing,
      })

      // Show tooltip on hover during edit mode
      if (editing) {
        const label = wp.label || `Waypoint ${i + 1}`
        const typeBadge = isEvent ? 'Event' : 'Travel'
        const index = `#${i + 1}`
        const session = wp.session ? ` - Session ${wp.session}` : ''
        const teleport = wp.teleport ? ' ⚡' : ''

        circle.bindTooltip(
          `<span style="font-size:11px;font-family:'DM Sans',sans-serif;">`
          + `<strong>${label}</strong>`
          + `<br/><span style="opacity:0.7">${index} · ${typeBadge}${session}${teleport}</span>`
          + `</span>`,
          {
            direction: 'top',
            offset: [0, -8],
            className: 'travel-waypoint-tooltip',
            sticky: false,
          }
        )
      }

      group.addLayer(circle)
    })

    group.addTo(map)
    layerRef.current = group

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, segments, waypoints, visible, editing])

  return null
}

// Re-export the spline utility for JourneyPlayback
export { catmullRomSpline }
