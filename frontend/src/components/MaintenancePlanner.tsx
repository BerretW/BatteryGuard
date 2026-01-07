
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingObject, BatteryStatus, RegularEvent } from '../types';
import { Calendar, Clock, MapPin, Battery as BatteryIcon, ExternalLink, MessageSquare, ClipboardCheck, Info, Bell, Target } from 'lucide-react';

interface MaintenancePlannerProps {
  objects: BuildingObject[];
  setObjects: (objects: BuildingObject[]) => void;
}

const MaintenancePlanner: React.FC<MaintenancePlannerProps> = ({ objects }) => {
  const navigate = useNavigate();
  const now = new Date();
  
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

  const scheduledTasks = objects.flatMap(obj => 
    (obj.scheduledEvents || []).map(event => {
      const targetDate = new Date(event.nextDate);
      let isDue = false;

      if (event.precisionOnDay) {
        // Exact day check
        isDue = targetDate <= now;
      } else {
        // Month check: Overdue only if current month > target month AND current year >= target year
        // or current year > target year.
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
        note: event.futureNotes,
        precisionOnDay: event.precisionOnDay
      };
    })
  );

  const allTasks = [...batteryTasks, ...scheduledTasks].sort((a, b) => a.date.getTime() - b.date.getTime());
  const dueTasks = allTasks.filter(t => t.isDue);
  const futureTasks = allTasks.filter(t => !t.isDue);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Plán údržby a výměn</h2>
        <p className="text-gray-500">Souhrnný přehled revizí a údržby akumulátorů.</p>
      </div>

      <section>
        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Nutné k řešení (Po termínu)
        </h3>
        <div className="space-y-3">
          {dueTasks.length === 0 ? (
            <p className="text-gray-400 italic bg-gray-50 p-4 rounded-lg text-sm text-center">Všechny úkoly jsou aktuálně v pořádku.</p>
          ) : (
            dueTasks.map(task => <TaskItem key={task.id} task={task} onGoTo={() => navigate(`/object/${task.objId}`)} />)
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          Budoucí plánované úkony
        </h3>
        <div className="space-y-3">
          {futureTasks.length === 0 ? (
            <p className="text-gray-400 italic bg-gray-50 p-4 rounded-lg text-sm text-center">Žádné budoucí úkoly nejsou v systému.</p>
          ) : (
            futureTasks.map(task => <TaskItem key={task.id} task={task} onGoTo={() => navigate(`/object/${task.objId}`)} />)
          )}
        </div>
      </section>
    </div>
  );
};

const TaskItem: React.FC<{ task: any, onGoTo: () => void }> = ({ task, onGoTo }) => (
  <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between transition group hover:shadow-md gap-4 ${task.isDue ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
    <div className="flex-1 flex items-start md:items-center space-x-4">
      <div className={`p-3 rounded-lg flex-shrink-0 ${task.isDue ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
        {task.type === 'battery' ? <BatteryIcon className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
      </div>
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h4 className="font-bold text-gray-800">{task.objName}</h4>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-medium">{task.techName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
          <span className="flex items-center text-xs"><Info className="w-3.5 h-3.5 mr-1" /> {task.info}</span>
          <span className={`font-semibold flex items-center ${task.isDue ? 'text-red-700' : 'text-gray-700'}`}>
            <Calendar className="w-3.5 h-3.5 mr-1" /> 
            {task.precisionOnDay ? 'Termín: ' : 'Měsíc: '}
            {task.precisionOnDay 
              ? task.date.toLocaleDateString() 
              : task.date.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        {task.note && (
          <div className="mt-2 p-2 bg-white/50 border border-gray-100 rounded-lg text-xs italic text-gray-600 flex items-start">
            <MessageSquare className="w-3 h-3 mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
            <span>Poznámka: {task.note}</span>
          </div>
        )}
      </div>
    </div>
    <div className="flex items-center">
      <button onClick={onGoTo} className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 rounded-lg font-bold text-xs transition shadow-sm">
        Detail <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export default MaintenancePlanner;
