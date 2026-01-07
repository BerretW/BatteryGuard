import React from 'react';
import { Shield, Plus, Trash2, Battery as BatteryIcon, X } from 'lucide-react';
import { BuildingObject, BatteryStatus } from '../../types';

interface TechTabProps {
  technologies: BuildingObject['technologies'];
  onAddTech: () => void;
  onRemoveTech: (id: string) => void;
  onAddBattery: (techId: string) => void;
  onRemoveBattery: (techId: string, batteryId: string) => void;
}

const StatusBadge: React.FC<{ status: BatteryStatus }> = ({ status }) => {
    const styles = { 
      [BatteryStatus.HEALTHY]: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400', 
      [BatteryStatus.WARNING]: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', 
      [BatteryStatus.CRITICAL]: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', 
      [BatteryStatus.REPLACED]: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' 
    };
    return <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${styles[status]}`}>{status}</span>;
};

export const TechTab: React.FC<TechTabProps> = ({ technologies, onAddTech, onRemoveTech, onAddBattery, onRemoveBattery }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Seznam systémů</h3>
          <button onClick={onAddTech} className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline">
            <Plus className="w-4 h-4" /> Přidat systém
          </button>
      </div>
      
      {technologies.length === 0 && (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-gray-200 dark:border-slate-800">
              <Shield className="w-12 h-12 mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 font-bold">Zatím žádné technologie</p>
          </div>
      )}

      {technologies.map(tech => (
        <div key={tech.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl"><Shield className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight">{tech.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{tech.type}</span>
                    <span className="text-sm text-gray-500 dark:text-slate-400 font-medium">{tech.location}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onRemoveTech(tech.id)} className="p-2 text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => onAddBattery(tech.id)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl font-bold text-xs shadow-sm hover:ring-2 hover:ring-blue-500/20 transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" /> Baterie
              </button>
            </div>
          </div>
          <div className="p-6">
            {tech.batteries.length === 0 ? (
              <p className="text-center py-4 text-gray-400 dark:text-slate-600 italic font-medium text-xs">Žádné evidované akumulátory.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tech.batteries.map(battery => (
                  <div key={battery.id} className="relative p-5 rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-200 dark:hover:border-blue-900 transition-all group">
                    <button 
                      onClick={() => onRemoveBattery(tech.id, battery.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-2">
                        <BatteryIcon className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                        <span className="font-black text-gray-800 dark:text-slate-200">{battery.capacityAh}Ah / {battery.voltageV}V</span>
                      </div>
                      <StatusBadge status={battery.status} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600">Instalace: {new Date(battery.installDate).toLocaleDateString()}</p>
                      <p className="text-[10px] font-black uppercase text-amber-500">Výměna: {new Date(battery.nextReplacementDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};