import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingObject, BatteryStatus } from '../types';
import { 
  Calendar, 
  Clock, 
  Battery as BatteryIcon, 
  ExternalLink, 
  MessageSquare, 
  Info, 
  Bell, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MaintenancePlannerProps {
  objects: BuildingObject[];
  setObjects: (objects: BuildingObject[]) => void;
}

const MaintenancePlanner: React.FC<MaintenancePlannerProps> = ({ objects }) => {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date());
  const now = new Date(); // Skutečný dnešek pro porovnání "Po termínu"
  
  // --- HELPERY PRO DATUM ---
  const getMonthName = (date: Date) => date.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
  
  const prevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const nextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  const isSameMonth = (d1: Date, d2: Date) => {
    return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const isOverdue = (date: Date) => {
    // Je datum menší než dnešní půlnoc?
    const today = new Date();
    today.setHours(0,0,0,0);
    return date < today;
  };

  // --- 1. SBĚR DAT ---
  
  // Baterie
  const batteryTasks = objects.flatMap(obj => 
    obj.technologies.flatMap(tech => 
      tech.batteries.map(battery => {
        const date = new Date(battery.nextReplacementDate);
        return {
          id: `b-${battery.id}`,
          type: 'battery',
          objId: obj.id,
          objName: obj.name,
          techName: tech.name,
          date: date,
          isOverdue: isOverdue(date) || battery.status !== BatteryStatus.HEALTHY,
          info: `${battery.capacityAh}Ah / ${battery.voltageV}V`,
          note: battery.notes,
          precisionOnDay: true
        };
      })
    )
  );

  // Plánované revize
  const scheduledTasks = objects.flatMap(obj => 
    (obj.scheduledEvents || []).map(event => {
      const targetDate = new Date(event.nextDate);
      return {
        id: `se-${event.id}`,
        type: 'scheduled',
        objId: obj.id,
        objName: obj.name,
        techName: event.title,
        date: targetDate,
        isOverdue: isOverdue(targetDate),
        info: event.interval,
        note: event.description,
        precisionOnDay: event.precisionOnDay
      };
    })
  );

  // Odložené závady (Vždy "Overdue" dokud nejsou resolved)
  const pendingIssueTasks = objects.flatMap(obj => 
    (obj.pendingIssues || [])
      .filter(i => i.status === 'OPEN')
      .map(issue => ({
        id: `issue-${issue.id}`,
        type: 'issue',
        objId: obj.id,
        objName: obj.name,
        techName: 'Odložená závada',
        date: new Date(issue.createdAt),
        isOverdue: true, 
        info: `Autor: ${issue.createdBy}`,
        note: issue.text,
        precisionOnDay: true
      }))
  );

  const allTasks = [...batteryTasks, ...scheduledTasks, ...pendingIssueTasks];

  // --- 2. FILTROVÁNÍ ---

  // A) Resty (Všechno co je po termínu nebo závada, bez ohledu na vybraný měsíc)
  // Zobrazujeme je vždy nahoře, aby nezapadly.
  const overdueItems = allTasks.filter(t => t.isOverdue).sort((a, b) => a.date.getTime() - b.date.getTime());

  // B) Plán pro vybraný měsíc (Pouze to, co není overdue a padá do vybraného měsíce)
  const monthItems = allTasks
    .filter(t => !t.isOverdue && isSameMonth(t.date, viewDate))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* HLAVIČKA A NAVIGACE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Plán údržby</h2>
           <p className="text-gray-500 dark:text-slate-400 text-sm">Přehled servisních úkonů</p>
        </div>
        
        <div className="flex items-center bg-gray-50 dark:bg-slate-800 rounded-xl p-1">
          <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm transition text-gray-600 dark:text-slate-300">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-6 font-bold text-gray-800 dark:text-white min-w-[150px] text-center capitalize">
            {getMonthName(viewDate)}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm transition text-gray-600 dark:text-slate-300">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* SEKCE 1: RESTY A ZÁVADY */}
      {overdueItems.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-2 mb-4 px-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-wider">
              Nutné k řešení ({overdueItems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {overdueItems.map(task => (
              <TaskItem key={task.id} task={task} onGoTo={() => navigate(`/object/${task.objId}`)} isOverdue={true} />
            ))}
          </div>
        </section>
      )}

      {/* SEKCE 2: PLÁN NA VYBRANÝ MĚSÍC */}
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        <div className="flex items-center gap-2 mb-4 px-2">
           <Calendar className="w-5 h-5 text-blue-500" />
           <h3 className="text-sm font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
             Plán: {getMonthName(viewDate)} ({monthItems.length})
           </h3>
        </div>
        
        <div className="space-y-3">
          {monthItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
               <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 mb-3">
                 <Clock className="w-6 h-6" />
               </div>
               <p className="text-gray-900 dark:text-white font-bold">V tomto měsíci je volno.</p>
               <p className="text-sm text-gray-500 dark:text-slate-500">Žádné plánované úkony.</p>
            </div>
          ) : (
            monthItems.map(task => (
              <TaskItem key={task.id} task={task} onGoTo={() => navigate(`/object/${task.objId}`)} isOverdue={false} />
            )))}
          
        </div>
      </section>
    </div>
  );
};

// --- KOMPONENTA PRO POLOŽKU ---
const TaskItem: React.FC<{ task: any, onGoTo: () => void, isOverdue: boolean }> = ({ task, onGoTo, isOverdue }) => {
  let containerClass = "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800";
  let iconContainerClass = "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400";
  let icon = <Bell className="w-6 h-6" />;

  if (task.type === 'issue') {
    containerClass = "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30";
    iconContainerClass = "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400";
    icon = <AlertTriangle className="w-6 h-6" />;
  } else if (isOverdue) {
    containerClass = "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30";
    iconContainerClass = "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400";
    if (task.type === 'battery') icon = <BatteryIcon className="w-6 h-6" />;
  } else if (task.type === 'battery') {
    icon = <BatteryIcon className="w-6 h-6" />;
  }

  return (
    <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between transition hover:shadow-lg dark:hover:shadow-none gap-4 ${containerClass}`}>
      <div className="flex-1 flex items-start md:items-center space-x-4">
        <div className={`p-3 rounded-xl flex-shrink-0 ${iconContainerClass}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h4 className="font-bold text-gray-800 dark:text-white text-lg">{task.objName}</h4>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 dark:bg-black/20 px-2 py-1 rounded text-gray-600 dark:text-gray-300 w-fit">
              {task.techName}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-slate-400 font-medium">
            <span className="flex items-center text-xs">
              <Info className="w-3.5 h-3.5 mr-1" /> {task.info}
            </span>
            <span className={`font-bold flex items-center ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
              <Calendar className="w-3.5 h-3.5 mr-1" /> 
              {task.type === 'issue' ? 'Nahlášeno: ' : 'Termín: '}
              {task.date.toLocaleDateString()}
            </span>
          </div>
          
          {task.note && (
            <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-xl text-xs font-medium text-gray-600 dark:text-slate-300 flex items-start">
              <MessageSquare className="w-3 h-3 mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
              <span>{task.note}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <button 
          onClick={onGoTo} 
          className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-200 rounded-xl font-bold text-xs transition shadow-sm active:scale-95"
        >
          Detail <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default MaintenancePlanner;