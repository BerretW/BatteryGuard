import React from 'react';
import { Plus, Bell, Trash2 } from 'lucide-react';
import { BuildingObject, RegularEvent } from '../../types';

interface EventsTabProps {
  events: BuildingObject['scheduledEvents'];
  onAddEvent: () => void;
  onEditEvent: (event: RegularEvent) => void;
  onRemoveEvent: (id: string) => void;
}

export const EventsTab: React.FC<EventsTabProps> = ({ events, onAddEvent, onEditEvent, onRemoveEvent }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Časová osa revizí</h3>
          <button onClick={onAddEvent} className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline">
            <Plus className="w-4 h-4" /> Nová událost
          </button>
      </div>
      {(!events || events.length === 0) ? (
        <div className="bg-white dark:bg-slate-900 p-16 text-center rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
          <Bell className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-500 dark:text-slate-400">Žádné plánované akce</h3>
        </div>
      ) : (
        events.map(event => (
          <div key={event.id} className="relative bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-6 group">
              <button 
                onClick={() => onRemoveEvent(event.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[100px] h-fit">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{new Date(event.nextDate).toLocaleString('cs-CZ', { month: 'short' })}</span>
              <span className="text-3xl font-black text-indigo-700 dark:text-indigo-400">{new Date(event.nextDate).getDate()}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-black text-gray-900 dark:text-white">{event.title}</h4>
                <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">{event.interval}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 font-medium mb-4">{event.description}</p>
              <div className="flex gap-2">
                  <button onClick={() => onEditEvent(event)} className="px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all">Upravit</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};