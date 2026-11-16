import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Complaint, Road } from '../types';

interface MapViewProps {
  complaints?: Complaint[];
  roads?: Road[];
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  height?: string;
  onMarkerClick?: (complaint: Complaint) => void;
  onMapClick?: (coords: [number, number]) => void;
  selectedCoords?: [number, number] | null; // [lng, lat]
  showHeatmap?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  complaints = [],
  roads = [],
  center = [31.224, 75.768],
  zoom = 13,
  height = '500px',
  onMarkerClick,
  onMapClick,
  selectedCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const roadsLayerRef = useRef<L.LayerGroup | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | RoadWatch Civic GIS',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    roadsLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Listen for map clicks
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick([e.latlng.lng, e.latlng.lat]);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update selectedCoords pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedCoords) {
      const [lng, lat] = selectedCoords;
      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const pinIcon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color: #0284c7; width: 22px; height: 22px; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); animation: bounce 1s infinite;"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        clickMarkerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      }
      map.panTo([lat, lng]);
    } else if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }
  }, [selectedCoords]);

  // Update Road Segments
  useEffect(() => {
    const layer = roadsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    roads.forEach((r) => {
      if (r.geometry && r.geometry.type === 'LineString') {
        const latLngs = r.geometry.coordinates.map((c) => [c[1], c[0]] as [number, number]);
        const roadColor = r.road_type === 'HIGHWAY' ? '#e11d48' : r.road_type === 'ARTERIAL' ? '#ea580c' : '#3b82f6';
        const polyline = L.polyline(latLngs, {
          color: roadColor,
          weight: 4,
          opacity: 0.7,
        });
        polyline.bindTooltip(`<b>${r.name}</b> (${r.road_type})`, { sticky: true });
        layer.addLayer(polyline);
      }
    });
  }, [roads]);

  // Update Complaint Markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    complaints.forEach((c) => {
      if (!c.location?.coordinates) return;
      const [lng, lat] = c.location.coordinates;

      const isResolved = c.status === 'RESOLVED';
      const sev = c.citizen_severity || 'MEDIUM';
      const pinColor = isResolved
        ? '#10b981'
        : sev === 'CRITICAL'
        ? '#e11d48'
        : sev === 'HIGH'
        ? '#ea580c'
        : sev === 'MEDIUM'
        ? '#d97706'
        : '#0284c7';

      const icon = L.divIcon({
        className: 'marker-icon',
        html: `
          <div style="background-color: ${pinColor}; width: 16px; height: 16px; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.35);"></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([lat, lng], { icon });

      // Interactive Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-800 text-xs';
      popupContent.innerHTML = `
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${c.public_reference}</div>
        <div style="color: #64748b; margin-bottom: 4px;">${c.category.replace(/_/g, ' ')} &bull; ${c.status.replace(/_/g, ' ')}</div>
        <div style="font-size: 11px; margin-bottom: 6px; line-height: 1.3;">${c.description.slice(0, 80)}...</div>
        <button id="view-btn-${c.id}" style="width: 100%; padding: 4px 8px; background: #0284c7; color: white; border-radius: 4px; border: none; cursor: pointer; font-weight: 600;">
          View Details &rarr;
        </button>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-btn-${c.id}`);
        if (btn && onMarkerClick) {
          btn.onclick = () => onMarkerClick(c);
        }
      });

      layer.addLayer(marker);
    });
  }, [complaints, onMarkerClick]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
