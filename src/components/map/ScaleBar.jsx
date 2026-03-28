import { useState, useEffect } from 'react'
import { useMap } from 'react-leaflet'

const MI_TO_KM = 1.60934
const NICE_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500]
const TARGET_MIN_PX = 80
const TARGET_MAX_PX = 200

export function ScaleBar({ pixelsPerMile }) {
  const map = useMap()
  const [barWidth, setBarWidth] = useState(0)
  const [label, setLabel] = useState('')

  useEffect(() => {
    function update() {
      // In CRS.Simple, zoom affects pixel scale: at zoom 0 it's 1:1,
      // each zoom level doubles the on-screen size
      const zoom = map.getZoom()
      const scale = Math.pow(2, zoom) // screen pixels per map pixel

      const screenPxPerMile = pixelsPerMile * scale

      // Find a nice step that gives a bar between TARGET_MIN_PX and TARGET_MAX_PX
      let bestStep = NICE_STEPS[0]
      for (const step of NICE_STEPS) {
        const width = step * screenPxPerMile
        if (width >= TARGET_MIN_PX && width <= TARGET_MAX_PX) {
          bestStep = step
          break
        }
        if (width > TARGET_MAX_PX) break
        bestStep = step
      }

      const width = bestStep * screenPxPerMile
      const km = bestStep * MI_TO_KM

      setBarWidth(Math.round(width))
      setLabel(`${bestStep} mi / ${km.toFixed(km >= 10 ? 0 : 1)} km`)
    }

    update()
    map.on('zoomend', update)
    return () => map.off('zoomend', update)
  }, [map, pixelsPerMile])

  if (barWidth <= 0) return null

  return (
    <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
      <div className="bg-[#252525]/90 rounded-lg border border-white/[0.1] shadow-lg px-3 py-2 inline-flex flex-col items-start gap-1">
        <span className="text-[10px] text-[#9a9894] font-mono">{label}</span>
        <div className="relative" style={{ width: barWidth, height: 6 }}>
          {/* Main bar line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/70" />
          {/* Left tick */}
          <div className="absolute top-0 left-0 w-px h-full bg-white/70" />
          {/* Right tick */}
          <div className="absolute top-0 right-0 w-px h-full bg-white/70" />
        </div>
      </div>
    </div>
  )
}
