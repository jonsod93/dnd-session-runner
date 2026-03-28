import { useState, useCallback, useEffect, useRef } from 'react'
import { MapContainer, ImageOverlay, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { usePOIs } from '../hooks/usePOIs'
import { useTravelPath } from '../hooks/useTravelPath'
import { POIMarker } from '../components/map/POIMarker'
import { POIEditor } from '../components/map/POIEditor'
import { TravelPath } from '../components/map/TravelPath'
import { JourneyPlayback } from '../components/map/JourneyPlayback'
import { TravelPathEditor } from '../components/map/TravelPathEditor'
import { MeasurementOverlay } from '../components/map/MeasurementOverlay'
import { ScaleBar } from '../components/map/ScaleBar'

// ─── Fix Leaflet's default marker icon path issue with Vite ────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ─── Map configuration ─────────────────────────────────────────────────────
const MAP_CONFIG = {
  imageUrl: '/maps/campaign-map.jpg',
  bounds: [
    [0, 0],
    [12960, 23040],
  ],
  center: [6480, 11520],
  zoom: -3,
  minZoom: -4,
  maxZoom: 0,
  pixelsPerMile: 6.533,
}

// ─── Right-click handler component ──────────────────────────────────────────
function MapClickHandler({ onRightClick }) {
  useMapEvents({
    contextmenu(e) {
      L.DomEvent.preventDefault(e)
      onRightClick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

// Module-level: survives navigation but resets on page refresh
let savedView = null

function MapViewRestorer() {
  const map = useMap()

  // Continuously track the view so we always have a valid saved position,
  // avoiding the need to call map.getCenter() during cleanup (which crashes
  // if the Leaflet DOM has already been torn down).
  useEffect(() => {
    if (savedView) {
      map.setView(savedView.center, savedView.zoom, { animate: false })
    }

    const trackView = () => {
      try {
        savedView = { center: map.getCenter(), zoom: map.getZoom() }
      } catch {
        // Leaflet DOM already gone - keep whatever we last saved
      }
    }

    map.on('moveend zoomend', trackView)
    return () => {
      map.off('moveend zoomend', trackView)
    }
  }, [map])
  return null
}

export default function MapPage() {
  const mapHeight = 'calc(100vh - 48px)'
  const { pois, addPOI, updatePOI, removePOI } = usePOIs()
  const { waypoints, addWaypoint, updateWaypoint, removeWaypoint, reorderWaypoints } = useTravelPath()

  const [editorState, setEditorState] = useState(null) // null | { position } | { poi }
  const [showTravelPath, setShowTravelPath] = useState(false)
  const [editingPath, setEditingPath] = useState(false)
  const [showPathEditor, setShowPathEditor] = useState(false)
  const [journeyPlaying, setJourneyPlaying] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const measureRef = useRef(null)

  const handleRightClick = useCallback((position) => {
    if (editingPath) {
      addWaypoint({ position, type: 'travel', label: '', customText: '', linkedPoiId: null, session: null, teleport: false })
    } else {
      setEditorState({ position })
    }
  }, [editingPath, addWaypoint])

  const handleEdit = useCallback((poi) => {
    setEditorState({ poi })
  }, [])

  const handleSave = useCallback(
    (data) => {
      if (editorState?.poi?.id) {
        updatePOI(editorState.poi.id, data)
      } else {
        addPOI(data)
      }
      setEditorState(null)
    },
    [editorState, addPOI, updatePOI]
  )

  const handleStopJourney = useCallback(() => {
    setJourneyPlaying(false)
  }, [])

  return (
    <div className="relative w-full" style={{ height: mapHeight }}>
      <MapContainer
        crs={L.CRS.Simple}
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        maxBounds={MAP_CONFIG.bounds}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
        zoomControl
        attributionControl={false}
      >
        <ImageOverlay
          url={MAP_CONFIG.imageUrl}
          bounds={MAP_CONFIG.bounds}
          opacity={1}
          zIndex={10}
        />

        <MapViewRestorer />
        <MapClickHandler onRightClick={handleRightClick} />

        {!editingPath && !measuring && pois.map((poi) => (
          <POIMarker
            key={poi.id}
            poi={poi}
            onEdit={handleEdit}
            onRemove={removePOI}
          />
        ))}

        {/* Travel path overlay */}
        <TravelPath
          waypoints={waypoints}
          visible={showTravelPath && !journeyPlaying}
          editing={editingPath}
        />

        {/* Journey playback */}
        <JourneyPlayback
          waypoints={waypoints}
          playing={journeyPlaying}
          onStop={handleStopJourney}
          pois={pois}
        />

        {/* Measurement overlay */}
        <MeasurementOverlay
          ref={measureRef}
          active={measuring}
          pixelsPerMile={MAP_CONFIG.pixelsPerMile}
        />

        {/* Scale bar (visible when measuring) */}
        {measuring && <ScaleBar pixelsPerMile={MAP_CONFIG.pixelsPerMile} />}
      </MapContainer>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {!journeyPlaying && (
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <div className="bg-[#252525]/90 text-[#9a9894] text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] shadow-lg">
            {pois.length} point{pois.length !== 1 ? 's' : ''} of interest
            <span className="block text-[10px] mt-0.5 text-[#9a9894]/60">Right-click map to add</span>
          </div>

          {/* Travel path controls - compact 2-column layout */}
          <div className="bg-[#252525]/90 rounded-lg border border-white/[0.1] shadow-lg overflow-hidden">
            <div className="grid grid-cols-2">
              {/* Toggle path visibility */}
              <button
                onClick={() => setShowTravelPath(!showTravelPath)}
                className={[
                  'text-xs px-3 py-1.5 transition-colors text-left',
                  showTravelPath ? 'text-gold-400' : 'text-[#9a9894] hover:text-[#e6e6e6]',
                ].join(' ')}
              >
                {showTravelPath ? '◉' : '○'} Path
              </button>

              {/* Edit path toggle */}
              <button
                onClick={() => {
                  setEditingPath(!editingPath)
                  if (!editingPath) setShowTravelPath(true)
                }}
                className={[
                  'text-xs px-3 py-1.5 transition-colors text-left border-l border-white/[0.06]',
                  editingPath ? 'text-gold-400' : 'text-[#9a9894] hover:text-[#e6e6e6]',
                ].join(' ')}
              >
                {editingPath ? '✎ Editing...' : '✎ Edit'}
              </button>
            </div>

            {(showTravelPath && waypoints.length >= 2 || editingPath) && (
              <div className="grid grid-cols-2 border-t border-white/[0.06]">
                {showTravelPath && waypoints.length >= 2 ? (
                  <button
                    onClick={() => setJourneyPlaying(true)}
                    disabled={journeyPlaying}
                    className="text-xs px-3 py-1.5 text-[#9a9894] hover:text-gold-400 disabled:opacity-30 transition-colors text-left"
                  >
                    ▶ Journey
                  </button>
                ) : <span />}

                {editingPath ? (
                  <button
                    onClick={() => setShowPathEditor(true)}
                    className="text-xs px-3 py-1.5 text-[#9a9894] hover:text-[#e6e6e6] transition-colors text-left border-l border-white/[0.06]"
                  >
                    ≡ Waypoints ({waypoints.length})
                  </button>
                ) : <span />}
              </div>
            )}
          </div>

          {/* Measurement controls */}
          <div className="bg-[#252525]/90 rounded-lg border border-white/[0.1] shadow-lg overflow-hidden">
            <div className="grid grid-cols-2">
              <button
                onClick={() => setMeasuring(!measuring)}
                className={[
                  'text-xs px-3 py-1.5 transition-colors text-left',
                  measuring ? 'text-gold-400' : 'text-[#9a9894] hover:text-[#e6e6e6]',
                ].join(' ')}
              >
                {measuring ? '◉' : '○'} Measure
              </button>
              <button
                onClick={() => measureRef.current?.clear()}
                disabled={!measuring}
                className="text-xs px-3 py-1.5 text-[#9a9894] hover:text-[#e6e6e6] disabled:opacity-30 transition-colors text-left border-l border-white/[0.06]"
              >
                ✕ Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing mode indicator */}
      {editingPath && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-black/80 border border-slate-600 text-white text-xs font-mono px-3 py-1.5 rounded backdrop-blur-sm">
            Path editing mode - right-click to add waypoints
          </div>
        </div>
      )}


      {/* ── POI Editor Modal ────────────────────────────────────────────── */}
      {editorState && (
        <POIEditor
          poi={editorState.poi ?? null}
          position={editorState.position ?? null}
          onSave={handleSave}
          onCancel={() => setEditorState(null)}
        />
      )}

      {/* ── Travel Path Editor Modal ────────────────────────────────────── */}
      {showPathEditor && (
        <TravelPathEditor
          waypoints={waypoints}
          pois={pois}
          onAdd={addWaypoint}
          onUpdate={updateWaypoint}
          onRemove={removeWaypoint}
          onReorder={reorderWaypoints}
          onClose={() => setShowPathEditor(false)}
        />
      )}
    </div>
  )
}
