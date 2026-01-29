// FILE: frontend/src/components/MapView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BuildingObject, BatteryStatus, ObjectGroup } from '../types';
import { Layers, Battery, Tag, Info } from 'lucide-react';

// Fix ikon pro Leaflet v Reactu
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  objects: BuildingObject[];
  groups: ObjectGroup[]; // <--- Přidáno props
}

type MapMode = 'STATUS' | 'GROUPS';

const MapView: React.FC<MapViewProps> = ({ objects, groups }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();
  
  // Stav pro přepínání režimu zobrazení
  const [mapMode, setMapMode] = useState<MapMode>('STATUS');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Inicializace mapy (pokud ještě neexistuje)
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([49.8175, 15.473], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // 2. Vyčištění existujících markerů před překreslením
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // 3. Vykreslení markerů
    objects.forEach((obj) => {
      if (obj.lat && obj.lng) {
        let markerColor = '#94a3b8'; // Default šedá

        // A) LOGIKA PRO STAV BATERIÍ
        if (mapMode === 'STATUS') {
            markerColor = '#22c55e'; // Green
            const allBatteries = obj.technologies.flatMap(t => t.batteries);
            if (allBatteries.some(b => b.status === BatteryStatus.CRITICAL)) {
              markerColor = '#ef4444'; // Red
            } else if (allBatteries.some(b => b.status === BatteryStatus.WARNING)) {
              markerColor = '#f59e0b'; // Amber
            }
        } 
        // B) LOGIKA PRO BARVY SKUPIN
        else if (mapMode === 'GROUPS') {
            const group = groups.find(g => g.id === obj.groupId);
            if (group && group.color) {
                markerColor = group.color;
            }
        }

        // Vytvoření HTML ikony
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: ${markerColor}; 
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([obj.lat, obj.lng], { icon: customIcon }).addTo(map);
        
        // Popup
        const popupContent = document.createElement('div');
        popupContent.className = 'p-2 min-w-[160px] text-center';
        
        const groupName = groups.find(g => g.id === obj.groupId)?.name || 'Bez skupiny';
        
        popupContent.innerHTML = `
          <h4 class="font-bold text-gray-800 text-sm mb-1">${obj.name}</h4>
          <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded text-white mb-2 inline-block" style="background-color: ${mapMode === 'GROUPS' ? markerColor : '#64748b'}">
            ${groupName}
          </span>
          <p class="text-xs text-gray-500 mb-3">${obj.address}</p>
          <button class="w-full bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-blue-700 transition" id="popup-btn-${obj.id}">
            Otevřít detail
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

  }, [objects, groups, mapMode, navigate]); // Důležité: useEffect se spustí při změně mapMode

  return (
    <div className="h-full w-full flex flex-col space-y-4 relative">
      
      {/* HLAVIČKA A OVLÁDÁNÍ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mapa objektů</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Geografický přehled sítě.</p>
        </div>

        {/* PŘEPÍNAČ REŽIMŮ */}
        <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex">
            <button 
                onClick={() => setMapMode('STATUS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    mapMode === 'STATUS' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
            >
                <Battery className="w-4 h-4" /> Stav baterií
            </button>
            <button 
                onClick={() => setMapMode('GROUPS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    mapMode === 'GROUPS' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
            >
                <Tag className="w-4 h-4" /> Zákazníci
            </button>
        </div>
      </div>

      {/* KONTEJNER MAPY */}
      <div className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden relative min-h-[500px]">
        <div ref={mapContainerRef} className="h-full w-full z-0 rounded-[1.5rem]" />
        
        {/* LEGENDA (Plovoucí) */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 max-w-[200px] max-h-[300px] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1">
                <Info className="w-3 h-3" /> Legenda
            </h4>
            
            <div className="space-y-2">
                {mapMode === 'STATUS' ? (
                    <>
                        <div className="flex items-center text-xs font-bold text-gray-700 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white mr-2 shadow-sm"></span> 
                            V pořádku
                        </div>
                        <div className="flex items-center text-xs font-bold text-gray-700 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-full bg-[#f59e0b] border-2 border-white mr-2 shadow-sm"></span> 
                            Varování / Blíží se
                        </div>
                        <div className="flex items-center text-xs font-bold text-gray-700 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-full bg-[#ef4444] border-2 border-white mr-2 shadow-sm"></span> 
                            Kritický stav
                        </div>
                        <div className="flex items-center text-xs font-bold text-gray-700 dark:text-slate-300">
                            <span className="w-3 h-3 rounded-full bg-[#94a3b8] border-2 border-white mr-2 shadow-sm"></span> 
                            Neznámý stav
                        </div>
                    </>
                ) : (
                    <>
                        {groups.map(group => (
                            <div key={group.id} className="flex items-center text-xs font-bold text-gray-700 dark:text-slate-300">
                                <span 
                                    className="w-3 h-3 rounded-full border-2 border-white mr-2 shadow-sm flex-shrink-0" 
                                    style={{ backgroundColor: group.color || '#94a3b8' }}
                                ></span> 
                                <span className="truncate">{group.name}</span>
                            </div>
                        ))}
                        {groups.length === 0 && (
                            <p className="text-xs text-gray-400 italic">Žádné definované skupiny</p>
                        )}
                        <div className="flex items-center text-xs font-bold text-gray-700 dark:text-slate-300 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                            <span className="w-3 h-3 rounded-full bg-[#94a3b8] border-2 border-white mr-2 shadow-sm"></span> 
                            Bez skupiny
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;