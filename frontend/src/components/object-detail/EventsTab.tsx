import React from 'react';
import { Plus, Bell, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { BuildingObject, RegularEvent, PendingIssue } from '../../types';

interface EventsTabProps {
  events: BuildingObject['scheduledEvents'];
  pendingIssues: PendingIssue[]; // <--- NOVÉ
  onAddEvent: () => void;
  onEditEvent: (event: RegularEvent) => void;
  onRemoveEvent: (id: string) => void;
  onToggleIssue: (id: string) => void; // <--- NOVÉ
  onDeleteIssue: (id: string) => void; // <--- NOVÉ
}

export const EventsTab: React.FC<EventsTabProps> = ({ 
    events, pendingIssues, 
    onAddEvent, onEditEvent, onRemoveEvent, 
    onToggleIssue, onDeleteIssue 
}) => {
  
  // Rozdělení na otevřené a vyřešené pro lepší přehlednost
  const openIssues = pendingIssues.filter(i => i.status === 'OPEN');
  const resolvedIssues = pendingIssues.filter(i => i.status === 'RESOLVED');

  return (
    <div className="space-y-8">
      
      {/* --- SEKCE 1: ODLOŽENÉ ZÁVADY (Pro mé budoucí já) --- */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 px-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Odložené závady a poznámky
        </h3>
        
        {pendingIssues.length === 0 ? (
            <p className="px-6 text-sm text-gray-400 italic">Žádné odložené závady.</p>
        ) : (
            <div className="grid gap-3 px-2">
                {/* Otevřené */}
                {openIssues.map(issue => (
                    <div key={issue.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex items-start gap-4">
                        <button 
                            onClick={() => onToggleIssue(issue.id)}
                            className="mt-1 w-6 h-6 rounded-full border-2 border-amber-400 flex items-center justify-center text-transparent hover:bg-amber-400 hover:text-white transition-all"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                            <p className="font-bold text-gray-800 dark:text-amber-100">{issue.text}</p>
                            <p className="text-[10px] text-amber-600/70 mt-1 uppercase font-bold">
                                {new Date(issue.createdAt).toLocaleDateString()} • {issue.createdBy}
                            </p>
                        </div>
                        <button onClick={() => onDeleteIssue(issue.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}

                {/* Vyřešené (šedé, přeškrtnuté) */}
                {resolvedIssues.map(issue => (
                    <div key={issue.id} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-4 opacity-70">
                        <button 
                            onClick={() => onToggleIssue(issue.id)}
                            className="mt-1 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </button>
                        <div className="flex-1">
                            <p className="font-medium text-gray-500 line-through">{issue.text}</p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase">Vyřešeno</p>
                        </div>
                        <button onClick={() => onDeleteIssue(issue.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
        )}
      </div>

      <hr className="border-gray-100 dark:border-slate-800" />

      {/* --- SEKCE 2: PLÁNOVANÉ REVIZE (Původní obsah) --- */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Plánované revize
            </h3>
            <button onClick={onAddEvent} className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline">
                <Plus className="w-4 h-4" /> Nová událost
            </button>
        </div>
        
        {(!events || events.length === 0) ? (
            <div className="bg-white dark:bg-slate-900 p-8 text-center rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
            <Bell className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-400 dark:text-slate-500">Žádný plán údržby</p>
            </div>
        ) : (
            events.map(event => {
              // Logika pro barvy podle typu intervalu
              const isOneTime = event.interval === 'Jednorázově';
              const dateColor = isOneTime ? 'text-purple-700 dark:text-purple-400' : 'text-indigo-700 dark:text-indigo-400';
              const badgeColor = isOneTime ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400';
              const iconBg = isOneTime ? 'bg-purple-50 dark:bg-purple-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10';
              const labelText = isOneTime ? 'Mimořádné / Jednorázové' : event.interval;

              return (
                <div key={event.id} className="relative bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-6 group">
                    <button 
                        onClick={() => onRemoveEvent(event.id)}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {/* Datum Box */}
                    <div className={`${iconBg} p-4 rounded-2xl flex flex-col items-center justify-center min-w-[100px] h-fit`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isOneTime ? 'text-purple-400' : 'text-indigo-400'}`}>
                          {new Date(event.nextDate).toLocaleString('cs-CZ', { month: 'short' })}
                        </span>
                        <span className={`text-3xl font-black ${dateColor}`}>
                          {new Date(event.nextDate).getDate()}
                        </span>
                        {/* Rok zobrazíme jen pokud není letošní */}
                        {new Date(event.nextDate).getFullYear() !== new Date().getFullYear() && (
                           <span className="text-[10px] font-bold text-gray-400 mt-1">{new Date(event.nextDate).getFullYear()}</span>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2 mr-8">
                            <h4 className="text-lg font-black text-gray-900 dark:text-white">{event.title}</h4>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeColor}`}>
                              {labelText}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400 font-medium mb-4">{event.description || "Bez popisu"}</p>
                        
                        <div className="flex gap-2">
                           <button onClick={() => onEditEvent(event)} className="px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all">
                             Upravit
                           </button>
                        </div>
                    </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};