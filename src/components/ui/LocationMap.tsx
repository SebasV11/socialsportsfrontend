'use client';

import dynamic from 'next/dynamic';
import type { LocationData } from './LocationMapClient';

const LocationMapClient = dynamic(() => import('./LocationMapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-52 w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
      <p className="text-sm text-gray-400">Kaart laden...</p>
    </div>
  ),
});

export type { LocationData };

interface LocationMapProps {
  lat?: number;
  lng?: number;
  onLocationSelect?: (lat: number, lng: number, data: LocationData) => void;
  readOnly?: boolean;
}

export default function LocationMap(props: LocationMapProps) {
  return <LocationMapClient {...props} />;
}
