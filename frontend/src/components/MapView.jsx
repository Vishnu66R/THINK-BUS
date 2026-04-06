// src/components/MapView.jsx
import React, { useEffect, useState } from 'react';
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

// Component to dynamically fetch and draw OSRM route, and fit bounds to it
function RealRoadRoute({ stops, routeId }) {
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
  const [busIndex, setBusIndex] = useState(0);

  // Custom icon for the moving bus
  const movingBusIcon = L.divIcon({
    className: 'custom-moving-bus',
    html: `<div style="font-size: 20px; display: flex; justify-content: center; align-items: center; background: white; border: 3px solid ${routeColors.inner}; border-radius: 50%; width: 32px; height: 32px; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">🚌</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  // Animate the bus along the polyline path smoothly
  useEffect(() => {
    if (routeCoords.length === 0) return;
    const interval = setInterval(() => {
      setBusIndex(prev => (prev + 1) % routeCoords.length);
    }, 800); // Increased speed: update every 0.8 seconds
    return () => clearInterval(interval);
  }, [routeCoords]);

  useEffect(() => {
    if (!stops || stops.length < 2) {
      if (stops && stops.length === 1) {
        map.setView([stops[0].lat, stops[0].lng], 15);
      }
      return;
    }

    // OSRM expects coordinates in lon,lat format separated by semicolons
    const coordinatesString = stops.map(s => `${s.lng},${s.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          // OSRM returns GeoJSON coordinates as [lon, lat], Leaflet uses [lat, lng]
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoords(coords);
          
          // Fit map to the actual route line bounds with much less padding to zoom in more
          const polyline = L.polyline(coords);
          map.fitBounds(polyline.getBounds(), { padding: [15, 15] });
        }
      })
      .catch(err => {
        console.error("OSRM Routing Error:", err);
        // Fallback: fit bounds to stops if API fails, also with tighter zoom
        const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [15, 15] });
      });
  }, [stops, map]);

  if (routeCoords.length === 0) {
    // Fallback straight lines while loading or if failed
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

  // Draw the real roads route line (Massive thickness for screenshots, covers the road)
  // Two polylines to create a highly visible bordered route effect
  return (
    <>
      <style>{`
        .custom-moving-bus {
          transition: transform 0.8s linear !important;
          z-index: 9999 !important;
        }
      `}</style>
      {/* Outer border for high contrast */}
      <Polyline positions={routeCoords} color={routeColors.outer} weight={10} opacity={1} />
      {/* Inner vibrant color to cover the road and pop */}
      <Polyline positions={routeCoords} color={routeColors.inner} weight={6} opacity={1} />
      
      {/* Real-time Simulated Moving Bus Marker */}
      <Marker position={routeCoords[busIndex]} icon={movingBusIcon}>
        <Popup>Bus is moving</Popup>
      </Marker>
    </>
  );
}

const MapView = ({ stops = [], routeId = 1, center = [8.8932, 76.6141], zoom = 13, tileUrl, height = '450px' }) => {
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

  return (
    <div style={{ height: height, width: '100%', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl || defaultTile}
        />
        
        {/* Handles bounds mapping and drawing the actual road route! */}
        <RealRoadRoute stops={stops} routeId={routeId} />

        {stops.map((stop, index) => (
          <Marker 
            key={index} 
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
      </MapContainer>
    </div>
  );
};

export default MapView;
