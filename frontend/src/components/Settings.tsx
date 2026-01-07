
import React, { useState, useEffect } from 'react';
import { 
  Database, Cloud, Wifi, WifiOff, Save,
  ClipboardList, Plus, Trash2, Edit2, Settings2
} from 'lucide-react';
import { ApiConfig, ApiMode, BuildingObject, FormTemplate, FormFieldDefinition } from '../types';
import { dataStore } from '../services/dataStore';
import { authService } from '../services/authService';

interface SettingsProps {
  objects: BuildingObject[];
}

const Settings: React.FC<SettingsProps> = ({ objects }) => {
  const [config, setConfig] = useState<ApiConfig>({ mode: 'MOCK', baseUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  
  // Templates state
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    const savedConfig = localStorage.getItem('api_config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    setTemplates(dataStore.getTemplates());
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem('api_config', JSON.stringify(config));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    window.location.reload();
  };

  const saveTemplates = (newTemplates: FormTemplate[]) => {
    setTemplates(newTemplates);
    dataStore.saveTemplates(newTemplates);
  };

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
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.filter(f => f.id !== fieldId)
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      {/* API Config Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">Zdroj dat a API</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              {config.mode === 'MOCK' ? <WifiOff className="text-amber-500" /> : <Wifi className="text-green-500" />}
              <div>
                <p className="font-semibold">{config.mode === 'MOCK' ? 'Lokální režim (Mock)' : 'Produkční režim (API)'}</p>
                <p className="text-xs text-gray-500">Určuje, kam se ukládají data objektů.</p>
              </div>
            </div>
            <button 
              onClick={() => setConfig({ ...config, mode: config.mode === 'MOCK' ? 'REMOTE' : 'MOCK' })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.mode === 'REMOTE' ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.mode === 'REMOTE' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <button 
            onClick={handleSaveConfig}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition ${isSaved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
          >
            <Save className="w-5 h-5" />
            <span>{isSaved ? 'Uloženo!' : 'Uložit konfiguraci'}</span>
          </button>
        </div>
      </div>

      {/* Template Management (Admin Only) */}
      {currentUser?.role === 'ADMIN' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold">Správa šablon deníku</h2>
            </div>
          </div>

          <div className="space-y-3">
            {templates.map(tpl => (
              <div key={tpl.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition group">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{tpl.name}</p>
                    <p className="text-xs text-gray-500">{tpl.fields.length} definovaných polí</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingTemplate(tpl)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Upravit šablonu</h3>
                <input 
                  className="bg-transparent font-bold text-blue-600 focus:outline-none"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                />
              </div>
              <button onClick={() => setEditingTemplate(null)} className="p-2 hover:bg-gray-200 rounded-full transition">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pole formuláře</h4>
                <button 
                  onClick={addFieldToTemplate}
                  className="text-sm text-blue-600 font-bold flex items-center hover:underline"
                >
                  <Plus className="w-4 h-4 mr-1" /> Přidat pole
                </button>
              </div>
              
              <div className="space-y-3">
                {editingTemplate.fields.map((field) => (
                  <div key={field.id} className="flex flex-col md:flex-row gap-3 p-4 border rounded-2xl bg-gray-50/50">
                    <div className="flex-1 space-y-2">
                      <input 
                        className="w-full text-sm font-bold bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="Název pole"
                      />
                      <div className="flex gap-4">
                        <select 
                          className="text-xs bg-white border rounded px-2 py-1"
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                        >
                          <option value="text">Krátký text</option>
                          <option value="textarea">Dlouhý text</option>
                          <option value="number">Číslo</option>
                          <option value="date">Datum</option>
                        </select>
                        <label className="flex items-center text-xs text-gray-500">
                          <input 
                            type="checkbox" 
                            className="mr-1"
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          /> Povinné
                        </label>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeField(field.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition self-center"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button 
                onClick={() => setEditingTemplate(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-white transition font-bold"
              >
                Zrušit
              </button>
              <button 
                onClick={() => {
                  saveTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
                  setEditingTemplate(null);
                }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-100"
              >
                Uložit šablonu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
