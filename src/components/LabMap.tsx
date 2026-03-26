'use client';

import { useEffect, useRef } from 'react';

export interface MapLab {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  test_categories: string[] | null;
}

interface Props {
  labs: MapLab[];
}

// Category pill colours for map popups
const CAT_COLOURS: Record<string, string> = {
  biomarker: '#0e393d',
  clinical_assessment: '#1a5055',
  bio_age: '#8a6a3e',
  genetic: '#4a5568',
  microbiome: '#2d6a4f',
  wearable: '#553c9a',
};

const CAT_LABELS: Record<string, string> = {
  biomarker: 'Blood Markers',
  clinical_assessment: 'Clinical Assessment',
  bio_age: 'Epigenetic Clock',
  genetic: 'Genetic',
  microbiome: 'Microbiome',
  wearable: 'Wearable',
};

export default function LabMap({ labs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || labs.length === 0) return;

    // Dynamically import Leaflet (browser only)
    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix default marker icon path issues with bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Create custom teal marker
      const tealIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;background:#0e393d;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -12],
      });

      // Calculate bounds
      const lats = labs.map((l) => l.latitude);
      const lngs = labs.map((l) => l.longitude);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      const map = L.map(containerRef.current!, { zoomControl: true, scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Add markers
      labs.forEach((lab) => {
        const catPills = (lab.test_categories ?? [])
          .map((c) => `<span style="display:inline-block;background:${CAT_COLOURS[c] ?? '#666'};color:white;font-size:10px;padding:2px 6px;border-radius:99px;margin:1px 2px 1px 0">${CAT_LABELS[c] ?? c}</span>`)
          .join('');

        const popupHtml = `
          <div style="min-width:180px;max-width:240px;font-family:inherit">
            <p style="font-weight:600;color:#0e393d;margin:0 0 4px 0;font-size:13px">${lab.name}</p>
            ${lab.city ? `<p style="color:#666;font-size:11px;margin:0 0 6px 0">${[lab.address, lab.city].filter(Boolean).join(', ')}</p>` : ''}
            <div>${catPills}</div>
          </div>`;

        L.marker([lab.latitude, lab.longitude], { icon: tealIcon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 260 });
      });

      // Fit to markers if multiple, else set center + zoom
      if (labs.length === 1) {
        map.setView([centerLat, centerLng], 13);
      } else {
        const bounds = L.latLngBounds(labs.map((l) => [l.latitude, l.longitude]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} className="w-full h-full" />
    </>
  );
}
