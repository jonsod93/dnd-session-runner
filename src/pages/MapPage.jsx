import { useEffect } from "react";
import { MapContainer, ImageOverlay } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Fix Leaflet's default marker icon path issue with Vite ────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ─── Map configuration ─────────────────────────────────────────────────────
// Adjust these values once you know your map image dimensions.
// bounds format: [[minY, minX], [maxY, maxX]]
// For a 2000×2800px image the defaults below work as-is.
const MAP_CONFIG = {
  // Path relative to /public — place your map image at: public/maps/campaign-map.jpg
  imageUrl: "/maps/campaign-map.jpg",

  // Must match your image's pixel dimensions (height × width)
  bounds: [
    [0, 0],
    [12960, 23040],
  ],

  // Initial view center [y, x] — center of the image by default
  center: [6480, 11520],

  zoom: 0,
  minZoom: -2,
  maxZoom: 3,
};

// ─── Helper: detect whether the map image exists ───────────────────────────
// react-leaflet's ImageOverlay doesn't expose load/error callbacks easily,
// so we show a permanent placement hint at the bottom of the viewport.
// Once the image is added, it will cover the dark background and the hint
// serves as a low-key reminder of the expected path.

function MapHint() {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <div className="bg-slate-900/80 border border-slate-700 text-slate-400 text-xs font-mono px-3 py-1.5 rounded backdrop-blur-sm">
        Map image:{" "}
        <span className="text-gold-400">public/maps/campaign-map.jpg</span>
      </div>
    </div>
  );
}

export default function MapPage() {
  // The nav is h-14 = 56px
  const mapHeight = "calc(100vh - 56px)";

  return (
    <div className="relative w-full" style={{ height: mapHeight }}>
      <MapContainer
        crs={L.CRS.Simple}
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl
        attributionControl={false}
      >
        <ImageOverlay
          url={MAP_CONFIG.imageUrl}
          bounds={MAP_CONFIG.bounds}
          opacity={1}
          zIndex={10}
        />
      </MapContainer>

      <MapHint />
    </div>
  );
}
