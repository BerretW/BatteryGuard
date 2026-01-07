import React from 'react';
import { BookOpen } from 'lucide-react';
import { LogEntry, FormTemplate } from '../../types';

interface LogTabProps {
  entries: LogEntry[];
  templates: FormTemplate[];
}

export const LogTab: React.FC<LogTabProps> = ({ entries, templates }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-4">Historie záznamů</h3>
      {(!entries || entries.length === 0) ? (
        <p className="text-center py-10 text-slate-400 dark:text-slate-600 font-medium">Deník je zatím prázdný.</p>
      ) : (
        entries.map(entry => (
          <div key={entry.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex gap-5 items-start">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl h-fit"><BookOpen className="w-6 h-6" /></div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h4 className="font-black text-gray-900 dark:text-white text-lg">{entry.templateName}</h4>
                      <span className="text-xs font-bold text-slate-400">{new Date(entry.date).toLocaleString()}</span>
                  </div>
                  <div className="text-xs font-bold text-blue-500 mt-0.5 uppercase tracking-widest">
                  Autor: {entry.author}
                  </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-[5.5rem]">
              {Object.entries(entry.data).map(([key, value]) => {
                    const template = templates.find(t => t.id === entry.templateId);
                    const fieldLabel = template?.fields.find(f => f.id === key)?.label || "Pole";
                    return (
                      <div key={key} className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">{fieldLabel}</span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>
                      </div>
                    )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};