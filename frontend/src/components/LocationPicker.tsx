import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Check } from 'lucide-react';

interface LocationPickerProps {
  initialCoords?: [number, number]; // [lng, lat]
  onChange: (coords: [number, number]) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialCoords = [75.768, 31.224],
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [coords, setCoords] = useState<[number, number]>(initialCoords);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [coords[1], coords[0]],
      zoom: 15,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | RoadWatch GIS',
      maxZoom: 19,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'picker-pin',
      html: `
        <div style="background-color: #0284c7; width: 24px; height: 24px; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.35); transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center;">
          <div style="background: white; width: 6px; height: 6px; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [24, 24],
    });

    const marker = L.marker([coords[1], coords[0]], { icon: pinIcon, draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const newCoords: [number, number] = [Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))];
      setCoords(newCoords);
      onChange(newCoords);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const newCoords: [number, number] = [Number(e.latlng.lng.toFixed(6)), Number(e.latlng.lat.toFixed(6))];
      marker.setLatLng([newCoords[1], newCoords[0]]);
      setCoords(newCoords);
      onChange(newCoords);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const newCoords: [number, number] = [
          Number(pos.coords.longitude.toFixed(6)),
          Number(pos.coords.latitude.toFixed(6)),
        ];
        setCoords(newCoords);
        onChange(newCoords);

        if (mapRef.current && markerRef.current) {
          mapRef.current.flyTo([newCoords[1], newCoords[0]], 16);
          markerRef.current.setLatLng([newCoords[1], newCoords[0]]);
        }
      },
      () => {
        setLocating(false);
        alert('Could not retrieve your location. Please click on the map to place the pin.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Pinpoint Defect Location on Map
        </label>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
        >
          <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          {locating ? 'Locating...' : 'Use My GPS'}
        </button>
      </div>

      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-300 shadow-sm">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
          <span>
            Coordinates: <span className="font-mono font-bold text-slate-900">{coords[1].toFixed(5)}° N, {coords[0].toFixed(5)}° E</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Click or drag pin to adjust</span>
      </div>
    </div>
  );
};
