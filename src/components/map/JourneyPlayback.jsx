import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { buildSegments, catmullRomSpline } from './TravelPath'

// ── Distance helpers ──────────────────────────────────────────────────────────

function ptDist(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function buildCumDist(points) {
  const d = [0]
  for (let i = 1; i < points.length; i++) {
    d.push(d[i - 1] + ptDist(points[i - 1], points[i]))
  }
  return d
}

function posAtDist(targetDist, cumDist, points) {
  if (targetDist <= 0) return { index: 0, position: points[0] }
  if (targetDist >= cumDist[cumDist.length - 1]) {
    return { index: points.length - 1, position: points[points.length - 1] }
  }
  let lo = 0
  let hi = cumDist.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (cumDist[mid] <= targetDist) lo = mid
    else hi = mid
  }
  const segLen = cumDist[hi] - cumDist[lo]
  const t = segLen > 0 ? (targetDist - cumDist[lo]) / segLen : 0
  return {
    index: lo,
    position: [
      points[lo][0] + t * (points[hi][0] - points[lo][0]),
      points[lo][1] + t * (points[hi][1] - points[lo][1]),
    ],
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRAVEL_SPEED = 0.7
const POINTS_PER_SEGMENT = 20
const LINE_STYLE = {
  color: '#1a1a1a', weight: 2, opacity: 0.7,
  dashArray: '5, 5', lineCap: 'round', lineJoin: 'round', interactive: false,
}

export function JourneyPlayback({ waypoints, playing, onStop, pois }) {
  const map = useMap()
  const layerRef = useRef(null)
  const cancelledRef = useRef(false)
  const skipRef = useRef(null)
  const advanceRef = useRef(null)
  const visitedEventsRef = useRef([]) // stack of global waypoint indices for visited events
  const [progress, setProgress] = useState(0)
  const [currentLabel, setCurrentLabel] = useState('')
  const [eventPopup, setEventPopup] = useState(null)
  const [teleportFlash, setTeleportFlash] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)

  const cleanup = useCallback(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    setEventPopup(null)
    setTeleportFlash(false)
    setCanGoBack(false)
  }, [map])

  const handleEndJourney = useCallback(() => {
    cancelledRef.current = true
    if (skipRef.current) skipRef.current('end')
    if (advanceRef.current) advanceRef.current('end')
    cleanup()
    onStop()
  }, [cleanup, onStop])

  const handleSkip = useCallback(() => {
    if (skipRef.current) skipRef.current('skip')
    if (advanceRef.current) advanceRef.current('skip')
  }, [])

  const handleAdvance = useCallback(() => {
    if (advanceRef.current) advanceRef.current('advance')
  }, [])

  const handleBack = useCallback(() => {
    if (advanceRef.current) advanceRef.current('back')
  }, [])

  useEffect(() => {
    if (!playing || waypoints.length < 2) return

    cancelledRef.current = false
    visitedEventsRef.current = []

    const segments = buildSegments(waypoints)
    const totalWaypoints = waypoints.length

    // ── Build flat waypoint-to-segment map ────────────────────────────
    const flatMap = [] // flatMap[wpIdx] = { segIdx, posInSeg }
    let wi = 0
    for (let si = 0; si < segments.length; si++) {
      for (let pi = 0; pi < segments[si].positions.length; pi++) {
        flatMap.push({ segIdx: si, posInSeg: pi })
        wi++
      }
    }

    // ── Shared helpers ────────────────────────────────────────────────

    function clampPos(pos) {
      const bounds = map.options.maxBounds
      if (!bounds) return pos
      const size = map.getSize()
      const topLeft = map.containerPointToLatLng([0, 0])
      const botRight = map.containerPointToLatLng([size.x, size.y])
      const halfH = Math.abs(topLeft.lat - botRight.lat) / 2
      const halfW = Math.abs(topLeft.lng - botRight.lng) / 2
      return [
        Math.max(bounds.getSouth() + halfH, Math.min(bounds.getNorth() - halfH, pos[0])),
        Math.max(bounds.getWest() + halfW, Math.min(bounds.getEast() - halfW, pos[1])),
      ]
    }

    function flyToAsync(latlng, zoom, options = {}) {
      return new Promise((resolve) => {
        if (cancelledRef.current) return resolve()
        map.flyTo(clampPos(latlng), zoom, { duration: 1.5, ...options })
        map.once('moveend', resolve)
      })
    }

    function wait(ms) {
      return new Promise((resolve) => {
        if (cancelledRef.current) return resolve('end')
        const timer = setTimeout(() => { skipRef.current = null; resolve('done') }, ms)
        skipRef.current = (reason) => {
          clearTimeout(timer)
          skipRef.current = null
          resolve(reason)
        }
      })
    }

    function waitForAdvance() {
      return new Promise((resolve) => {
        if (cancelledRef.current) return resolve('end')

        function done(reason) {
          window.removeEventListener('keydown', onKey)
          advanceRef.current = null
          skipRef.current = null
          resolve(reason)
        }

        const onKey = (e) => {
          if (e.code === 'Space' || e.code === 'ArrowRight') {
            e.preventDefault()
            done('advance')
          } else if (e.code === 'ArrowLeft') {
            e.preventDefault()
            done('back')
          }
        }
        window.addEventListener('keydown', onKey)

        advanceRef.current = (reason) => done(reason || 'advance')
        skipRef.current = (reason) => done(reason)
      })
    }

    function fitBoundsAsync(positions, options = {}) {
      return new Promise((resolve) => {
        if (cancelledRef.current) return resolve()
        const bounds = L.latLngBounds(positions)
        map.flyToBounds(bounds, { padding: [80, 80], duration: 1.5, maxZoom: -1, ...options })
        map.once('moveend', resolve)
      })
    }

    // ── Drawing helpers (need group + renderer from caller) ──────────

    function createDrawHelpers(group, renderer) {
      function drawDot(position, opts = {}) {
        const circle = L.circleMarker(position, {
          renderer, radius: opts.radius || 5,
          fillColor: '#d4a843', fillOpacity: 0.9,
          color: '#000', weight: 1.5, opacity: 0.6, interactive: false,
        })
        group.addLayer(circle)
      }

      function drawLine(positions) {
        const line = L.polyline(positions, { renderer, ...LINE_STYLE })
        group.addLayer(line)
        return line
      }

      function getLinkedPoi(wp) {
        if (!wp.linkedPoiId || !pois) return null
        return pois.find((p) => p.id === wp.linkedPoiId) || null
      }

      function showEvent(wp) {
        const poi = getLinkedPoi(wp)
        setEventPopup({
          label: wp.label || poi?.name || 'Event',
          text: wp.customText || '',
          poiName: poi?.name || null,
          session: wp.session,
        })
      }

      return { drawDot, drawLine, showEvent }
    }

    // ── Fast-forward: draw everything up to a waypoint index ─────────

    function fastForwardTo(group, renderer, targetWpIdx) {
      const { drawDot, drawLine } = createDrawHelpers(group, renderer)
      let wpIdx = 0

      for (const segment of segments) {
        if (wpIdx > targetWpIdx) break

        const endCount = Math.min(segment.positions.length, targetWpIdx - wpIdx + 1)
        const positionsToUse = segment.positions.slice(0, endCount)

        if (positionsToUse.length >= 2) {
          const smoothed = catmullRomSpline(positionsToUse, POINTS_PER_SEGMENT)
          drawLine(smoothed)
        }

        for (let i = 0; i < endCount; i++) {
          const gIdx = wpIdx + i
          const wp = waypoints[gIdx]
          if (wp.type === 'event' || gIdx === 0 || gIdx === totalWaypoints - 1) {
            drawDot(positionsToUse[i], { radius: (gIdx === 0 || gIdx === totalWaypoints - 1) ? 6 : 5 })
          }
        }

        wpIdx += segment.positions.length
      }
    }

    // ── Segment plan + animation ─────────────────────────────────────

    function buildSegmentPlan(segPositions, segWaypointData) {
      const interpolated = catmullRomSpline(segPositions, POINTS_PER_SEGMENT)
      const cumDist = buildCumDist(interpolated)
      const eventStops = []
      for (let k = 0; k < segPositions.length; k++) {
        const wpData = segWaypointData[k]
        const interpIdx = Math.min(k * POINTS_PER_SEGMENT, interpolated.length - 1)
        if (wpData.isEvent || wpData.isLast) {
          eventStops.push({ dist: cumDist[interpIdx], interpIdx, wpData, position: segPositions[k] })
        }
      }
      return { interpolated, cumDist, eventStops }
    }

    function animatePath(plan, activeLine, startDist, globalWpIdx) {
      const { interpolated, cumDist, eventStops } = plan
      const totalDist = cumDist[cumDist.length - 1]
      let globalWaypointIndex = globalWpIdx

      return new Promise((resolve) => {
        let currentDist = startDist
        let lastTime = null
        let nextStopIdx = 0
        let paused = false
        let rafId = null

        while (nextStopIdx < eventStops.length && eventStops[nextStopIdx].dist <= currentDist + 0.1) {
          nextStopIdx++
        }

        const { drawDot, showEvent } = createDrawHelpers(
          activeLine._map ? { addLayer: (l) => l.addTo(activeLine._map) } : map,
          activeLine.options.renderer
        )
        // Re-bind drawDot to use the correct group
        function addDot(position, opts) {
          const circle = L.circleMarker(position, {
            renderer: activeLine.options.renderer, radius: opts?.radius || 5,
            fillColor: '#d4a843', fillOpacity: 0.9,
            color: '#000', weight: 1.5, opacity: 0.6, interactive: false,
          })
          layerRef.current?.addLayer(circle)
        }

        skipRef.current = (reason) => {
          if (rafId) cancelAnimationFrame(rafId)
          skipRef.current = null
          resolve(reason)
        }

        function frame(now) {
          if (cancelledRef.current) { resolve('end'); return }
          if (paused) return

          if (!lastTime) { lastTime = now; rafId = requestAnimationFrame(frame); return }
          const dt = Math.min(now - lastTime, 50)
          lastTime = now

          currentDist += TRAVEL_SPEED * dt

          let hitEvent = null
          if (nextStopIdx < eventStops.length && currentDist >= eventStops[nextStopIdx].dist) {
            currentDist = eventStops[nextStopIdx].dist
            hitEvent = eventStops[nextStopIdx]
            nextStopIdx++
          }
          if (currentDist >= totalDist) currentDist = totalDist

          const { index, position } = posAtDist(currentDist, cumDist, interpolated)
          const linePoints = interpolated.slice(0, index + 1)
          if (index < interpolated.length - 1) linePoints.push(position)
          activeLine.setLatLngs(linePoints)

          map.setView(clampPos(position), map.getZoom(), { animate: false })
          setProgress(Math.round((globalWaypointIndex / totalWaypoints) * 100))

          if (hitEvent) {
            paused = true
            const wp = hitEvent.wpData

            addDot(hitEvent.position, { radius: wp.isLast ? 6 : 5 })
            setCurrentLabel(wp.label || '')
            showEvent(wp)

            // Track this event for back navigation
            if (wp.globalWpIdx !== undefined) {
              visitedEventsRef.current.push(wp.globalWpIdx)
              setCanGoBack(visitedEventsRef.current.length > 1)
            }

            waitForAdvance().then((reason) => {
              if (reason === 'end' || cancelledRef.current) { resolve('end'); return }
              if (reason === 'skip') { resolve('skip'); return }
              if (reason === 'back') { resolve('back'); return }

              setEventPopup(null)
              paused = false
              lastTime = null

              skipRef.current = (r) => {
                if (rafId) cancelAnimationFrame(rafId)
                skipRef.current = null
                resolve(r)
              }

              if (currentDist >= totalDist) { resolve('done') }
              else { rafId = requestAnimationFrame(frame) }
            })
            return
          }

          setCurrentLabel('')
          if (currentDist >= totalDist) { skipRef.current = null; resolve('done'); return }
          rafId = requestAnimationFrame(frame)
        }

        rafId = requestAnimationFrame(frame)
      })
    }

    // ── Teleport flash animation ─────────────────────────────────────

    async function teleportTo(destination) {
      setTeleportFlash(true)
      await wait(450) // fade in
      if (cancelledRef.current) return
      map.setView(clampPos(destination), -1, { animate: false })
      await wait(250) // hold
      if (cancelledRef.current) return
      setTeleportFlash(false)
      await wait(400) // fade out
    }

    // ── Main playback (supports resuming from a waypoint index) ──────

    async function runPlayback(group, renderer, resumeFromWpIdx) {
      const { drawDot, drawLine, showEvent } = createDrawHelpers(group, renderer)

      // ── Fast-forward if resuming ───────────────────────────────────
      if (resumeFromWpIdx > 0) {
        fastForwardTo(group, renderer, resumeFromWpIdx)
        const wp = waypoints[resumeFromWpIdx]
        map.setView(clampPos(wp.position), -1, { animate: false })
        setCurrentLabel(wp.label || '')
        setProgress(Math.round((resumeFromWpIdx / totalWaypoints) * 100))
        showEvent(wp)
        setCanGoBack(visitedEventsRef.current.length > 0)

        const r = await waitForAdvance()
        setEventPopup(null)
        if (r === 'end' || cancelledRef.current) return 'end'
        if (r === 'back') return 'back'
        // 'advance' or 'skip' - continue from next waypoint
      } else {
        // ── Normal start ─────────────────────────────────────────────
        const firstWp = waypoints[0]
        drawDot(firstWp.position, { radius: 6 })
        setCurrentLabel(firstWp.label || 'Journey begins')
        setProgress(0)

        await flyToAsync(firstWp.position, -1, { duration: 2 })
        if (cancelledRef.current) return 'end'

        if (firstWp.type === 'event') {
          visitedEventsRef.current.push(0)
          setCanGoBack(false)
          showEvent(firstWp)
          const r = await waitForAdvance()
          setEventPopup(null)
          if (r === 'end' || cancelledRef.current) return 'end'
          if (r === 'back') return 'back'
        } else {
          const r = await wait(800)
          if (r === 'end' || cancelledRef.current) return 'end'
        }
      }

      // ── Determine starting segment/position ────────────────────────
      const startWpIdx = resumeFromWpIdx > 0 ? resumeFromWpIdx + 1 : 1
      if (startWpIdx >= totalWaypoints) {
        return 'done'
      }

      // Find which segment and position within it
      const startInfo = flatMap[startWpIdx]
      if (!startInfo) return 'done'

      // Calculate wpOffset for the starting segment
      let wpOffset = 0
      for (let s = 0; s < startInfo.segIdx; s++) {
        wpOffset += segments[s].positions.length
      }

      for (let si = startInfo.segIdx; si < segments.length; si++) {
        const segment = segments[si]
        const posStart = si === startInfo.segIdx ? startInfo.posInSeg : 0

        // ── Teleport transition ──────────────────────────────────────
        if (segment.teleport && si > 0 && posStart === 0) {
          const to = segment.positions[0]

          setCurrentLabel('Teleport!')
          await teleportTo(to)
          if (cancelledRef.current) return 'end'

          const destWpIdx = wpOffset
          const destWp = waypoints[destWpIdx]

          if (destWp?.type === 'event' || destWpIdx === totalWaypoints - 1) {
            drawDot(to, { radius: 5 })
          }

          setCurrentLabel(destWp?.label || '')
          setProgress(Math.round((destWpIdx / totalWaypoints) * 100))

          if (destWp?.type === 'event') {
            visitedEventsRef.current.push(destWpIdx)
            setCanGoBack(visitedEventsRef.current.length > 1)
            showEvent(destWp)
            const r = await waitForAdvance()
            setEventPopup(null)
            if (r === 'end' || cancelledRef.current) return 'end'
            if (r === 'back') return 'back'
          } else {
            const r = await wait(400)
            if (r === 'end' || cancelledRef.current) return 'end'
          }

          if (segment.positions.length < 2) {
            wpOffset += segment.positions.length
            continue
          }
        }

        // ── Build plan for this segment ──────────────────────────────
        const subPositions = segment.positions
        const subMetas = subPositions.map((pos, k) => {
          const globalIdx = wpOffset + k
          const wp = waypoints[globalIdx]
          return {
            type: wp?.type || 'travel',
            isEvent: wp?.type === 'event',
            isLast: globalIdx === totalWaypoints - 1,
            label: wp?.label || '',
            customText: wp?.customText || '',
            linkedPoiId: wp?.linkedPoiId || null,
            session: wp?.session,
            globalWpIdx: globalIdx,
          }
        })

        const plan = buildSegmentPlan(subPositions, subMetas)

        // Figure out starting distance within this segment
        let startDist = 0
        if (posStart > 0) {
          const interpIdx = Math.min(posStart * POINTS_PER_SEGMENT, plan.interpolated.length - 1)
          startDist = plan.cumDist[interpIdx]
        } else if (si === 0 && resumeFromWpIdx <= 0) {
          startDist = 0.1
        } else if (segment.teleport) {
          const interpIdx = Math.min(1 * POINTS_PER_SEGMENT, plan.interpolated.length - 1)
          startDist = plan.cumDist[interpIdx]
        }

        // Filter event stops we've already passed
        plan.eventStops = plan.eventStops.filter((s) => s.dist > startDist + 0.1)

        // Create polyline pre-filled to starting position
        const initIdx = posStart > 0
          ? Math.min(posStart * POINTS_PER_SEGMENT + 1, plan.interpolated.length)
          : segment.teleport
            ? Math.min(1 * POINTS_PER_SEGMENT + 1, plan.interpolated.length)
            : 1
        const initPoints = plan.interpolated.slice(0, initIdx)
        const line = L.polyline(initPoints.length > 0 ? initPoints : [subPositions[0]], {
          renderer, ...LINE_STYLE,
        })
        group.addLayer(line)

        let result = await animatePath(plan, line, startDist, wpOffset + Math.max(posStart, 1))

        // Handle skip / back within segment
        while (result === 'skip') {
          setEventPopup(null)
          const currentLineLen = line.getLatLngs().length
          const currentDist = currentLineLen > 0
            ? plan.cumDist[Math.min(currentLineLen - 1, plan.cumDist.length - 1)] : 0
          const nextStop = plan.eventStops.find((s) => s.dist > currentDist + 0.1)
          if (!nextStop) {
            line.setLatLngs(plan.interpolated)
            plan.eventStops.forEach((s) => drawDot(s.position, { radius: s.wpData.isLast ? 6 : 5 }))
            result = 'done'
            break
          }
          const jumpPos = posAtDist(nextStop.dist, plan.cumDist, plan.interpolated)
          line.setLatLngs(plan.interpolated.slice(0, jumpPos.index + 1).concat([jumpPos.position]))
          drawDot(nextStop.position, { radius: nextStop.wpData.isLast ? 6 : 5 })
          await flyToAsync(nextStop.position, map.getZoom(), { duration: 1 })
          if (cancelledRef.current) return 'end'
          setCurrentLabel(nextStop.wpData.label || '')
          showEvent(nextStop.wpData)
          if (nextStop.wpData.globalWpIdx !== undefined) {
            visitedEventsRef.current.push(nextStop.wpData.globalWpIdx)
            setCanGoBack(visitedEventsRef.current.length > 1)
          }
          const r2 = await waitForAdvance()
          setEventPopup(null)
          if (r2 === 'end' || cancelledRef.current) return 'end'
          if (r2 === 'back') return 'back'
          if (r2 === 'skip') { result = 'skip'; continue }
          result = await animatePath(plan, line, nextStop.dist, wpOffset)
        }

        if (result === 'end' || cancelledRef.current) return 'end'
        if (result === 'back') return 'back'

        wpOffset += segment.positions.length
      }

      // ── Finished ─────────────────────────────────────────────────────
      setCurrentLabel('Journey complete')
      setProgress(100)
      setEventPopup(null)
      let r = await wait(500)
      if (r === 'end' || cancelledRef.current) return 'end'

      await fitBoundsAsync(waypoints.map((w) => w.position), { duration: 2.5, padding: [60, 60] })
      if (cancelledRef.current) return 'end'
      r = await wait(3000)

      return (!cancelledRef.current && r !== 'end') ? 'done' : 'end'
    }

    // ── Outer loop: restarts on 'back' ───────────────────────────────

    async function playbackLoop() {
      let resumeFromWpIdx = -1

      while (!cancelledRef.current) {
        // Clean up previous run
        if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null }
        setEventPopup(null)
        setTeleportFlash(false)

        const renderer = L.canvas()
        const group = L.layerGroup().addTo(map)
        layerRef.current = group

        const result = await runPlayback(group, renderer, resumeFromWpIdx)

        if (result === 'back') {
          // Pop current event, go to previous
          if (visitedEventsRef.current.length > 0) visitedEventsRef.current.pop()
          const prev = visitedEventsRef.current.length > 0
            ? visitedEventsRef.current[visitedEventsRef.current.length - 1]
            : 0
          resumeFromWpIdx = prev
          continue
        }

        if (result === 'done') onStop()
        break
      }
    }

    playbackLoop()

    return () => {
      cancelledRef.current = true
      cleanup()
    }
  }, [playing, waypoints, map, cleanup, onStop, pois])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  if (!playing) return null

  return createPortal(
    <>
      {/* Teleport flash overlay */}
      <div
        className="fixed inset-0 z-[2002] pointer-events-none transition-opacity duration-[400ms]"
        style={{
          background: 'radial-gradient(circle, rgba(200,220,240,0.85) 0%, rgba(15,20,30,0.95) 100%)',
          opacity: teleportFlash ? 1 : 0,
        }}
      />

      {/* Event info popup - centered on screen */}
      {eventPopup && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] animate-fade-in">
          <div className="bg-[#1e1e1e]/95 border border-white/[0.15] rounded-lg px-5 py-4 backdrop-blur-sm shadow-2xl max-w-sm text-center">
            <h3 className="text-sm font-medium text-[#e6e6e6] mb-1">
              {eventPopup.label}
            </h3>
            {eventPopup.session && (
              <p className="text-xs text-gold-400 mb-1">Session {eventPopup.session}</p>
            )}
            {eventPopup.text && (
              <p className="text-xs text-[#b8b5b0] leading-relaxed mb-3">{eventPopup.text}</p>
            )}
            {eventPopup.poiName && !eventPopup.text && (
              <p className="text-xs text-[#9a9894] italic mb-3">Location: {eventPopup.poiName}</p>
            )}
            {!eventPopup.text && !eventPopup.poiName && <div className="mb-3" />}
            <div className="flex items-center justify-center gap-4">
              {canGoBack && (
                <button
                  onClick={handleBack}
                  className="text-xs text-[#9a9894] hover:text-gold-400 transition-colors"
                >
                  &larr; Prev <span className="text-[#787774] ml-0.5">(&#8592;)</span>
                </button>
              )}
              <button
                onClick={handleAdvance}
                className="text-xs text-[#9a9894] hover:text-gold-400 transition-colors"
              >
                Next &rarr; <span className="text-[#787774] ml-0.5">(Space)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-3">
        <div className="bg-slate-900/90 border border-white/[0.12] rounded-lg px-4 py-2.5 backdrop-blur-sm flex items-center gap-3 shadow-xl">
          {currentLabel && (
            <span className="text-sm text-gold-400 font-medium whitespace-nowrap max-w-[180px] truncate">
              {currentLabel}
            </span>
          )}
          <div className="w-32 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {canGoBack && (
            <button
              onClick={handleBack}
              className="text-xs text-[#9a9894] hover:text-gold-400 transition-colors whitespace-nowrap"
              title="Previous event"
            >
              ⏮ Prev
            </button>
          )}
          <button
            onClick={handleSkip}
            className="text-xs text-[#9a9894] hover:text-gold-400 transition-colors whitespace-nowrap"
            title="Skip to next event"
          >
            Skip ⏭
          </button>
          <div className="w-px h-4 bg-white/[0.1]" />
          <button
            onClick={handleEndJourney}
            className="text-xs text-[#9a9894] hover:text-red-400 transition-colors whitespace-nowrap"
            title="End journey"
          >
            End Journey
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
