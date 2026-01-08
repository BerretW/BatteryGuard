import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingObject } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Battery as BatteryIcon, 
  ClipboardCheck, 
  Info, 
  Calendar as CalendarIcon,
  Bell
} from 'lucide-react';

interface CalendarViewProps {
  objects: BuildingObject[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ objects }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  // Extract events
  const events = objects.flatMap(obj => {
    // 1. Battery replacements
    const batteryEvents = obj.technologies.flatMap(tech => 
      tech.batteries.map(b => ({
        id: `b-${b.id}`,
        type: 'battery',
        date: new Date(b.nextReplacementDate),
        title: `Výměna: ${tech.name}`,
        object: obj,
        note: b.notes || ''
      }))
    );

    // 2. Scheduled Recurring Events
    const scheduledEvents = (obj.scheduledEvents || []).map(se => ({
      id: `se-${se.id}`,
      type: 'scheduled',
      date: new Date(se.nextDate),
      title: `${se.title}`,
      object: obj,
      note: se.futureNotes || ''
    }));

    return [...batteryEvents, ...scheduledEvents];
  });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = (firstDayOfMonth(year, month) + 6) % 7; // Adjust for Monday start

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= totalDays; i++) calendarDays.push(new Date(year, month, i));

  const getEventsForDate = (date: Date) => {
    return events.filter(e => 
      e.date.getDate() === date.getDate() && 
      e.date.getMonth() === date.getMonth() && 
      e.date.getFullYear() === date.getFullYear()
    );
  };

  const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
  const dayNames = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2 text-blue-600" />
            Kalendář servisu
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Přehled naplánovaných revizí a výměn.</p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl">
          <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm transition text-gray-600 dark:text-slate-300"><ChevronLeft /></button>
          <span className="text-lg font-bold min-w-[160px] text-center text-gray-800 dark:text-white">{monthNames[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm transition text-gray-600 dark:text-slate-300"><ChevronRight /></button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-blue-600 dark:text-blue-400 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg ml-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">Dnes</button>
        </div>
      </div>

      {/* KALENDÁŘ GRID */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        {/* Dny v týdnu */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
          {dayNames.map(d => (
            <div key={d} className="py-3 text-center text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        {/* Dny */}
        <div className="grid grid-cols-7 bg-gray-100 dark:bg-slate-800 gap-[1px]">
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="h-32 md:h-40 bg-gray-50/30 dark:bg-slate-950/30"></div>;
            
            const dateEvents = getEventsForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <div key={idx} className="h-32 md:h-40 p-2 bg-white dark:bg-slate-900 relative hover:bg-gray-50 dark:hover:bg-slate-800/50 transition flex flex-col group">
                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 dark:text-slate-300'}`}>
                  {date.getDate()}
                </span>
                <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                  {dateEvents.map(event => (
                    <div 
                      key={event.id}
                      onClick={() => navigate(`/object/${event.object.id}`)}
                      title={event.title + (event.note ? `\n\nPoznámka: ${event.note}` : '')}
                      className={`text-[10px] p-1.5 rounded-lg border cursor-pointer transition flex items-center truncate shadow-sm hover:scale-[1.02] active:scale-95 ${
                        event.type === 'battery' 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800' 
                          : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800'
                      }`}
                    >
                      {event.type === 'battery' ? <BatteryIcon className="w-2.5 h-2.5 mr-1.5 flex-shrink-0" /> : <Bell className="w-2.5 h-2.5 mr-1.5 flex-shrink-0" />}
                      <span className="truncate font-semibold">{event.title}</span>
                      {event.note && <div className="ml-auto w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LEGENDA */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800">
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" /> Legenda
        </h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center text-gray-600 dark:text-slate-400">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2 shadow-sm" /> 
              Výměna akumulátoru
          </div>
          <div className="flex items-center text-gray-600 dark:text-slate-400">
              <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2 shadow-sm" /> 
              Plánovaná revize / událost
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;