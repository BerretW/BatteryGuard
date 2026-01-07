
import React, { useState } from 'react';
import { Tags, Plus, Trash2, Edit2, Check, X, Palette, AlertCircle, Lock, AlertTriangle } from 'lucide-react';
import { ObjectGroup, BuildingObject } from '../types';

interface GroupManagementProps {
  groups: ObjectGroup[];
  setGroups: (groups: ObjectGroup[]) => void;
  objects: BuildingObject[];
}

const GroupManagement: React.FC<GroupManagementProps> = ({ groups, setGroups, objects }) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6');

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup: ObjectGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName,
      color: newGroupColor
    };

    setGroups([...groups, newGroup]);
    setAddModalOpen(false);
    setNewGroupName('');
    setNewGroupColor('#3b82f6');
  };

  const handleUpdateGroup = (id: string, name: string, color: string) => {
    if (!name.trim()) return;
    setGroups(groups.map(g => g.id === id ? { ...g, name, color } : g));
    setEditingGroupId(null);
  };

  const confirmDelete = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
    setDeletingGroupId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Tags className="w-6 h-6 mr-2 text-indigo-600" />
            Správa zákazníků a skupin
          </h2>
          <p className="text-sm text-gray-500 mt-1">Definujte segmenty pro kategorizaci vašich objektů.</p>
        </div>
        <button 
          onClick={() => {
            setNewGroupName('');
            setNewGroupColor('#3b82f6');
            setAddModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-5 py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 font-bold active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nová skupina</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(group => {
          const assignedObjects = objects.filter(o => o.groupId === group.id);
          const assignedCount = assignedObjects.length;
          const isDeleting = deletingGroupId === group.id;
          const isEditing = editingGroupId === group.id;
          
          return (
            <div key={group.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${isDeleting ? 'border-red-200 ring-2 ring-red-50' : 'border-gray-100'}`}>
              {isEditing ? (
                <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Název</label>
                    <input 
                      autoFocus
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Barva:</span>
                      <input 
                        type="color" 
                        className="w-6 h-6 rounded-full overflow-hidden border-none p-0 cursor-pointer"
                        value={newGroupColor}
                        onChange={(e) => setNewGroupColor(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <button 
                        onClick={() => handleUpdateGroup(group.id, newGroupName, newGroupColor)}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-xs"
                      >
                        <Check className="w-4 h-4" /> Uložit
                      </button>
                      <button 
                        onClick={() => setEditingGroupId(null)}
                        className="p-2 bg-gray-100 text-gray-500 rounded-xl"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : isDeleting ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-3 animate-in fade-in duration-200">
                  <p className="text-sm font-bold text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Opravdu smazat skupinu {group.name}?
                  </p>
                  <div className="flex w-full gap-2">
                    <button 
                      onClick={() => confirmDelete(group.id)}
                      className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow-md shadow-red-100 active:scale-95"
                    >
                      Smazat
                    </button>
                    <button 
                      onClick={() => setDeletingGroupId(null)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm active:scale-95"
                    >
                      Zrušit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-2xl shadow-inner flex items-center justify-center text-white"
                      style={{ backgroundColor: group.color || '#3b82f6' }}
                    >
                      <Tags className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg leading-tight">{group.name}</h4>
                      <div className="flex items-center mt-1">
                        {assignedCount > 0 ? (
                          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center">
                            <Lock className="w-3 h-3 mr-1" /> {assignedCount} {assignedCount === 1 ? 'objekt' : 'objekty'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400">Bez objektů</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => {
                        setEditingGroupId(group.id);
                        setNewGroupName(group.name);
                        setNewGroupColor(group.color || '#3b82f6');
                        setDeletingGroupId(null);
                      }}
                      className="p-3 text-gray-400 hover:text-blue-600 rounded-xl active:bg-blue-50"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (assignedCount === 0) setDeletingGroupId(group.id);
                      }}
                      disabled={assignedCount > 0}
                      className={`p-3 rounded-xl transition-all ${assignedCount > 0 ? 'text-gray-100 opacity-50 cursor-not-allowed' : 'text-gray-400 active:text-red-600 active:bg-red-50'}`}
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

      {groups.length === 0 && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
          <Tags className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700">Zatím žádné skupiny</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">Vytvořte svou první skupinu nebo zákazníka.</p>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Nová skupina</h2>
              <button 
                onClick={() => setAddModalOpen(false)} 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddGroup} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Název zákazníka / skupiny</label>
                <input 
                  autoFocus
                  required
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-gray-800 transition-all"
                  placeholder="Např. ČSOB, Obchodní centra..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 flex items-center uppercase tracking-widest">
                  <Palette className="w-4 h-4 mr-2" />
                  Barva na mapě
                </label>
                <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-2xl border-2 border-gray-100">
                  <input 
                    type="color" 
                    className="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer border-4 border-white shadow-sm p-0"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                  />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">Tato barva bude použita pro štítky a značky na mapě.</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-600 active:scale-95"
                >
                  Zrušit
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl transition font-black shadow-xl shadow-blue-100 active:scale-95"
                >
                  Vytvořit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;
