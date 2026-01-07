import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, BookOpen, Edit } from 'lucide-react';
import { BuildingObject, ObjectGroup } from '../../types';

interface ObjectHeaderProps {
  object: BuildingObject;
  group: ObjectGroup;
  onOpenLogModal: () => void;
  onOpenEditModal: () => void;
}

export const ObjectHeader: React.FC<ObjectHeaderProps> = ({ object, group, onOpenLogModal, onOpenEditModal }) => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex gap-5">
          <button 
            onClick={() => navigate('/objects')} 
            className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-all h-fit active:scale-90"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">{object.name}</h1>
              <span className="px-3 py-1 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg" style={{ backgroundColor: group.color || '#94a3b8' }}>
                {group.name}
              </span>
            </div>
            <div className="flex items-center text-gray-500 dark:text-slate-400 mt-2 font-medium">
              <MapPin className="w-4 h-4 mr-1.5 text-blue-500" />
              <span className="text-sm">{object.address}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={onOpenLogModal} className="flex-1 md:flex-none px-5 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" /> Nový zápis
          </button>
          <button onClick={onOpenEditModal} className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            <Edit className="w-4 h-4" /> Upravit objekt
          </button>
        </div>
      </div>
    </div>
  );
};