import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, AlertCircle, Calendar, ArrowRight, Filter, AlertTriangle 
} from 'lucide-react';
import { BuildingObject, TaskPriority } from '../types';

interface GlobalTaskListProps {
  objects: BuildingObject[];
}

export const GlobalTaskList: React.FC<GlobalTaskListProps> = ({ objects }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'OVERDUE' | 'THIS_MONTH' | 'NEXT_MONTH'>('OVERDUE');

  const allTasks = useMemo(() => {
    return objects.flatMap(obj => (obj.tasks || []).map(task => ({ ...task, objectName: obj.name, objectId: obj.id })));
  }, [objects]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Pro příští měsíc
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextYear = nextMonthDate.getFullYear();

    return allTasks.filter(task => {
      // Ignorovat hotové
      if (task.status === 'DONE') return false;

      const d = new Date(task.deadline);
      const isOverdue = d < new Date(now.setHours(0,0,0,0));

      if (viewMode === 'OVERDUE') {
        return isOverdue;
      }
      if (viewMode === 'THIS_MONTH') {
        // Zobrazit pokud je tento měsíc A NENÍ po termínu (nebo je po termínu ale stále v tomto měsíci)
        // Logika: Zobrazujeme prostě vše, co má deadline v tomto kalendářním měsíci
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      if (viewMode === 'NEXT_MONTH') {
        return d.getMonth() === nextMonth && d.getFullYear() === nextYear;
      }
      return false;
    }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [allTasks, viewMode]);

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
            Globální přehled úkolů
          </h2>
          <p className="text-gray-500 dark:text-slate-400">Centrální evidence operativních úkolů napříč všemi objekty.</p>
        </div>
        
        {/* Filtry */}
        <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
           <button 
             onClick={() => setViewMode('OVERDUE')}
             className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'OVERDUE' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
           >
             <AlertTriangle className="w-4 h-4" /> Po termínu
           </button>
           <button 
             onClick={() => setViewMode('THIS_MONTH')}
             className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'THIS_MONTH' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
           >
             <Calendar className="w-4 h-4" /> Tento měsíc
           </button>
           <button 
             onClick={() => setViewMode('NEXT_MONTH')}
             className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'NEXT_MONTH' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
           >
             <ArrowRight className="w-4 h-4" /> Příští měsíc
           </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
             <CheckCircle2 className="w-16 h-16 text-green-500/20 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-gray-800 dark:text-white">Čisto!</h3>
             <p className="text-gray-400">V této kategorii nejsou žádné aktivní úkoly.</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => navigate(`/object/${task.objectId}`)}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
            >
               <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 block">
                      {task.objectName}
                    </span>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                      {task.description}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(task.priority)}`}>
                         {TaskPriority[task.priority as keyof typeof TaskPriority]}
                       </span>
                       <span className="flex items-center gap-1 font-medium">
                         <Clock className="w-3.5 h-3.5" /> Termín: {new Date(task.deadline).toLocaleDateString()}
                       </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 p-2 rounded-full text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </div>
               </div>
               {task.note && (
                 <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800 text-sm text-gray-600 dark:text-slate-300 italic">
                   "{task.note}"
                 </div>
               )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};