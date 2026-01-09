import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Battery as BatteryIcon, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  AlertOctagon, 
  RefreshCw, 
  Edit2,
  Flame,      // Ikona pro EPS
  Lock,       // Ikona pro EZS
  Camera,     // Ikona pro CCTV
  Scan,       // Ikona pro SKV
  Box,        // Ikona pro Ostatní
  Filter,
  ChevronDown
} from 'lucide-react';
import { BuildingObject, BatteryStatus, Technology, TechType } from '../../types';

interface TechTabProps {
  technologies: BuildingObject['technologies'];
  onAddTech: () => void;
  onEditTech: (tech: Technology) => void;
  onRemoveTech: (id: string) => void;
  onAddBattery: (techId: string) => void;
  onRemoveBattery: (techId: string, batteryId: string) => void;
  onStatusChange: (techId: string, batteryId: string, newStatus: BatteryStatus) => void;
}

// --- POMOCNÉ KOMPONENTY PRO VZHLED ---

const StatusBadge: React.FC<{ status: BatteryStatus }> = ({ status }) => {
    const styles = { 
      [BatteryStatus.HEALTHY]: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400', 
      [BatteryStatus.WARNING]: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', 
      [BatteryStatus.CRITICAL]: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', 
      [BatteryStatus.REPLACED]: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' 
    };
    return <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${styles[status]}`}>{status}</span>;
};

const StatusButton: React.FC<{ 
  active: boolean, 
  colorClass: string, 
  icon: React.ReactNode, 
  label: string,
  onClick: () => void 
}> = ({ active, colorClass, icon, label, onClick }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    title={label}
    className={`p-1.5 rounded-lg transition-all flex-1 flex justify-center ${active ? colorClass + ' shadow-sm ring-1 ring-inset' : 'text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-4 h-4" })}
  </button>
);

// Helper pro získání ikony a barvy podle typu systému
const getTypeConfig = (typeStr: string) => {
    // Získáme klíčovou část (např. "EPS" z "EPS (Požární signalizace)")
    const key = typeStr.split(' ')[0]; 

    switch (key) {
        case 'EPS': return { icon: <Flame />, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' };
        case 'EZS': return { icon: <Lock />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' };
        case 'CCTV': return { icon: <Camera />, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' };
        case 'SKV': return { icon: <Scan />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
        default: return { icon: <Box />, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-slate-800' };
    }
};

export const TechTab: React.FC<TechTabProps> = ({ 
    technologies, 
    onAddTech, 
    onEditTech, 
    onRemoveTech, 
    onAddBattery, 
    onRemoveBattery, 
    onStatusChange 
}) => {
    // State pro aktivní filtr ('ALL' nebo konkrétní TechType string)
    const [activeFilter, setActiveFilter] = useState<string>('ALL');

    // 1. Seskupení technologií podle typu
    const groupedTechs = useMemo(() => {
        const groups: Record<string, Technology[]> = {};
        
        technologies.forEach(tech => {
            if (!groups[tech.type]) {
                groups[tech.type] = [];
            }
            groups[tech.type].push(tech);
        });
        
        return groups;
    }, [technologies]);

    // 2. Získání dostupných typů pro filtrovací tlačítka
    const availableTypes = Object.keys(groupedTechs);

    // 3. Filtrace skupin k zobrazení
    const visibleGroups = activeFilter === 'ALL' 
        ? availableTypes 
        : availableTypes.filter(t => t === activeFilter);

    return (
    <div className="space-y-8">
      
      {/* --- HEADER & FILTRY --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
          
          {/* Filtrovací lišta */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-2 md:pb-0">
              <div className="flex items-center text-gray-400 mr-2">
                  <Filter className="w-4 h-4 mr-1" />
                  <span className="text-xs font-bold uppercase tracking-widest">Filtr:</span>
              </div>
              
              <button 
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeFilter === 'ALL' 
                      ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                      : 'bg-white dark:bg-slate-900 text-slate-500 border border-gray-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
              >
                  Vše
              </button>

              {availableTypes.map(type => {
                  const shortName = type.split(' ')[0]; // Např. jen "EPS"
                  const config = getTypeConfig(type);
                  const isActive = activeFilter === type;
                  
                  return (
                    <button 
                        key={type}
                        onClick={() => setActiveFilter(type)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${
                            isActive 
                            ? `${config.bg} ${config.color} border-transparent ring-2 ring-current` 
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        {React.cloneElement(config.icon as React.ReactElement<any>, { className: "w-3 h-3" })}
                        {shortName}
                        <span className="ml-1 opacity-60 text-[9px]">({groupedTechs[type].length})</span>
                    </button>
                  );
              })}
          </div>

          <button onClick={onAddTech} className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline whitespace-nowrap">
            <Plus className="w-4 h-4" /> Přidat systém
          </button>
      </div>
      
      {technologies.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-slate-800">
              <Shield className="w-12 h-12 mx-auto text-gray-200 dark:text-slate-700 mb-2" />
              <p className="text-gray-400 dark:text-slate-500 font-bold">Zatím žádné technologie</p>
          </div>
      )}

      {/* --- VÝPIS PO KATEGORIÍCH --- */}
      <div className="space-y-10">
        {visibleGroups.map(type => {
            const techs = groupedTechs[type];
            const config = getTypeConfig(type);
            
            return (
                <div key={type} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    {/* HLAVIČKA KATEGORIE */}
                    <div className="flex items-center gap-3 mb-4 pl-2">
                        <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
                            {React.cloneElement(config.icon as React.ReactElement<any>, { className: "w-5 h-5" })}
                        </div>
                        <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight">
                            {type}
                        </h3>
                        <div className="h-px flex-1 bg-gray-200 dark:bg-slate-800 ml-4"></div>
                    </div>

                    {/* SEZNAM KARET V KATEGORII */}
                    <div className="space-y-4">
                        {techs.map(tech => (
                            <div key={tech.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                            
                            {/* HLAVIČKA KARTY TECHNOLOGIE */}
                            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl flex-shrink-0 ${config.bg} ${config.color}`}>
                                        {React.cloneElement(config.icon as React.ReactElement<any>, { className: "w-6 h-6" })}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight">{tech.name}</h3>
                                        
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {/* Zobrazení Podtypu (např. Ústředna) */}
                                            <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                                                {tech.deviceType || 'Zařízení'}
                                            </span>

                                            {/* Lokace */}
                                            <span className="text-sm text-gray-500 dark:text-slate-400 font-medium border-l border-gray-300 dark:border-slate-700 pl-2 ml-1">
                                                {tech.location}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ovládací tlačítka */}
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => onEditTech(tech)} 
                                        className="p-2 text-gray-400 hover:text-blue-600 transition"
                                        title="Upravit zařízení"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>

                                    <button 
                                        onClick={() => onRemoveTech(tech.id)} 
                                        className="p-2 text-gray-400 hover:text-red-500 transition"
                                        title="Smazat zařízení"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    
                                    <button 
                                        onClick={() => onAddBattery(tech.id)} 
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl font-bold text-xs shadow-sm hover:ring-2 hover:ring-blue-500/20 transition-all flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4 text-blue-500" /> Baterie
                                    </button>
                                </div>
                            </div>

                            {/* GRID BATERIÍ */}
                            <div className="p-6">
                                {tech.batteries.length === 0 ? (
                                    <p className="text-center py-2 text-gray-400 dark:text-slate-600 italic font-medium text-xs">Žádné evidované akumulátory.</p>
                                ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {tech.batteries.map(battery => (
                                    <div key={battery.id} className="relative p-5 rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-200 dark:hover:border-blue-900 transition-all group flex flex-col justify-between h-full">
                                        
                                        {/* Horní část karty baterie */}
                                        <div>
                                            <button 
                                                onClick={() => onRemoveBattery(tech.id, battery.id)}
                                                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                                                title="Smazat baterii"
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
                                            <div className="space-y-1 mb-4">
                                                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600">
                                                    Instalace: {new Date(battery.installDate).toLocaleDateString()}
                                                </p>
                                                <p className="text-[10px] font-black uppercase text-amber-500">
                                                    Výměna: {new Date(battery.nextReplacementDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tlačítka stavu baterie */}
                                        <div className="flex gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl mt-auto">
                                            <StatusButton 
                                            active={battery.status === BatteryStatus.HEALTHY}
                                            colorClass="bg-white dark:bg-slate-700 text-green-600 shadow-green-100 ring-green-100"
                                            icon={<CheckCircle />}
                                            label="V pořádku"
                                            onClick={() => onStatusChange(tech.id, battery.id, BatteryStatus.HEALTHY)}
                                            />
                                            <StatusButton 
                                            active={battery.status === BatteryStatus.WARNING}
                                            colorClass="bg-white dark:bg-slate-700 text-amber-500 shadow-amber-100 ring-amber-100"
                                            icon={<AlertTriangle />}
                                            label="Varování"
                                            onClick={() => onStatusChange(tech.id, battery.id, BatteryStatus.WARNING)}
                                            />
                                            <StatusButton 
                                            active={battery.status === BatteryStatus.CRITICAL}
                                            colorClass="bg-white dark:bg-slate-700 text-red-500 shadow-red-100 ring-red-100"
                                            icon={<AlertOctagon />}
                                            label="Kritický stav"
                                            onClick={() => onStatusChange(tech.id, battery.id, BatteryStatus.CRITICAL)}
                                            />
                                            <StatusButton 
                                            active={battery.status === BatteryStatus.REPLACED}
                                            colorClass="bg-white dark:bg-slate-700 text-blue-500 shadow-blue-100 ring-blue-100"
                                            icon={<RefreshCw />}
                                            label="Vyměněno"
                                            onClick={() => onStatusChange(tech.id, battery.id, BatteryStatus.REPLACED)}
                                            />
                                        </div>
                                    </div>
                                    ))}
                                </div>
                                )}
                            </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};