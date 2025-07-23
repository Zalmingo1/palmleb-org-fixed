'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icon
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background-color: #1a365d;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid #d4af37;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    ">L</div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

interface LodgeMapProps {
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  onMapClick?: (lat: number, lng: number) => void;
  isEditable?: boolean;
}

export default function LodgeMap({ location, coordinates, onMapClick, isEditable = false }: LodgeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [coordinates?.lat || 33.8938, coordinates?.lng || 35.5018],
        zoom: 13,
        zoomControl: true
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      mapRef.current = map;
      setIsMapInitialized(true);

      // Add click handler if map is editable
      if (isEditable && onMapClick) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          onMapClick(lat, lng);
        });
      }

      // Add marker if coordinates are provided
      if (coordinates) {
        const marker = L.marker([coordinates.lat, coordinates.lng], {
          icon: customIcon,
          riseOnHover: true
        }).addTo(map);
        
        // Add popup with coordinates
        marker.bindPopup(`
          <div class="text-sm">
            <strong>Location:</strong> ${location || 'Not specified'}<br>
            <strong>Coordinates:</strong><br>
            Lat: ${coordinates.lat.toFixed(6)}<br>
            Lng: ${coordinates.lng.toFixed(6)}
          </div>
        `);
        
        markerRef.current = marker;
      }

      // Cleanup function
      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
          setIsMapInitialized(false);
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [coordinates, isEditable, onMapClick, location]);

  // Update marker position when coordinates change
  useEffect(() => {
    if (!isMapInitialized || !mapRef.current || !markerRef.current || !coordinates) return;

    try {
      markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
    } catch (error) {
      console.error('Error updating marker position:', error);
    }
  }, [coordinates, isMapInitialized]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-[400px] rounded-lg shadow-sm"
      style={{ position: 'relative' }}
    />
  );
} 