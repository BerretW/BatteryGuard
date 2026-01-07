import React from 'react';
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
  AlertTriangle 
} from 'lucide-react';

interface MaintenancePlannerProps {
  objects: BuildingObject[];
  setObjects: (objects: BuildingObject[]) => void;
}

const MaintenancePlanner: React.FC<MaintenancePlannerProps> = ({ objects }) => {
  const navigate = useNavigate();
  const now = new Date();
  
  // 1. Úkoly týkající se baterií (Výměny)
  const batteryTasks = objects.flatMap(obj => 
    obj.technologies.flatMap(tech => 
      tech.batteries.map(battery => ({
        id: `b-${battery.id}`,
        type: 'battery',
        objId: obj.id,
        objName: obj.name,
        techName: tech.name,
        date: new Date(battery.nextReplacementDate),
        isDue: new Date(battery.nextReplacementDate) <= now || battery.status !== BatteryStatus.HEALTHY,
        info: `${battery.capacityAh}Ah / ${battery.voltageV}V`,
        note: battery.notes,
        precisionOnDay: true
      }))
    )
  );

  // 2. Plánované revize (Scheduled Events)
  const scheduledTasks = objects.flatMap(obj => 
    (obj.scheduledEvents || []).map(event => {
      const targetDate = new Date(event.nextDate);
      let isDue = false;

      if (event.precisionOnDay) {
        // Kontrola na přesný den
        isDue = targetDate <= now;
      } else {
        // Kontrola na měsíc
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth();

        if (currentYear > targetYear) {
          isDue = true;
        } else if (currentYear === targetYear && currentMonth > targetMonth) {
          isDue = true;
        }
      }

      return {
        id: `se-${event.id}`,
        type: 'scheduled',
        objId: obj.id,
        objName: obj.name,
        techName: event.title,
        date: targetDate,
        isDue: isDue,
        info: event.interval,
        note: event.description, // Zde zobrazujeme popis události
        precisionOnDay: event.precisionOnDay
      };
    })
  );

  // 3. Odložené závady (Pending Issues - "Pro mé budoucí já")
  // Tyto úkoly považujeme vždy za "isDue" (nutné k řešení), dokud nejsou vyřešeny (status === 'OPEN')
  const pendingIssueTasks = objects.flatMap(obj => 
    (obj.pendingIssues || [])
      .filter(i => i.status === 'OPEN')
      .map(issue => ({
        id: `issue-${issue.id}`,
        type: 'issue',
        objId: obj.id,
        objName: obj.name,
        techName: 'Odložená závada',
        date: new Date(issue.createdAt), // Datum vytvoření poznámky
        isDue: true, // Závady zobrazujeme vždy nahoře
        info: `Autor: ${issue.createdBy}`,
        note: issue.text,
        precisionOnDay: true
      }))
  );

  // Sloučení a seřazení všech úkolů podle data
  const allTasks = [...batteryTasks, ...scheduledTasks, ...pendingIssueTasks]
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const dueTasks = allTasks.filter(t => t.isDue);
  const futureTasks = allTasks.filter(t => !t.isDue);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Plán údržby a výměn</h2>
        <p className="text-gray-500 dark:text-slate-400">Souhrnný přehled revizí, výměn akumulátorů a nahlášených závad.</p>
      </div>

      <section>
        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-4 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Nutné k řešení (Po termínu / Závady)
        </h3>
        <div className="space-y-3">
          {dueTasks.length === 0 ? (
            <p className="text-gray-400 dark:text-slate-600 italic bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl text-sm text-center border border-dashed border-gray-200 dark:border-slate-800">
              Všechny systémy jsou v pořádku.
            </p>
          ) : (
            dueTasks.map(task => <TaskItem key={task.id} task={task} onGoTo={() => navigate(`/object/${task.objId}`)} />)
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          Budoucí plánované úkony
        </h3>
        <div className="space-y-3">
          {futureTasks.length === 0 ? (
            <p className="text-gray-400 dark:text-slate-600 italic bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl text-sm text-center border border-dashed border-gray-200 dark:border-slate-800">
              Žádné budoucí úkoly nejsou v systému.
            </p>
          ) : (
            futureTasks.map(task => <TaskItem key={task.id} task={task} onGoTo={() => navigate(`/object/${task.objId}`)} />)
          )}
        </div>
      </section>
    </div>
  );
};

const TaskItem: React.FC<{ task: any, onGoTo: () => void }> = ({ task, onGoTo }) => {
  // Určení stylů podle typu úkolu
  let containerClass = "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800";
  let iconContainerClass = "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400";
  let icon = <Bell className="w-6 h-6" />;

  if (task.type === 'issue') {
    // Styl pro ZÁVADY (Oranžová)
    containerClass = "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30";
    iconContainerClass = "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400";
    icon = <AlertTriangle className="w-6 h-6" />;
  } else if (task.isDue) {
    // Styl pro PROŠLÉ TERMÍNY (Červená)
    containerClass = "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30";
    iconContainerClass = "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400";
    if (task.type === 'battery') icon = <BatteryIcon className="w-6 h-6" />;
  } else if (task.type === 'battery') {
    // Styl pro BUDOUCÍ BATERIE (Modrá)
    icon = <BatteryIcon className="w-6 h-6" />;
  }

  return (
    <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between transition group hover:shadow-lg dark:hover:shadow-none gap-4 ${containerClass}`}>
      <div className="flex-1 flex items-start md:items-center space-x-4">
        <div className={`p-3 rounded-xl flex-shrink-0 ${iconContainerClass}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h4 className="font-bold text-gray-800 dark:text-white text-lg">{task.objName}</h4>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 dark:bg-black/20 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
              {task.techName}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-slate-400 font-medium">
            <span className="flex items-center text-xs">
              <Info className="w-3.5 h-3.5 mr-1" /> {task.info}
            </span>
            <span className={`font-bold flex items-center ${task.isDue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
              <Calendar className="w-3.5 h-3.5 mr-1" /> 
              {task.type === 'issue' ? 'Nahlášeno: ' : (task.precisionOnDay ? 'Termín: ' : 'Měsíc: ')}
              {task.precisionOnDay 
                ? task.date.toLocaleDateString() 
                : task.date.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          
          {task.note && (
            <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-xl text-xs font-medium text-gray-600 dark:text-slate-300 flex items-start">
              <MessageSquare className="w-3 h-3 mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
              <span>{task.type === 'issue' ? 'Popis závady: ' : 'Poznámka: '}{task.note}</span>
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