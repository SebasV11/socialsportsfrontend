import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

export interface LocationData {
  displayName: string;
  city?: string;
  address?: string;
}

interface Props {
  lat?: number;
  lng?: number;
  onLocationSelect?: (lat: number, lng: number, data: LocationData) => void;
  readOnly?: boolean;
}

const ICON_OPTIONS = {
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  shadowSize: [41, 41] as [number, number],
};

function parseNominatimAddress(data: { display_name?: string; address?: Record<string, string> }): LocationData {
  const addr = data.address ?? {};
  const city = addr.city ?? addr.municipality ?? addr.town ?? addr.village ?? addr.hamlet;
  const road = addr.road ?? addr.pedestrian ?? addr.park ?? addr.leisure;
  const houseNumber = addr.house_number;
  const address = road ? (houseNumber ? `${road} ${houseNumber}` : road) : undefined;
  return { displayName: data.display_name ?? '', city, address };
}

export default function LocationMapClient({ lat, lng, onLocationSelect, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const icon = L.icon(ICON_OPTIONS);
      const center: [number, number] = lat && lng ? [lat, lng] : [52.3676, 4.9041];
      const zoom = lat && lng ? 14 : 7;

      const map = L.map(containerRef.current).setView(center, zoom);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
      }

      if (!readOnly) {
        map.on('click', async (e) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;

          if (markerRef.current) {
            markerRef.current.setLatLng([clickLat, clickLng]);
          } else {
            markerRef.current = L.marker([clickLat, clickLng], { icon }).addTo(map);
          }

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${clickLat}&lon=${clickLng}&format=json&accept-language=nl`,
              { headers: { 'Accept-Language': 'nl' } }
            );
            const data = await res.json();
            onLocationSelect?.(clickLat, clickLng, parseNominatimAddress(data));
          } catch {
            onLocationSelect?.(clickLat, clickLng, { displayName: '' });
          }
        });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;
      const icon = L.icon(ICON_OPTIONS);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
      }
      mapRef.current.setView([lat, lng], 14);
    });
  }, [lat, lng]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query || !mapRef.current) return;

    setSearching(true);
    setSearchError('');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=nl&countrycodes=nl,be`,
        { headers: { 'Accept-Language': 'nl' } }
      );
      const results: Array<{ lat: string; lon: string; display_name: string; address?: Record<string, string> }> = await res.json();

      if (!results.length) {
        setSearchError('Locatie niet gevonden. Probeer een andere zoekterm.');
        return;
      }

      const { lat: resultLat, lon: resultLng, display_name, address } = results[0];
      const numLat = parseFloat(resultLat);
      const numLng = parseFloat(resultLng);

      import('leaflet').then((L) => {
        if (!mapRef.current) return;
        const icon = L.icon(ICON_OPTIONS);

        if (markerRef.current) {
          markerRef.current.setLatLng([numLat, numLng]);
        } else {
          markerRef.current = L.marker([numLat, numLng], { icon }).addTo(mapRef.current);
        }
        mapRef.current.setView([numLat, numLng], 15);
        onLocationSelect?.(numLat, numLng, parseNominatimAddress({ display_name, address }));
      });
    } catch {
      setSearchError('Zoeken mislukt. Controleer je verbinding.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
              placeholder="Zoek een locatie of sportcomplex..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-emerald-200 focus:ring"
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching || !searchQuery.trim()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {searching ? '...' : 'Zoeken'}
            </button>
          </div>
          {searchError && <p className="text-xs text-red-600">{searchError}</p>}
        </div>
      )}
      <div
        ref={containerRef}
        className={`w-full overflow-hidden rounded-xl border border-gray-200 ${readOnly ? 'h-44' : 'h-52'}`}
      />
      {!readOnly && (
        <p className="text-xs text-gray-400">Zoek een locatie of klik op de kaart om de pin te plaatsen.</p>
      )}
    </div>
  );
}
