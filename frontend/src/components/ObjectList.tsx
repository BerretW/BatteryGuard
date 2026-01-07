
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Added X to the lucide-react imports
import { Building2, Search, Plus, MapPin, ChevronRight, Filter, Users, FileText, X } from 'lucide-react';
import { BuildingObject, ObjectGroup } from '../types';
import { dataStore } from '../services/dataStore';

interface ObjectListProps {
  objects: BuildingObject[];
  setObjects: (objects: BuildingObject[]) => void;
}

const ObjectList: React.FC<ObjectListProps> = ({ objects, setObjects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [groups, setGroups] = useState<ObjectGroup[]>([]);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setGroups(dataStore.getGroups());
  }, []);

  const filteredObjects = objects.filter(obj => {
    const matchesSearch = obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         obj.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroupId === 'all' || obj.groupId === selectedGroupId;
    return matchesSearch && matchesGroup;
  });

  const addObject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newObj: BuildingObject = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      description: formData.get('description') as string,
      internalNotes: formData.get('internalNotes') as string,
      groupId: formData.get('groupId') as string || undefined,
      lat: Number(formData.get('lat')) || undefined,
      lng: Number(formData.get('lng')) || undefined,
      technologies: [],
      logEntries: [],
      scheduledEvents: [],
      contacts: []
    };
    setObjects([...objects, newObj]);
    setAddModalOpen(false);
  };

  const getGroupName = (id?: string) => {
    return groups.find(g => g.id === id)?.name || "Bez skupiny";
  };

  const getGroupColor = (id?: string) => {
    return groups.find(g => g.id === id)?.color || "#94a3b8";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Hledat objekt..." 
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-white dark:bg-slate-900 dark:text-white transition shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          <Filter className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
          <button 
            onClick={() => setSelectedGroupId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${selectedGroupId === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-800 hover:border-blue-300'}`}
          >
            Všechny objekty
          </button>
          {groups.map(group => (
            <button 
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-2 ${selectedGroupId === group.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-800 hover:border-blue-300'}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }}></span>
              {group.name}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setAddModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-5 py-3 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap font-bold"
        >
          <Plus className="w-5 h-5" />
          <span>Přidat objekt</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredObjects.map((obj) => (
          <div 
            key={obj.id} 
            className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:shadow-blue-900/10 transition-all cursor-pointer overflow-hidden group flex flex-col active:scale-[0.98]"
            onClick={() => navigate(`/object/${obj.id}`)}
          >
            <div className="p-6 pb-4 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                {obj.groupId && (
                  <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full text-white shadow-sm" style={{ backgroundColor: getGroupColor(obj.groupId) }}>
                    {getGroupName(obj.groupId)}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2 leading-tight group-hover:text-blue-600 transition-colors">{obj.name}</h3>
              <div className="flex items-start text-sm text-gray-500 dark:text-slate-400 mb-4">
                <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{obj.address}</span>
              </div>
              
              <div className="flex gap-4 mt-auto">
                <div className="flex items-center text-xs font-bold text-slate-400 dark:text-slate-500">
                  <Users className="w-3.5 h-3.5 mr-1" />
                  {obj.contacts?.length || 0}
                </div>
                {obj.internalNotes && (
                   <div className="flex items-center text-xs font-bold text-slate-400 dark:text-slate-500">
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Poznámka
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-950/20 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                {obj.technologies.length} technologie
              </span>
              <span className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest flex items-center">
                Detail <ChevronRight className="w-4 h-4 ml-0.5" />
              </span>
            </div>
          </div>
        ))}
        {filteredObjects.length === 0 && (
          <div className="col-span-full py-24 text-center bg-gray-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border-4 border-dashed border-gray-100 dark:border-slate-800">
            <Building2 className="w-16 h-16 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 dark:text-slate-400">Nebyly nalezeny žádné objekty</h3>
            <p className="text-gray-400 dark:text-slate-500 mt-2">Zkuste upravit filtry nebo hledaný výraz.</p>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 overflow-y-auto max-h-[90vh] border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Nový objekt</h2>
              <button onClick={() => setAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={addObject} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Název objektu</label>
                  <input name="name" required className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="Např. Hala C" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Zákazník / Skupina</label>
                  <select name="groupId" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold">
                    <option value="">Bez skupiny</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Adresa</label>
                  <input name="address" required className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="Ulice, Město" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Lat</label>
                  <input name="lat" type="number" step="any" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="50.08" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Lng</label>
                  <input name="lng" type="number" step="any" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="14.42" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Interní poznámka</label>
                  <textarea name="internalNotes" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="Hesla, specifikace, důležité informace..." rows={3}></textarea>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setAddModalOpen(false)} className="flex-1 px-4 py-4 border-2 border-gray-100 dark:border-slate-800 dark:text-slate-300 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 font-bold transition-all">Zrušit</button>
                <button type="submit" className="flex-1 px-4 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Uložit objekt</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectList;
