import React, { useState } from 'react';
import { 
  CheckCircle2, Circle, Clock, AlertCircle, Plus, 
  Trash2, Edit2, ArrowRightCircle 
} from 'lucide-react';
import { ObjectTask, TaskPriority, TaskStatus } from '../../types';

interface TasksTabProps {
  tasks: ObjectTask[];
  onAddTask: () => void;
  onEditTask: (task: ObjectTask) => void;
  onRemoveTask: (id: string) => void;
  onQuickStatusChange: (task: ObjectTask, newStatus: 'OPEN' | 'IN_PROGRESS' | 'DONE') => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({ 
  tasks = [], onAddTask, onEditTask, onRemoveTask, onQuickStatusChange 
}) => {
  
  // Seřadíme úkoly: Nevyřešené nahoře, podle data
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'DONE' && b.status !== 'DONE') return 1;
    if (a.status !== 'DONE' && b.status === 'DONE') return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getStatusIcon = (s: string) => {
    switch(s) {
      case 'DONE': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="w-5 h-5 text-amber-500" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Úkolníček
        </h3>
        <button 
          onClick={onAddTask} 
          className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline"
        >
          <Plus className="w-4 h-4" /> Nový úkol
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 text-center rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
          <CheckCircle2 className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-400 dark:text-slate-500">Žádné úkoly v seznamu</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedTasks.map(task => {
            const isDone = task.status === 'DONE';
            const isOverdue = !isDone && new Date(task.deadline) < new Date();
            
            return (
              <div key={task.id} className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm transition-all flex flex-col md:flex-row gap-4 items-start md:items-center group ${isDone ? 'opacity-60 border-gray-100 dark:border-slate-800' : isOverdue ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100 dark:border-slate-800 hover:border-blue-200'}`}>
                
                {/* Status Toggle */}
                <button 
                  onClick={() => {
                    const nextStatus = task.status === 'OPEN' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'DONE' : 'OPEN';
                    onQuickStatusChange(task, nextStatus);
                  }}
                  className="mt-1 md:mt-0 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition"
                  title="Změnit stav"
                >
                  {getStatusIcon(task.status)}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                      {TaskPriority[task.priority as keyof typeof TaskPriority]}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
                        PO TERMÍNU
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                      Termín: {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className={`font-bold text-gray-800 dark:text-white ${isDone ? 'line-through' : ''}`}>
                    {task.description}
                  </h4>
                  {task.note && (
                     <p className="text-sm text-gray-500 mt-1">{task.note}</p>
                  )}
                  <div className="text-[10px] text-gray-300 mt-2">
                    Zadal: {task.createdBy} ({new Date(task.createdAt).toLocaleDateString()})
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEditTask(task)} 
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { if(confirm('Smazat úkol?')) onRemoveTask(task.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};