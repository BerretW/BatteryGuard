
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { BuildingObject, BatteryStatus } from '../types';

interface MapViewProps {
  objects: BuildingObject[];
}

const MapView: React.FC<MapViewProps> = ({ objects }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([49.8175, 15.473], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for objects
    objects.forEach((obj) => {
      if (obj.lat && obj.lng) {
        // Determine color based on worst battery status
        let statusColor = '#22c55e'; // Green
        const allBatteries = obj.technologies.flatMap(t => t.batteries);
        if (allBatteries.some(b => b.status === BatteryStatus.CRITICAL)) {
          statusColor = '#ef4444'; // Red
        } else if (allBatteries.some(b => b.status === BatteryStatus.WARNING)) {
          statusColor = '#f59e0b'; // Amber
        }

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${statusColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([obj.lat, obj.lng], { icon: customIcon }).addTo(map);
        
        const popupContent = document.createElement('div');
        popupContent.className = 'p-2 min-w-[150px]';
        popupContent.innerHTML = `
          <h4 class="font-bold text-gray-800">${obj.name}</h4>
          <p class="text-xs text-gray-500 mb-2">${obj.address}</p>
          <button class="w-full bg-blue-600 text-white py-1 px-2 rounded text-xs font-semibold hover:bg-blue-700 transition" id="popup-btn-${obj.id}">
            Zobrazit detail
          </button>
        `;

        marker.bindPopup(popupContent);
        
        marker.on('popupopen', () => {
          document.getElementById(`popup-btn-${obj.id}`)?.addEventListener('click', () => {
            navigate(`/object/${obj.id}`);
          });
        });
      }
    });

    return () => {
      // Clean up map instance on unmount
    };
  }, [objects, navigate]);

  return (
    <div className="h-full w-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mapa objektů</h2>
          <p className="text-sm text-gray-500">Geografický přehled stavu všech technologií.</p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span> V pořádku</div>
          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-500 mr-1"></span> Varování</div>
          <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span> Kritické</div>
        </div>
      </div>
      <div className="flex-1 bg-white p-2 rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
        <div ref={mapContainerRef} className="h-full w-full z-0" />
      </div>
    </div>
  );
};

export default MapView;
