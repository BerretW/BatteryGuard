import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, Printer, ChevronRight, ChevronLeft, CheckCircle, 
  FileText, Activity, RefreshCw, Building2 
} from 'lucide-react';
import { ServiceReport, MeasurementDefinition, BuildingObject } from '../../types';
import { useCompanySettings, useObject, useGroups } from '../../hooks/useAppData';

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

  // --- DATA FETCHING ---
  const { data: company } = useCompanySettings();        // Dodavatel (My)
  const { data: objectData } = useObject(report.objectId); // Objekt (Místo)
  const { data: groups = [] } = useGroups();             // Skupiny (Odběratel)

  // --- ODVOZENÍ ODBĚRATELE (ZÁKAZNÍKA) ---
  const customerInfo = useMemo(() => {
    if (!objectData || !objectData.groupId) return null;
    
    const group = groups.find(g => g.id === objectData.groupId);
    if (!group) return null;

    // Pokud má skupina vyplněné fakturační údaje, použijeme je
    if (group.billingInfo && group.billingInfo.name) {
        return {
            name: group.billingInfo.name,
            address: `${group.billingInfo.address.street}, ${group.billingInfo.address.city} ${group.billingInfo.address.zipCode}`,
            ico: group.billingInfo.ico,
            dic: group.billingInfo.dic
        };
    }

    // Jinak použijeme jen název skupiny a obecnou poznámku (fallback)
    return {
        name: group.name,
        address: 'Adresa neuvedena (nastavte ve správě skupin)',
        ico: '',
        dic: ''
    };
  }, [objectData, groups]);

  // --- HANDLERS ---
  const handleSave = async (silent = false) => {
    setIsSaving(true);
    try {
      await onUpdate(formData.id, formData);
      if (!silent) alert('Protokol uložen.');
    } catch (e) {
      alert('Chyba při ukládání.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    await handleSave(true);
    setTimeout(() => {
        window.print();
    }, 100);
  };

  // --- AUTOMATICKÉ GENEROVÁNÍ MĚŘENÍ ---
  const handleAutoGenerateMeasurements = () => {
    if (!objectData) return;
    
    if (formData.measurements.length > 0) {
        if (!confirm("Tato akce PŘEPIŠE stávající tabulku měření. Chcete pokračovat?")) return;
    }

    // 1. Načtení definic z nastavení (localStorage)
    const savedDefs = localStorage.getItem('measurement_defs');
    const definitions: MeasurementDefinition[] = savedDefs ? JSON.parse(savedDefs) : [
        { deviceType: 'BATTERY', measurements: ['Napětí (V)', 'Kapacitní zkouška'] }
    ];
    
    // Najdeme definici pro baterie
    const batteryDef = definitions.find(d => d.deviceType === 'BATTERY');
    const batteryTests = batteryDef ? batteryDef.measurements : ['Napětí (V)', 'Vnitřní odpor'];

    const newMeasurements: any[] = [];
    let counter = 1;

    // 2. Iterace přes technologie a baterie
    objectData.technologies.forEach(tech => {
        // Zde můžeme přidat i testy pro ústředny, detektory atd. pokud bychom je definovali
        
        // Pokud má technologie baterie, vygenerujeme sekci
        if (tech.batteries && tech.batteries.length > 0) {
            // Nadpis sekce (Technologie)
            newMeasurements.push({
                id: `header-${tech.id}`,
                label: `Zdroj: ${tech.name} (${tech.location})`,
                value: '',
                unit: '',
                verdict: '',
                isHeader: true,
                info: ''
            });

            // Řádky pro baterie
            tech.batteries.forEach((bat, batIdx) => {
                const installDate = bat.installDate ? new Date(bat.installDate).toLocaleDateString('cs-CZ') : 'Neznámé';
                const ageInfo = `Instalace: ${installDate} | Kapacita: ${bat.capacityAh}Ah`;

                // Pro každou definovanou zkoušku (např. Napětí, Zátěž) vytvoříme řádek
                batteryTests.forEach(testName => {
                    newMeasurements.push({
                        id: `meas-${bat.id}-${testName}-${counter++}`,
                        label: `Aku ${batIdx + 1}: ${testName}`,
                        value: '', // Technik doplní hodnotu
                        unit: testName.toLowerCase().includes('napětí') ? 'V' : '',
                        verdict: 'Vyhovuje',
                        isHeader: false,
                        info: ageInfo // <--- ZDE SE UKLÁDÁ DATUM INSTALACE
                    });
                });
            });
        }
    });

    if (newMeasurements.length === 0) {
        alert("Nebyly nalezeny žádné baterie nebo definice měření.");
        return;
    }

    setFormData({
        ...formData,
        measurements: newMeasurements
    });
  };

  // --- RENDER KROKŮ ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="grid grid-cols-2 gap-4">
         <div>
            <label className="label-tiny">Číslo protokolu</label>
            <input disabled value={formData.reportNumber} className="input-disabled" />
         </div>
         <div>
            <label className="label-tiny">Technik</label>
            <input value={formData.technicianName} onChange={e => setFormData({...formData, technicianName: e.target.value})} className="input-std" />
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
      </div>

      {/* Info o odběrateli pro kontrolu */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
          <h4 className="text-xs font-bold uppercase text-blue-600 mb-2 flex items-center gap-2">
             <Building2 className="w-4 h-4" /> Fakturační údaje (Odběratel)
          </h4>
          {customerInfo ? (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-bold">{customerInfo.name}</p>
                  <p>{customerInfo.address}</p>
                  {(customerInfo.ico || customerInfo.dic) && <p className="text-xs mt-1 text-gray-500">IČ: {customerInfo.ico} {customerInfo.dic && `/ DIČ: ${customerInfo.dic}`}</p>}
              </div>
          ) : (
              <p className="text-sm text-gray-500 italic">Objekt není přiřazen k žádné skupině/zákazníkovi. V protokolu bude jako odběratel uveden název objektu.</p>
          )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800 dark:text-white">Naměřené hodnoty</h3>
          
          <button 
            onClick={handleAutoGenerateMeasurements}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 transition shadow-sm border border-blue-100 dark:border-blue-800"
            title="Smaže tabulku a načte aktuální baterie z objektu"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Načíst z objektu
          </button>
       </div>

       <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase text-xs">
                <tr>
                   <th className="px-4 py-3 w-5/12">Měření / Zařízení</th>
                   <th className="px-4 py-3 w-2/12">Info (Instalace)</th>
                   <th className="px-4 py-3 w-2/12">Hodnota</th>
                   <th className="px-4 py-3 w-1/12">Jednotka</th>
                   <th className="px-4 py-3 w-2/12">Verdikt</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {formData.measurements.map((m, idx) => {
                   // RENDER HLAVIČKY (Zdroje)
                   if (m.isHeader) {
                       return (
                           <tr key={m.id} className="bg-gray-100 dark:bg-slate-800/50">
                               <td colSpan={5} className="px-4 py-2 font-black text-xs uppercase text-gray-700 dark:text-slate-300 tracking-wider">
                                   {m.label}
                               </td>
                           </tr>
                       );
                   }
                   // RENDER MĚŘENÍ
                   return (
                   <tr key={m.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-200">
                         {m.label}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 italic">
                         {m.info || '-'}
                      </td>
                      <td className="px-4 py-2">
                         <input 
                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={m.value}
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
                )})}
                {formData.measurements.length === 0 && (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                            Zatím žádná měření. Klikněte na "Načíst z objektu".
                        </td>
                    </tr>
                )}
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
                <span className="text-sm text-gray-500">Otevře dialog pro tisk</span>
             </div>
          </button>
       </div>
    </div>
  );

  return (
    <>
      {/* --- EDIT MODAL (UI Aplikace) --- */}
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 no-print">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-white/10">
          
          {/* HEADER */}
          <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Průvodce revizí
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {formData.reportNumber}
                </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition text-gray-400">
                <X className="w-6 h-6" />
            </button>
          </div>

          {/* STEPS */}
          <div className="px-8 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
             <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 dark:bg-slate-800 -z-0"></div>
                {STEPS.map((s) => {
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
             <button onClick={() => handleSave()} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-blue-600 font-bold text-sm transition">
                <Save className="w-4 h-4" /> {isSaving ? 'Ukládám...' : 'Uložit rozpracované'}
             </button>
             <div className="flex gap-3">
                {currentStep > 1 && (
                   <button onClick={() => setCurrentStep(c => c - 1)} className="px-6 py-3 rounded-xl border border-gray-300 dark:border-slate-700 font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition flex items-center gap-2">
                      <ChevronLeft className="w-4 h-4" /> Zpět
                   </button>
                )}
                {currentStep < 3 && (
                   <button onClick={() => setCurrentStep(c => c + 1)} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition flex items-center gap-2">
                      Další krok <ChevronRight className="w-4 h-4" />
                   </button>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* --- PRINT AREA (Portal) --- */}
      {createPortal(
        <div id="print-area" className="hidden">
          <div className="p-8 max-w-[210mm] mx-auto bg-white text-black font-sans text-sm">
            
            {/* HEADER */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
              <div className="w-1/2">
                  <h1 className="text-2xl font-black uppercase mb-1">Servisní Protokol</h1>
                  <p className="font-bold text-lg">{report.type === 'REVIZE_EZS' ? 'Pravidelná revize PZTS' : report.type}</p>
                  <p className="text-sm mt-1">Číslo: <b>{formData.reportNumber}</b></p>
              </div>
              <div className="w-1/2 text-right">
                  <div className="text-xs text-gray-500 mb-1">Dodavatel (Servisní organizace):</div>
                  <div className="font-bold text-lg">{company?.name || 'Neznámý dodavatel'}</div>
                  <div>{company?.address?.street}</div>
                  <div>{company?.address?.city}, {company?.address?.zipCode}</div>
                  <div>IČ: {company?.ico} {company?.dic && `, DIČ: ${company?.dic}`}</div>
                  <div className="mt-1 text-xs">Tel: {company?.phone}, Email: {company?.email}</div>
              </div>
            </div>

            {/* INFO BLOCKS */}
            <div className="print-grid mb-6">
               {/* MÍSTO INSTALACE */}
               <div className="border p-3">
                  <div className="text-xs uppercase text-gray-500 font-bold mb-1">Místo instalace (Objekt):</div>
                  <div className="font-bold text-lg">{objectData?.name}</div>
                  <div>{objectData?.address}</div>
               </div>

               {/* ODBĚRATEL (ZÁKAZNÍK) - Tady je oprava */}
               <div className="border p-3">
                  <div className="text-xs uppercase text-gray-500 font-bold mb-1">Odběratel (Zákazník):</div>
                  {customerInfo ? (
                      <>
                          <div className="font-bold text-lg">{customerInfo.name}</div>
                          <div>{customerInfo.address}</div>
                          <div className="text-xs mt-1">IČ: {customerInfo.ico}</div>
                      </>
                  ) : (
                      <div className="italic text-gray-400">Stejný jako místo instalace</div>
                  )}
               </div>
            </div>

            {/* DATES */}
            <div className="mb-6">
               <table className="print-table">
                  <thead>
                      <tr className="print-header-bg">
                          <th>Datum provedení</th>
                          <th>Datum vystavení</th>
                          <th>Příští termín</th>
                          <th>Technik</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td>{new Date(formData.dateExecution).toLocaleDateString()}</td>
                          <td>{new Date(formData.dateIssue).toLocaleDateString()}</td>
                          <td className="font-bold">{new Date(formData.dateNext).toLocaleDateString()}</td>
                          <td>{formData.technicianName}</td>
                      </tr>
                  </tbody>
               </table>
            </div>

            {/* SUBJECT */}
            <div className="mb-6">
              <h3 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs">Předmět revize / Technický popis</h3>
              <p className="whitespace-pre-wrap">{formData.subject}</p>
            </div>

            {/* MEASUREMENTS */}
            <div className="mb-6">
              <h3 className="font-bold border-b border-gray-300 mb-2 uppercase text-xs">Naměřené hodnoty a zkoušky</h3>
              <table className="print-table text-xs">
                  <thead>
                      <tr className="print-header-bg">
                          <th>Měření / Zařízení</th>
                          <th>Info (Instalace)</th>
                          <th>Hodnota</th>
                          <th>Jednotka</th>
                          <th>Výsledek</th>
                      </tr>
                  </thead>
                  <tbody>
                      {formData.measurements.map((m, i) => {
                          if (m.isHeader) {
                              return (
                                  <tr key={i}>
                                      <td colSpan={5} className="font-bold bg-gray-100">{m.label}</td>
                                  </tr>
                              );
                          }
                          return (
                            <tr key={i}>
                                <td>{m.label}</td>
                                <td className="italic text-gray-500">{m.info}</td>
                                <td>{m.value}</td>
                                <td>{m.unit}</td>
                                <td className={m.verdict === 'Nevyhovuje' ? 'font-bold text-red-600' : ''}>{m.verdict}</td>
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
            </div>

            {/* CONCLUSION */}
            <div className="mb-8 border p-4 bg-gray-50">
               <h3 className="font-bold uppercase text-xs mb-2">Závěrečný posudek</h3>
               <p className="font-bold text-lg">{formData.conclusion}</p>
               <p className="text-xs mt-2 italic">Zařízení je schopno bezpečného provozu za podmínek uvedených v návodu k obsluze.</p>
            </div>

            {/* SIGNATURES */}
            <div className="flex justify-between mt-12 pt-4">
               <div className="text-center w-1/3">
                  <div className="border-b border-black h-12 mb-2"></div>
                  <div className="text-xs uppercase">Razítko a podpis technika</div>
               </div>
               <div className="text-center w-1/3">
                  <div className="border-b border-black h-12 mb-2"></div>
                  <div className="text-xs uppercase">Převzal (Odběratel)</div>
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// Styles
const labelStyle = "block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2";
const inputStyle = "w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-xl outline-none font-bold transition-all";
const disabledInputStyle = "w-full px-4 py-3 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500 rounded-xl font-bold cursor-not-allowed";