import React, { useState, useEffect } from 'react';
import { 
  Database, Save, ClipboardList, Plus, Trash2, Edit2, Settings2, Check, X, AlertCircle 
} from 'lucide-react';
import { BuildingObject, FormTemplate, FormFieldDefinition } from '../types';
import { getApiService } from '../services/apiService';
import { authService } from '../services/authService';

interface SettingsProps {
  objects: BuildingObject[];
}

const Settings: React.FC<SettingsProps> = ({ objects }) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = getApiService();
  const currentUser = authService.getCurrentUser();

  // Načtení šablon při startu
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await api.getTemplates();
        setTemplates(data);
      } catch (err) {
        console.error("Chyba při načítání šablon:", err);
        setError("Nepodařilo se načíst nastavení.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const saveTemplates = async (newTemplates: FormTemplate[]) => {
    try {
      setTemplates(newTemplates);
      await api.saveTemplates(newTemplates);
      
      // Úspěšné uložení
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      setEditingTemplate(null);
    } catch (err) {
      console.error("Chyba při ukládání:", err);
      alert("Nepodařilo se uložit změny.");
    }
  };

  // --- Logika pro úpravu polí v modálním okně ---

  const addFieldToTemplate = () => {
    if (!editingTemplate) return;
    const newField: FormFieldDefinition = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'Nové pole',
      type: 'text',
      required: false
    };
    setEditingTemplate({
      ...editingTemplate,
      fields: [...editingTemplate.fields, newField]
    });
  };

  const updateField = (fieldId: string, updates: Partial<FormFieldDefinition>) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    });
  };

  const removeField = (fieldId: string) => {
    if (!editingTemplate) return;
    if (!confirm("Opravdu odstranit toto pole?")) return;
    
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.filter(f => f.id !== fieldId)
    });
  };

  if (isLoading) {
    return <div className="p-10 text-center text-gray-500">Načítám nastavení...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      
      {/* Hlavička */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nastavení systému</h2>
          <p className="text-gray-500 dark:text-slate-400">Konfigurace formulářů a šablon.</p>
        </div>
        {isSaved && (
          <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-xl animate-in fade-in">
            <Check className="w-5 h-5" />
            <span className="font-bold text-sm">Uloženo</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Pouze Admin může spravovat šablony */}
      {currentUser?.role === 'ADMIN' ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Šablony deníku</h3>
            </div>
          </div>

          <div className="space-y-4">
            {templates.map(tpl => (
              <div key={tpl.id} className="flex items-center justify-between p-5 border border-gray-100 dark:border-slate-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition group">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-xl">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white text-lg">{tpl.name}</p>
                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                      {tpl.fields.length} polí
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingTemplate(tpl)}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:text-blue-600 hover:border-blue-200 transition shadow-sm"
                >
                  Upravit
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] text-center border border-gray-100 dark:border-slate-800">
          <Settings2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-600 dark:text-slate-400">Přístup odepřen</h3>
          <p className="text-gray-400 dark:text-slate-500">Pouze administrátor může měnit nastavení šablon.</p>
        </div>
      )}

      {/* MODAL PRO EDITACI ŠABLONY */}
      {editingTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modalu */}
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Název šablony</label>
                <input 
                  className="bg-transparent font-black text-2xl text-blue-600 focus:outline-none placeholder-blue-300 w-full"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                />
              </div>
              <button onClick={() => setEditingTemplate(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body Modalu */}
            <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-white dark:bg-slate-900">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Definice polí</h4>
                <button 
                  onClick={addFieldToTemplate}
                  className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold px-3 py-1.5 rounded-lg flex items-center hover:bg-blue-100 transition"
                >
                  <Plus className="w-4 h-4 mr-1" /> Přidat pole
                </button>
              </div>
              
              <div className="space-y-4">
                {editingTemplate.fields.map((field) => (
                  <div key={field.id} className="flex flex-col md:flex-row gap-4 p-5 border border-gray-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 group hover:border-blue-200 dark:hover:border-blue-900 transition">
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Název pole</label>
                          <input 
                            className="w-full text-sm font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="Např. Teplota, Stav..."
                          />
                        </div>
                        <div className="w-1/3">
                          <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Typ</label>
                          <select 
                            className="w-full text-sm font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none dark:text-white"
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Dlouhý text</option>
                            <option value="number">Číslo</option>
                            <option value="date">Datum</option>
                            <option value="select">Výběr (Select)</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Možnosti pro Select */}
                      {field.type === 'select' && (
                        <div>
                           <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Možnosti (oddělené čárkou)</label>
                           <input 
                              className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none dark:text-white"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                              placeholder="Možnost A, Možnost B, ..."
                           />
                        </div>
                      )}

                      <div className="flex items-center">
                        <label className="flex items-center text-xs font-bold text-gray-600 dark:text-slate-400 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            className="mr-2 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          /> 
                          Povinné pole
                        </label>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => removeField(field.id)}
                      className="self-center p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                      title="Odstranit pole"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Modalu */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex gap-4">
              <button 
                onClick={() => setEditingTemplate(null)}
                className="flex-1 py-4 border-2 border-gray-200 dark:border-slate-700 rounded-2xl text-gray-600 dark:text-slate-300 font-bold hover:bg-white dark:hover:bg-slate-800 transition"
              >
                Zrušit
              </button>
              <button 
                onClick={() => {
                  const updatedTemplates = templates.map(t => t.id === editingTemplate.id ? editingTemplate : t);
                  saveTemplates(updatedTemplates);
                }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition"
              >
                Uložit změny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;