// FILE: frontend/src/components/GroupManagement.tsx

import React, { useState } from 'react';
import { Tags, Plus, Trash2, Edit2, X, AlertTriangle, Lock, Clock, CalendarClock, Loader2 } from 'lucide-react';
import { ObjectGroup, BuildingObject } from '../types';
import { 
  useCreateGroup, 
  useUpdateGroup, 
  useDeleteGroup 
} from '../hooks/useAppData';

interface GroupManagementProps {
  groups: ObjectGroup[];
  setGroups: (groups: ObjectGroup[]) => void; // Ponecháno pro kompatibilitu
  objects: BuildingObject[];
}

const GroupManagement: React.FC<GroupManagementProps> = ({ groups, objects }) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  
  // --- REACT QUERY MUTATIONS ---
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();

  // State pro formulář
  const [formData, setFormData] = useState<Partial<ObjectGroup>>({
      name: '',
      color: '#3b82f6',
      defaultBatteryLifeMonths: 24,
      notificationLeadTimeWeeks: 4
  });

  const resetForm = () => setFormData({ name: '', color: '#3b82f6', defaultBatteryLifeMonths: 24, notificationLeadTimeWeeks: 4 });

  // --- HANDLERS ---

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    createGroupMutation.mutate({
      name: formData.name,
      color: formData.color,
      defaultBatteryLifeMonths: Number(formData.defaultBatteryLifeMonths) || 24,
      notificationLeadTimeWeeks: Number(formData.notificationLeadTimeWeeks) || 4
    }, {
      onSuccess: () => {
        setAddModalOpen(false);
        resetForm();
      }
    });
  };

  const startEditing = (group: ObjectGroup) => {
      setEditingGroupId(group.id);
      setFormData({
          name: group.name,
          color: group.color || '#3b82f6',
          defaultBatteryLifeMonths: group.defaultBatteryLifeMonths || 24,
          notificationLeadTimeWeeks: group.notificationLeadTimeWeeks || 4
      });
      setDeletingGroupId(null);
  };

  const handleUpdateGroup = (id: string) => {
    if (!formData.name?.trim()) return;
    
    updateGroupMutation.mutate({
      id,
      updates: {
        name: formData.name!, 
        color: formData.color,
        defaultBatteryLifeMonths: Number(formData.defaultBatteryLifeMonths),
        notificationLeadTimeWeeks: Number(formData.notificationLeadTimeWeeks)
      }
    }, {
      onSuccess: () => {
        setEditingGroupId(null);
        resetForm();
      }
    });
  };

  const confirmDelete = (id: string) => {
    deleteGroupMutation.mutate(id, {
      onSuccess: () => {
        setDeletingGroupId(null);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Tags className="w-6 h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
            Zákazníci a nastavení servisu
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Definujte intervaly výměn a upozornění pro jednotlivé skupiny.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setAddModalOpen(true); }}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-5 py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-bold active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nová skupina</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {groups.map(group => {
          const assignedCount = objects.filter(o => o.groupId === group.id).length;
          const isEditing = editingGroupId === group.id;
          const isDeleting = deletingGroupId === group.id;
          
          if (isEditing) {
              return (
                <div key={group.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border-2 border-blue-500 dark:border-blue-600 animate-in zoom-in-95">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Název</label>
                            <input 
                              autoFocus
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold dark:text-white"
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Barva</label>
                            <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-transparent">
                                <input 
                                    type="color" 
                                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                                    value={formData.color}
                                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                                />
                                <span className="text-sm font-mono text-gray-500">{formData.color}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" /> Interval výměny (měsíce)
                            </label>
                            <input 
                              type="number"
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold dark:text-white"
                              value={formData.defaultBatteryLifeMonths}
                              onChange={(e) => setFormData({...formData, defaultBatteryLifeMonths: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Upozornit předem (týdny)
                            </label>
                            <input 
                              type="number"
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold dark:text-white"
                              value={formData.notificationLeadTimeWeeks}
                              onChange={(e) => setFormData({...formData, notificationLeadTimeWeeks: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setEditingGroupId(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800">Zrušit</button>
                        <button 
                          onClick={() => handleUpdateGroup(group.id)} 
                          disabled={updateGroupMutation.isPending}
                          className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 hover:bg-green-700 flex items-center gap-2"
                        >
                          {updateGroupMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                          Uložit změny
                        </button>
                    </div>
                </div>
              );
          }

          return (
            <div key={group.id} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border transition-all ${isDeleting ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-slate-800'}`}>
               {isDeleting ? (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="font-bold text-red-600 dark:text-red-400 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Opravdu smazat skupinu {group.name}?
                  </p>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => confirmDelete(group.id)} 
                      disabled={deleteGroupMutation.isPending}
                      className="flex-1 md:flex-none px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                      {deleteGroupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Smazat'}
                    </button>
                    <button onClick={() => setDeletingGroupId(null)} className="flex-1 md:flex-none px-6 py-2 bg-white text-gray-600 rounded-xl font-bold text-sm border">Zrušit</button>
                  </div>
                </div>
               ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-bold text-xl" style={{ backgroundColor: group.color || '#3b82f6' }}>
                      {group.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-800 dark:text-white text-lg">{group.name}</h4>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                         <span className="flex items-center bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3 mr-1" /> {assignedCount} objektů
                         </span>
                         <span className="flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                            <CalendarClock className="w-3 h-3 mr-1" /> {group.defaultBatteryLifeMonths || 24} měsíců životnost
                         </span>
                         <span className="flex items-center bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 mr-1" /> Alert {group.notificationLeadTimeWeeks || 4} týdny předem
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-end md:self-auto">
                    <button onClick={() => startEditing(group)} className="p-3 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition"><Edit2 className="w-5 h-5" /></button>
                    <button 
                        onClick={() => { if (assignedCount === 0) setDeletingGroupId(group.id); }}
                        disabled={assignedCount > 0}
                        className={`p-3 rounded-xl transition ${assignedCount > 0 ? 'text-gray-200 dark:text-slate-700 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800'}`}
                        title={assignedCount > 0 ? "Nelze smazat - skupina má přiřazené objekty" : "Smazat skupinu"}
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
               )}
            </div>
          );
        })}
      </div>

      {/* MODAL ADD GROUP */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white">Nová skupina</h2>
              <button onClick={() => setAddModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddGroup} className="space-y-6">
              <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Název</label>
                  <input required autoFocus className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Např. ČSOB" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Životnost (měsíce)</label>
                      <input type="number" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none font-bold dark:text-white" value={formData.defaultBatteryLifeMonths} onChange={e => setFormData({...formData, defaultBatteryLifeMonths: Number(e.target.value)})} />
                  </div>
                  <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Alert předem (týdny)</label>
                      <input type="number" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none font-bold dark:text-white" value={formData.notificationLeadTimeWeeks} onChange={e => setFormData({...formData, notificationLeadTimeWeeks: Number(e.target.value)})} />
                  </div>
              </div>
              <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Barva</label>
                  <input type="color" className="w-full h-16 rounded-2xl cursor-pointer" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
              </div>
              <button 
                type="submit" 
                disabled={createGroupMutation.isPending}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {createGroupMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                Vytvořit skupinu
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;