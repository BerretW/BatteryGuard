// FILE: frontend/src/components/Settings.tsx

import React, { useState, useEffect } from 'react';
import { 
  Database, ClipboardList, Plus, Trash2, Settings2, Check, X, AlertCircle,
  Download, Upload, UploadCloud, RefreshCw, AlertTriangle, CheckCircle, Battery,
  FileText // <--- NOVÁ IKONA
} from 'lucide-react';
import { FormTemplate, FormFieldDefinition, BuildingObject } from '../types';
import { getApiService } from '../services/apiService';
import { authService } from '../services/authService';
import { 
  useBatteryTypes, 
  useCreateBatteryType, 
  useDeleteBatteryType,
  useUpdateSelfPassword // <--- NOVÝ IMPORT
} from '../hooks/useAppData';

interface SettingsProps {
  objects: BuildingObject[];
}

const Settings: React.FC<SettingsProps> = ({ objects }) => {
  // --- STATE PRO ŠABLONY ---
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- STATE PRO ZÁLOHOVÁNÍ ---
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // --- STATE PRO IMPORT GALAXY ---
  const [galaxyFile, setGalaxyFile] = useState<File | null>(null); // <--- NOVÝ STATE

  // --- STATE PRO KATALOG BATERIÍ ---
  const { data: batteryTypes = [] } = useBatteryTypes();
  const createBatteryTypeMutation = useCreateBatteryType();
  const deleteBatteryTypeMutation = useDeleteBatteryType();
  const [newBt, setNewBt] = useState({ name: '', manufacturer: '', capacityAh: '', voltageV: '' });
  
  // --- STATE PRO ZMĚNU HESLA ---
  const updateSelfPasswordMutation = useUpdateSelfPassword();

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

  // --- HANDLERS PRO ŠABLONY (Zůstávají stejné) ---
  const saveTemplates = async (newTemplates: FormTemplate[]) => {
    try {
      setTemplates(newTemplates);
      await api.saveTemplates(newTemplates);
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      setEditingTemplate(null);
    } catch (err) {
      console.error("Chyba při ukládání:", err);
      alert("Nepodařilo se uložit změny.");
    }
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
    if (!confirm("Opravdu odstranit toto pole?")) return;
    
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.filter(f => f.id !== fieldId)
    });
  };

  // --- HANDLERS PRO BATERIE (Zůstávají stejné) ---
  const handleCreateBt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBt.name || !newBt.capacityAh || !newBt.voltageV) return;

    createBatteryTypeMutation.mutate({
        name: newBt.name,
        manufacturer: newBt.manufacturer,
        capacityAh: Number(newBt.capacityAh),
        voltageV: Number(newBt.voltageV)
    });
    setNewBt({ name: '', manufacturer: '', capacityAh: '', voltageV: '' });
  };

  // --- HANDLERY PRO ZÁLOHU (Zůstávají stejné) ---
  const handleDownloadBackup = async () => {
    try {
      await api.downloadBackup();
    } catch (e) {
      alert("Chyba při stahování zálohy.");
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) return;
    if (!confirm("VAROVÁNÍ: Obnovení ze zálohy PŘEPIŠE všechna současná data! Opravdu pokračovat?")) return;
    
    setIsRestoring(true);
    try {
      await api.restoreBackup(restoreFile);
      alert("Systém byl úspěšně obnoven. Stránka se nyní obnoví.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Chyba při obnově dat. Zkontrolujte soubor zálohy.");
    } finally {
      setIsRestoring(false);
      setRestoreFile(null);
    }
  };
  
  // --- HANDLER PRO ZMĚNU VLASTNÍHO HESLA (Zůstává stejný) ---
  const handleSelfPasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get('currentPassword') as string;
    const newPassword = fd.get('newPassword') as string;
    const confirmPassword = fd.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      alert("Nová hesla se neshodují.");
      return;
    }
    if (!currentPassword || !newPassword) {
        alert("Vyplňte obě pole hesel.");
        return;
    }

    try {
        await updateSelfPasswordMutation.mutateAsync({ currentPassword, newPassword });
        alert("Heslo bylo úspěšně změněno.");
        e.currentTarget.reset();
    } catch (err) {
        console.error("Password change error:", err);
        alert("Změna hesla selhala. Zkontrolujte stávající heslo.");
    }
  };

  // --- NOVÝ HANDLER PRO IMPORT XML ---
  const handleXMLImport = () => {
      if (!galaxyFile) {
          alert("Nejdříve vyberte XML soubor.");
          return;
      }

      const reader = new FileReader();
      
      // KLÍČOVÉ: Číst soubor se správným kódováním, aby se zachovaly české znaky
      // Většina moderních prohlížečů podporuje windows-1250 jako 'windows-1250' nebo 'CP1250'
      reader.readAsText(galaxyFile, 'windows-1250'); 

      reader.onload = (event) => {
          const xmlString = event.target?.result as string;
          
          try {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlString, "text/xml");

              // 1. Kontrola chyb parsování
              if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                  throw new Error("Chyba při parsování XML. Zkontrolujte, zda je soubor platný.");
              }

              // 2. Extrakce názvu
              const nameElement = xmlDoc.getElementsByTagName('Name')[0];
              const fileNameBase = nameElement ? nameElement.textContent?.trim().replace(/[^a-z0-9]/gi, '_') : 'zone_export';
              
              // 3. Extrakce dat z ZoneCollection
              const zones = xmlDoc.getElementsByTagName('Zone');
              let outputContent = 'ID\tDescription\tFunction\n'; // Hlavička
              
              if (zones.length === 0) {
                  alert("V souboru nebyly nalezeny žádné zóny (<Zone>).");
                  return;
              }

              for (const zone of zones) {
                  const id = zone.getAttribute('id') || '';
                  // Použijeme [0]?.textContent pro bezpečné získání vnořeného textu
                  const description = zone.getElementsByTagName('Description')[0]?.textContent?.trim() || 'N/A';
                  const functionText = zone.getElementsByTagName('Function')[0]?.textContent?.trim() || 'N/A';
                  
                  // Přidáme řádek do výstupu
                  outputContent += `${id}\t${description}\t${functionText}\n`;
              }

              // 4. Vytvoření a stažení TXT souboru
              const finalFileName = `${fileNameBase}.txt`;
              const blob = new Blob([outputContent], { type: 'text/plain;charset=windows-1250' }); // Použijeme win-1250 pro výstup
              const url = URL.createObjectURL(blob);
              
              const a = document.createElement('a');
              a.href = url;
              a.download = finalFileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              alert(`Export dokončen: ${finalFileName}`);
              setGalaxyFile(null); // Vyčistit soubor
              
          } catch (e: any) {
              console.error("Chyba při importu XML:", e);
              alert(`Import selhal: ${e.message}`);
          }
      };

      reader.onerror = () => {
          alert("Chyba při čtení souboru (File API error).");
      };
  };
  // --- KONEC NOVÉHO HANDLERU ---

  if (isLoading) {
    return <div className="p-10 text-center text-gray-500">Načítám nastavení...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* Hlavička */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nastavení systému</h2>
          <p className="text-gray-500 dark:text-slate-400">Konfigurace formulářů, katalogu baterií a zálohování.</p>
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

      {/* SEKCE: ZMĚNA HESLA */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 mt-6">
          <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl text-red-600 dark:text-red-400">
                  <Settings2 className="w-6 h-6" />
              </div>
              <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Změna hesla</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Změna vašeho přihlašovacího hesla.</p>
              </div>
          </div>
          
          <form onSubmit={handleSelfPasswordChange} className="space-y-4 max-w-sm">
              <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Stávající heslo</label>
                  <input 
                      name="currentPassword" 
                      type="password" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                  />
              </div>
              <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nové heslo</label>
                  <input 
                      name="newPassword" 
                      type="password" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
              </div>
              <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Potvrdit nové heslo</label>
                  <input 
                      name="confirmPassword" 
                      type="password" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
              </div>
              <button 
                  type="submit" 
                  disabled={updateSelfPasswordMutation.isPending}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 active:scale-95 transition flex items-center justify-center gap-2"
              >
                  {updateSelfPasswordMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Změnit heslo'}
              </button>
          </form>
      </div>

      {/* SEKCE: IMPORT GALAXY XML  <--- NOVÁ SEKCE --- */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 mt-6">
          <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-500/10 rounded-2xl text-fuchsia-600 dark:text-fuchsia-400">
                  <FileText className="w-6 h-6" />
              </div>
              <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Import Galaxy Zón</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Načte zóny z XML souboru a exportuje je do TXT.</p>
              </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col items-center">
              
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                  Vyberte XML soubor (např. z programu Remote Access). Data budou převedena na TXT (ID, Description, Function).
              </p>
              
              {!galaxyFile ? (
                  <label className="cursor-pointer px-6 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white rounded-xl font-bold text-sm hover:border-fuchsia-400 transition-all flex items-center gap-2">
                      <UploadCloud className="w-4 h-4" /> Vybrat XML soubor
                      <input 
                          type="file" 
                          accept=".xml" 
                          className="hidden" 
                          onChange={(e) => setGalaxyFile(e.target.files?.[0] || null)}
                      />
                  </label>
              ) : (
                  <div className="flex flex-col gap-3 w-full max-w-sm">
                      <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {galaxyFile.name}
                      </div>
                      <div className="flex gap-2">
                          <button 
                              onClick={handleXMLImport}
                              className="flex-1 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-fuchsia-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                              <Download className="w-4 h-4" /> Spustit Export TXT
                          </button>
                          <button 
                              onClick={() => setGalaxyFile(null)}
                              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-bold"
                          >
                              Zrušit
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
      {/* KONEC NOVÉ SEKCE --- */}
      
      {/* Pouze Admin může spravovat šablony a baterie */}
      {currentUser?.role === 'ADMIN' ? (
        <>
            {/* 1. KATALOG BATERIÍ (Zůstává stejný) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-2xl text-green-600 dark:text-green-400">
                        <Battery className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Katalog baterií</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Předdefinované typy pro rychlý výběr technikem.</p>
                    </div>
                </div>

                {/* Formulář pro přidání typu baterie */}
                <form onSubmit={handleCreateBt} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <div className="md:col-span-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Název / Model</label>
                        <input 
                            placeholder="Např. NPL 17-12" 
                            required
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                            value={newBt.name}
                            onChange={e => setNewBt({...newBt, name: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Výrobce</label>
                        <input 
                            placeholder="Např. Yuasa" 
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                            value={newBt.manufacturer}
                            onChange={e => setNewBt({...newBt, manufacturer: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kapacita (Ah)</label>
                        <input 
                            placeholder="17" 
                            type="number" step="0.1" required
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                            value={newBt.capacityAh}
                            onChange={e => setNewBt({...newBt, capacityAh: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Napětí (V)</label>
                        <input 
                            placeholder="12" 
                            type="number" step="0.1" required
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                            value={newBt.voltageV}
                            onChange={e => setNewBt({...newBt, voltageV: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                        <button type="submit" className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 hover:bg-green-700 active:scale-95 transition flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </form>

                {/* Seznam typů */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {batteryTypes.map(bt => (
                        <div key={bt.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center font-bold text-xs">
                                    {bt.voltageV}V
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800 dark:text-white text-sm">
                                        {bt.manufacturer} {bt.name}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Kapacita: <span className="font-bold text-gray-600 dark:text-slate-300">{bt.capacityAh} Ah</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => { if(confirm('Smazat tento typ baterie?')) deleteBatteryTypeMutation.mutate(bt.id) }} 
                                className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {batteryTypes.length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
                            Žádné definované typy baterií.
                        </div>
                    )}
                </div>
            </div>

            {/* 2. ŠABLONY DENÍKU (Zůstávají stejné) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 mt-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                    <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Šablony deníku</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Formuláře pro servisní zásahy a revize.</p>
                </div>
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
                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-bold text-sm shadow-sm hover:ring-2 hover:ring-blue-500/20 transition-all"
                    >
                    Upravit
                    </button>
                </div>
                ))}
            </div>
            </div>

            {/* 3. ZÁLOHOVÁNÍ (Zůstává stejné) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 mt-6">
                <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400">
                    <Database className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Záloha a Obnovení</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Kompletní záloha databáze a souborů.</p>
                </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* EXPORT */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                        <Download className="w-10 h-10 text-blue-500 mb-3" />
                        <h4 className="font-bold text-gray-800 dark:text-white mb-1">Stáhnout zálohu</h4>
                        <p className="text-xs text-gray-400 mb-4 max-w-[200px]">
                            Stáhne ZIP archiv obsahující všechna data a nahrané soubory.
                        </p>
                        <button 
                            onClick={handleDownloadBackup}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Exportovat data
                        </button>
                    </div>

                    {/* IMPORT */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                        <Upload className="w-10 h-10 text-amber-500 mb-3" />
                        <h4 className="font-bold text-gray-800 dark:text-white mb-1">Obnovit ze zálohy</h4>
                        <p className="text-xs text-gray-400 mb-4 max-w-[200px]">
                            Nahrajte ZIP soubor. <span className="text-red-500 font-bold">Pozor: Data budou přepsána!</span>
                        </p>
                        
                        {!restoreFile ? (
                            <label className="cursor-pointer px-6 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white rounded-xl font-bold text-sm hover:border-blue-400 transition-all flex items-center gap-2">
                                <UploadCloud className="w-4 h-4" /> Vybrat soubor
                                <input 
                                    type="file" 
                                    accept=".zip" 
                                    className="hidden" 
                                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        ) : (
                            <div className="flex flex-col gap-3 w-full">
                                <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    {restoreFile.name}
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleRestoreBackup}
                                        disabled={isRestoring}
                                        className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                                        {isRestoring ? 'Obnovuji...' : 'Spustit obnovu'}
                                    </button>
                                    <button 
                                        onClick={() => setRestoreFile(null)}
                                        disabled={isRestoring}
                                        className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-bold"
                                    >
                                        Zrušit
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] text-center border border-gray-100 dark:border-slate-800">
          <Settings2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-600 dark:text-slate-400">Přístup odepřen</h3>
          <p className="text-gray-400 dark:text-slate-500">Pouze administrátor může měnit nastavení systému.</p>
        </div>
      )}

      {/* MODAL PRO EDITACI ŠABLONY (Zůstává stejný) */}
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