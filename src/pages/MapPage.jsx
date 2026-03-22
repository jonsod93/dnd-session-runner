import { useState, useCallback } from 'react'
import { MapContainer, ImageOverlay, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { usePOIs } from '../hooks/usePOIs'
import { POIMarker } from '../components/map/POIMarker'
import { POIEditor } from '../components/map/POIEditor'

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
  zoom: 0,
  minZoom: -2,
  maxZoom: 3,
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

function MapHint() {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <div className="bg-slate-900/80 border border-slate-700 text-slate-400 text-xs font-mono px-3 py-1.5 rounded backdrop-blur-sm">
        Map image:{' '}
        <span className="text-gold-400">public/maps/campaign-map.jpg</span>
      </div>
    </div>
  )
}

export default function MapPage() {
  const mapHeight = 'calc(100vh - 48px)'
  const { pois, addPOI, updatePOI, removePOI } = usePOIs()

  const [editorState, setEditorState] = useState(null) // null | { position } | { poi }

  const handleRightClick = useCallback((position) => {
    setEditorState({ position })
  }, [])

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

  return (
    <div className="relative w-full" style={{ height: mapHeight }}>
      <MapContainer
        crs={L.CRS.Simple}
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
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

        <MapClickHandler onRightClick={handleRightClick} />

        {pois.map((poi) => (
          <POIMarker
            key={poi.id}
            poi={poi}
            onEdit={handleEdit}
            onRemove={removePOI}
          />
        ))}
      </MapContainer>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <div className="bg-[#252525]/90 text-[#787774] text-[10px] px-3 py-1.5 rounded-lg border border-white/[0.1] shadow-lg">
          {pois.length} point{pois.length !== 1 ? 's' : ''} of interest
          <span className="block text-[9px] mt-0.5 text-[#787774]/60">Right-click map to add</span>
        </div>
      </div>

      <MapHint />

      {/* ── POI Editor Modal ────────────────────────────────────────────── */}
      {editorState && (
        <POIEditor
          poi={editorState.poi ?? null}
          position={editorState.position ?? null}
          onSave={handleSave}
          onCancel={() => setEditorState(null)}
        />
      )}
    </div>
  )
}
