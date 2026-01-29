import React, { useState, useEffect } from 'react';
import { X, Save, Printer, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, FileText, List as ListIcon, Activity } from 'lucide-react';
import { ServiceReport, ReportMeasurement } from '../../types';
import { getApiService } from '../../services/apiService';

interface ReportWizardModalProps {
  report: ServiceReport;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ServiceReport>) => void;
}

const STEPS = [
  { id: 1, title: 'Základní údaje', icon: <FileText className="w-4 h-4"/> },
  { id: 2, title: 'Měření a Zkoušky', icon: <Activity className="w-4 h-4"/> },
  { id: 3, title: 'Závěr a Tisk', icon: <CheckCircle className="w-4 h-4"/> },
];

export const ReportWizardModal: React.FC<ReportWizardModalProps> = ({ report, onClose, onUpdate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ServiceReport>(report);
  const [isSaving, setIsSaving] = useState(false);

  const api = getApiService();

  // Uložení změn při přechodu mezi kroky nebo manuálně
  const handleSave = async (silent = false) => {
    setIsSaving(true);
    try {
      await onUpdate(formData.id, formData);
      if (!silent) alert('Rozpracovaná revize uložena.');
    } catch (e) {
      alert('Chyba při ukládání.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    await handleSave(true); // Nejdřív uložit
    try {
        await api.downloadReportPdf(formData.id);
    } catch (e) {
        alert('Chyba při generování PDF.');
    }
  };

  // --- RENDEROVÁNÍ KROKŮ ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="grid grid-cols-2 gap-4">
         <div>
            <label className="label-tiny">Číslo protokolu</label>
            <input disabled value={formData.reportNumber} className="input-disabled" />
         </div>
         <div>
            <label className="label-tiny">Technik</label>
            <input disabled value={formData.technicianName} className="input-disabled" />
         </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
         <div>
            <label className="label-tiny">Datum provedení</label>
            <input type="date" value={formData.dateExecution} onChange={e => setFormData({...formData, dateExecution: e.target.value})} className="input-std" />
         </div>
         <div>
            <label className="label-tiny">Datum vystavení</label>
            <input type="date" value={formData.dateIssue} onChange={e => setFormData({...formData, dateIssue: e.target.value})} className="input-std" />
         </div>
         <div>
            <label className="label-tiny">Příští termín</label>
            <input type="date" value={formData.dateNext} onChange={e => setFormData({...formData, dateNext: e.target.value})} className="input-std font-bold text-blue-600" />
         </div>
      </div>

      <div>
         <label className="label-tiny">Předmět revize (Technický popis)</label>
         <textarea 
            value={formData.subject} 
            onChange={e => setFormData({...formData, subject: e.target.value})} 
            className="input-std min-h-[100px]" 
            placeholder="Popis umístění ústředny, typ systému..."
         />
         <p className="text-[10px] text-gray-400 mt-1">Tento text byl předvyplněn z nastavení objektu.</p>
      </div>

      <div>
         <label className="label-tiny">Instalovaná zařízení (Generováno ze systému)</label>
         <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 max-h-40 overflow-y-auto">
            <ul className="list-disc pl-4 text-sm text-gray-600 dark:text-slate-300 space-y-1">
                {formData.deviceList.map((dev, i) => (
                    <li key={i}>{dev}</li>
                ))}
            </ul>
         </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800 dark:text-white">Naměřené hodnoty</h3>
          <span className="text-xs text-gray-400">Automaticky předvyplněno z databáze baterií</span>
       </div>

       <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase text-xs">
                <tr>
                   <th className="px-4 py-3 w-1/2">Měření / Baterie</th>
                   <th className="px-4 py-3">Hodnota</th>
                   <th className="px-4 py-3">Jednotka</th>
                   <th className="px-4 py-3">Verdikt</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {formData.measurements.map((m, idx) => (
                   <tr key={m.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-200">
                         {m.label}
                      </td>
                      <td className="px-4 py-2">
                         <input 
                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={m.value}
                            placeholder="Zadejte hodnotu"
                            onChange={(e) => {
                                const newMeasurements = [...formData.measurements];
                                newMeasurements[idx] = { ...m, value: e.target.value };
                                setFormData({ ...formData, measurements: newMeasurements });
                            }}
                         />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{m.unit}</td>
                      <td className="px-4 py-2">
                         <select 
                            className={`px-2 py-1.5 rounded-lg text-xs font-bold border-none outline-none cursor-pointer ${m.verdict === 'Vyhovuje' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            value={m.verdict}
                            onChange={(e) => {
                                const newMeasurements = [...formData.measurements];
                                newMeasurements[idx] = { ...m, verdict: e.target.value };
                                setFormData({ ...formData, measurements: newMeasurements });
                            }}
                         >
                            <option value="Vyhovuje">Vyhovuje</option>
                            <option value="Nevyhovuje">Nevyhovuje</option>
                         </select>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       
       <div>
          <label className="label-tiny">Závěrečný posudek</label>
          <textarea 
             className="input-std min-h-[120px] font-medium"
             value={formData.conclusion}
             onChange={e => setFormData({...formData, conclusion: e.target.value})}
          />
       </div>

       <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
             <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">Zjištěné závady</h4>
             <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Zde můžete vypsat závady. (V další verzi zde bude výběr z Úkolníčku).
             </p>
             {/* Placeholder pro závady - zatím read-only nebo simple text */}
             <div className="mt-2 text-sm text-gray-500 italic">Bez zjištěných závad.</div>
          </div>
       </div>

       <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-center">
          <button 
             onClick={handlePrint}
             className="flex flex-col items-center justify-center gap-3 p-6 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-3xl transition-all group w-full max-w-sm border-2 border-dashed border-blue-200 dark:border-slate-600"
          >
             <div className="p-4 bg-blue-600 text-white rounded-full shadow-lg group-hover:scale-110 transition-transform">
                <Printer className="w-8 h-8" />
             </div>
             <div className="text-center">
                <span className="block text-lg font-black text-gray-800 dark:text-white">Uložit a Vytisknout</span>
                <span className="text-sm text-gray-500">Stáhne PDF protokol</span>
             </div>
          </button>
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-white/10">
        
        {/* HEADER */}
        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
           <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                 <FileText className="w-5 h-5 text-blue-600" />
                 Průvodce revizí EZS
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                 {formData.reportNumber} • {formData.status === 'DRAFT' ? 'Rozpracováno' : 'Uzavřeno'}
              </p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition text-gray-400">
              <X className="w-6 h-6" />
           </button>
        </div>

        {/* PROGRESS BAR */}
        <div className="px-8 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
           <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 dark:bg-slate-800 -z-0"></div>
              {STEPS.map((s, idx) => {
                 const isActive = s.id === currentStep;
                 const isCompleted = s.id < currentStep;
                 return (
                    <div key={s.id} className="relative z-10 flex flex-col items-center gap-2 cursor-pointer" onClick={() => setCurrentStep(s.id)}>
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${isActive ? 'bg-blue-600 text-white scale-110' : isCompleted ? 'bg-green-500 text-white' : 'bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-400'}`}>
                          {isCompleted ? <CheckCircle className="w-5 h-5" /> : s.icon}
                       </div>
                       <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{s.title}</span>
                    </div>
                 )
              })}
           </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900">
           {currentStep === 1 && renderStep1()}
           {currentStep === 2 && renderStep2()}
           {currentStep === 3 && renderStep3()}
        </div>

        {/* FOOTER */}
        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
           <button 
              onClick={() => handleSave()} 
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-blue-600 font-bold text-sm transition"
           >
              <Save className="w-4 h-4" /> {isSaving ? 'Ukládám...' : 'Uložit rozpracované'}
           </button>

           <div className="flex gap-3">
              {currentStep > 1 && (
                 <button 
                    onClick={() => setCurrentStep(c => c - 1)}
                    className="px-6 py-3 rounded-xl border border-gray-300 dark:border-slate-700 font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition flex items-center gap-2"
                 >
                    <ChevronLeft className="w-4 h-4" /> Zpět
                 </button>
              )}
              {currentStep < 3 && (
                 <button 
                    onClick={() => setCurrentStep(c => c + 1)}
                    className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition flex items-center gap-2"
                 >
                    Další krok <ChevronRight className="w-4 h-4" />
                 </button>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

// Pomocné styly (pokud nepoužíváte globální třídu)
const labelStyle = "block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2";
const inputStyle = "w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-xl outline-none font-bold transition-all";
const disabledInputStyle = "w-full px-4 py-3 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500 rounded-xl font-bold cursor-not-allowed";