// src/components/MapView.jsx
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issue in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const BASE_URL = "http://localhost:8000";

// Component to dynamically fetch and draw OSRM route, and animate bus based on real tracking data
function RealRoadRoute({ stops, routeId, busId, multiRoutes }) {
  // Define color schemes based on routeId
  const getRouteColors = (id) => {
    switch (id) {
      case 1: return { inner: '#0066ff', outer: '#001d66' }; // blue
      case 2: return { inner: '#ef4444', outer: '#7f1d1d' }; // red
      case 3: return { inner: '#16a34a', outer: '#064e3b' }; // dark green
      case 4: return { inner: '#eab308', outer: '#713f12' }; // yellow
      case 5: return { inner: '#f97316', outer: '#7c2d12' }; // orange
      case 6: return { inner: '#a855f7', outer: '#4c1d95' }; // purple
      case 7: return { inner: '#0ea5e9', outer: '#082f49' }; // sky blue
      default: return { inner: '#0066ff', outer: '#001d66' }; // fallback blue
    }
  };
  const routeColors = getRouteColors(routeId);

  const map = useMap();
  const [routeCoords, setRouteCoords] = useState([]);

  // Tracking state
  const [trackingActive, setTrackingActive] = useState(false);
  const [busPosition, setBusPosition] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const trackingInterval = useRef(null);
  const routeLegsRef = useRef([]); // To hold OSRM step legs for tracking interpolation

  // Custom icon for the moving bus
  const movingBusIcon = L.divIcon({
    className: 'custom-moving-bus',
    html: `<div style="font-size: 22px; display: flex; justify-content: center; align-items: center; background: white; border: 3px solid ${routeColors.inner}; border-radius: 50%; width: 36px; height: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">🚌</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  // Helper to find exact pos along a polyline
  const getPointAlongPolyline = (coords, fraction) => {
    if (!coords || coords.length === 0) return null;
    if (coords.length === 1) return coords[0];
    
    let totalDist = 0;
    const dists = [0];
    for (let i = 1; i < coords.length; i++) {
      const p1 = window.L.latLng(coords[i-1][0], coords[i-1][1]);
      const p2 = window.L.latLng(coords[i][0], coords[i][1]);
      const d = p1.distanceTo(p2);
      totalDist += d;
      dists.push(totalDist);
    }
    
    const targetDist = fraction * totalDist;
    for (let i = 1; i < coords.length; i++) {
      if (dists[i] >= targetDist) {
        const segLen = dists[i] - dists[i-1];
        const segFrac = segLen === 0 ? 0 : (targetDist - dists[i-1]) / segLen;
        const p1 = coords[i-1];
        const p2 = coords[i];
        return [
          p1[0] + segFrac * (p2[0] - p1[0]),
          p1[1] + segFrac * (p2[1] - p1[1])
        ];
      }
    }
    return coords[coords.length - 1];
  };

  // Poll tracking status from backend
  useEffect(() => {
    if (!busId) return;

    async function pollTracking() {
      try {
        const res = await fetch(`${BASE_URL}/admin/tracking-status/${busId}`);
        const data = await res.json();

        if (data.success && data.active && !data.arrived) {
          setTrackingActive(true);
          setTrackingInfo(data);
          
          // Use OSRM geometry if we have it
          if (routeLegsRef.current && routeLegsRef.current[data.leg_index]) {
            const legCoords = routeLegsRef.current[data.leg_index];
            const precisePos = getPointAlongPolyline(legCoords, data.fraction);
            if (precisePos) {
              setBusPosition(precisePos);
            }
          }
        } else if (data.arrived) {
          setTrackingActive(false);
          setTrackingInfo(null);
        } else {
          setTrackingActive(false);
          setBusPosition(null);
          setTrackingInfo(null);
        }
      } catch (err) {}
    }

    pollTracking();
    trackingInterval.current = setInterval(pollTracking, 2000);

    return () => {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
    };
  }, [busId]);

  // Fetch OSRM route
  useEffect(() => {
    setRouteCoords([]);

    if (!stops || stops.length < 2) {
      if (stops && stops.length === 1) {
        map.setView([stops[0].lat, stops[0].lng], 15);
      }
      return;
    }

    const abortController = new AbortController();
    const coordinatesString = stops.map(s => `${s.lng},${s.lat}`).join(';');
    // Add steps=true so we get geometry per leg between stops
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson&steps=true`;

    fetch(url, { signal: abortController.signal })
      .then(res => res.json())
      .then(data => {
        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoords(coords);
          
          if (data.routes[0].legs) {
            const parsedLegs = data.routes[0].legs.map(leg => {
              const legCoords = [];
              if (leg.steps) {
                leg.steps.forEach(step => {
                  if (step.geometry && step.geometry.coordinates) {
                    step.geometry.coordinates.forEach(c => legCoords.push([c[1], c[0]]));
                  }
                });
              }
              return legCoords;
            });
            routeLegsRef.current = parsedLegs;
          }

          const polyline = L.polyline(coords);
          if (!multiRoutes && !busId) {
            map.fitBounds(polyline.getBounds(), { padding: [15, 15] });
          }
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error("OSRM Routing Error:", err);
        if (!multiRoutes && !busId) {
          const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
          map.fitBounds(bounds, { padding: [15, 15] });
        }
      });

    return () => abortController.abort();
  }, [stops, map]);

  if (routeCoords.length === 0) {
    return (
      <Polyline 
        positions={stops.map(s => [s.lat, s.lng])} 
        color={routeColors.inner} 
        weight={6} 
        dashArray="5, 10" 
        opacity={0.8} 
      />
    );
  }

  return (
    <>
      <style>{`
        .custom-moving-bus {
          transition: transform 1.5s linear !important;
          z-index: 9999 !important;
        }
        .tracking-info-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
        }
      `}</style>
      {/* Outer border for high contrast */}
      <Polyline positions={routeCoords} color={routeColors.outer} weight={10} opacity={1} />
      {/* Inner vibrant color to cover the road */}
      <Polyline positions={routeCoords} color={routeColors.inner} weight={6} opacity={1} />
      
      {/* Bus Marker — positioned by real tracking data from backend */}
      {trackingActive && busPosition && (
        <Marker position={busPosition} icon={movingBusIcon}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '180px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: trackingInfo?.is_paused ? '#dc2626' : '#1e293b' }}>
                {trackingInfo?.is_paused ? `⛔ Paused (${trackingInfo.delay_mins}m delay)` : `🚌 Bus is En Route`}
              </div>
              {trackingInfo && (
                <>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    <strong>Direction:</strong> {trackingInfo.direction === 'to_college' ? 'Stop → College' : 'College → Stop'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    <strong>Between:</strong> {trackingInfo.from_stop} → {trackingInfo.to_stop}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    <strong>Elapsed:</strong> {trackingInfo.elapsed_mins?.toFixed(1)} / {trackingInfo.total_route_mins} mins
                  </div>
                  <div style={{ 
                    marginTop: '8px', background: '#f1f5f9', borderRadius: '6px', 
                    height: '6px', overflow: 'hidden' 
                  }}>
                    <div style={{ 
                      width: `${Math.min((trackingInfo.elapsed_mins / trackingInfo.total_route_mins) * 100, 100)}%`,
                      height: '100%',
                      background: trackingInfo?.is_paused ? '#dc2626' : 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                      borderRadius: '6px',
                      transition: 'width 1s ease'
                    }}></div>
                  </div>
                </>
              )}
            </div>
          </Popup>
          <Tooltip direction="top" offset={[0, -25]} permanent>
            <span style={{ fontWeight: 700, fontSize: '11px', color: trackingInfo?.is_paused ? '#dc2626' : '#4f46e5' }}>
              {trackingInfo?.is_paused ? `Paused: ${trackingInfo.delay_mins}m delay` : trackingInfo ? `${trackingInfo.from_stop} → ${trackingInfo.to_stop}` : 'Tracking...'}
            </span>
          </Tooltip>
        </Marker>
      )}

      {/* If no tracking active, show a note (no more fake cycling bus) */}
      {!trackingActive && !busPosition && null}
    </>
  );
}

const MapView = ({ stops = [], routeId = 1, busId, center = [8.8932, 76.6141], zoom = 13, tileUrl, height = '450px', multiRoutes }) => {
  const defaultTile = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  
  // Custom round marker for normal bus stops
  const normalStopIcon = L.divIcon({
    className: 'custom-stop-icon',
    html: `<div style="background-color: #ffffff; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #0050ff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  // Custom highlighted round marker for the student's pickup location
  const boardingStopIcon = L.divIcon({
    className: 'custom-boarding-icon',
    html: `<div style="background-color: #ffcc00; width: 20px; height: 20px; border-radius: 50%; border: 4px solid #ff0000; box-shadow: 0 0 12px rgba(255,0,0,0.6);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const routesToRender = multiRoutes ? multiRoutes : [{ routeId, busId, stops }];

  return (
    <div style={{ height: height, width: '100%', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl || defaultTile}
        />
        
        {/* Render all routes and their stops */}
        {routesToRender.map((r, routeIdx) => (
          <React.Fragment key={r.busId || r.routeId || routeIdx}>
            <RealRoadRoute stops={r.stops} routeId={r.routeId} busId={r.busId} multiRoutes={multiRoutes} />
            
            {r.stops.map((stop, index) => (
              <Marker 
                key={`${routeIdx}-${index}`} 
                position={[stop.lat, stop.lng]}
                icon={stop.isBoarding ? boardingStopIcon : normalStopIcon}
              >
                <Tooltip direction="top" offset={[0, -10]} className="custom-stop-tooltip" opacity={0.9}>
                  <span style={{ fontWeight: '600', fontSize: '11px', color: '#1e293b' }}>{stop.name}</span>
                </Tooltip>
                <Popup>
                  <strong>Step {index + 1}: {stop.name}</strong>
                  <br />
                  {stop.isBoarding ? <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Your Pickup Location</span> : 'Bus Stop'}
                </Popup>
              </Marker>
            ))}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
