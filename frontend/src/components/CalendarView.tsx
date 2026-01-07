
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingObject, BatteryStatus } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Battery as BatteryIcon, 
  ClipboardCheck, 
  Info, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ExternalLink,
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

  // Extract all relevant events
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

    // 2. Scheduled Recurring Events (The "Regular Events" tab)
    const scheduledEvents = (obj.scheduledEvents || []).map(se => ({
      id: `se-${se.id}`,
      type: 'scheduled',
      date: new Date(se.nextDate),
      title: `${se.title}`,
      object: obj,
      note: se.futureNotes || ''
    }));

    // 3. One-off revisions from log entries (backwards compatibility)
    const revisionEvents = (obj.logEntries || [])
      .filter(entry => entry.templateId === 't-revision' && entry.data['f7'])
      .map(entry => ({
        id: `r-${entry.id}`,
        type: 'revision',
        date: new Date(entry.data['f7']),
        title: `Revize: ${obj.name}`,
        object: obj,
        note: entry.data['f9'] || ''
      }));

    return [...batteryEvents, ...scheduledEvents, ...revisionEvents];
  });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = (firstDayOfMonth(year, month) + 6) % 7;

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2 text-blue-600" />
            Kalendář servisu
          </h2>
          <p className="text-sm text-gray-500">Přehled naplánovaných revizí a výměn akumulátorů.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronLeft /></button>
          <span className="text-lg font-bold min-w-[140px] text-center">{monthNames[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronRight /></button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-blue-600 px-3 py-1 bg-blue-50 rounded-full">Dnes</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {dayNames.map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="h-32 md:h-40 bg-gray-50/30 border-r border-b border-gray-50"></div>;
            
            const dateEvents = getEventsForDate(date);
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <div key={idx} className="h-32 md:h-40 p-2 border-r border-b border-gray-100 relative hover:bg-gray-50/50 transition flex flex-col">
                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700'}`}>
                  {date.getDate()}
                </span>
                <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                  {dateEvents.map(event => (
                    <div 
                      key={event.id}
                      onClick={() => navigate(`/object/${event.object.id}`)}
                      title={event.title + (event.note ? `\n\nPoznámka: ${event.note}` : '')}
                      className={`text-[10px] p-1 rounded-md border cursor-pointer transition flex items-center truncate ${
                        event.type === 'battery' 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : event.type === 'scheduled'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            : 'bg-green-50 text-green-700 border-green-100'
                      }`}
                    >
                      {event.type === 'battery' ? <BatteryIcon className="w-2.5 h-2.5 mr-1 flex-shrink-0" /> : event.type === 'scheduled' ? <Bell className="w-2.5 h-2.5 mr-1 flex-shrink-0" /> : <ClipboardCheck className="w-2.5 h-2.5 mr-1 flex-shrink-0" />}
                      <span className="truncate">{event.title}</span>
                      {event.note && <div className="ml-1 w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Info className="w-4 h-4 mr-2 text-blue-500" />Legenda</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-2" /> Výměna akumulátoru</div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-indigo-500 mr-2" /> Plánovaná revize (opakující se)</div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2" /> Ad-hoc revize / servis</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
