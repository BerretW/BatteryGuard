import React from 'react';
import { X } from 'lucide-react';
import { BuildingObject, ObjectGroup, BatteryStatus, TechType, RegularEvent, FormTemplate } from '../../types';

// Generic Modal Wrapper
const Modal: React.FC<{ title: string, children: React.ReactNode, onClose: () => void }> = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10 max-h-[90vh] flex flex-col">
      <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-black text-gray-800 dark:text-white tracking-tight uppercase">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-8 overflow-y-auto no-scrollbar">
          {children}
      </div>
    </div>
  </div>
);

// Props interface containing state and handlers
interface ObjectModalsProps {
  isTechModalOpen: boolean;
  setTechModalOpen: (open: boolean) => void;
  onAddTechnology: (e: React.FormEvent<HTMLFormElement>) => void;

  isBatteryModalOpen: { techId: string } | null;
  setBatteryModalOpen: (val: { techId: string } | null) => void;
  onAddBattery: (e: React.FormEvent<HTMLFormElement>) => void;

  isContactModalOpen: boolean;
  setContactModalOpen: (open: boolean) => void;
  onAddContact: (e: React.FormEvent<HTMLFormElement>) => void;

  isEventModalOpen: boolean;
  setEventModalOpen: (open: boolean) => void;
  editingEvent: RegularEvent | null;
  onSaveEvent: (e: React.FormEvent<HTMLFormElement>) => void;

  isEditObjectModalOpen: boolean;
  setEditObjectModalOpen: (open: boolean) => void;
  onEditObject: (e: React.FormEvent<HTMLFormElement>) => void;
  object: BuildingObject;
  groups: ObjectGroup[];

  isLogModalOpen: boolean;
  setLogModalOpen: (open: boolean) => void;
  templates: FormTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  logFormData: Record<string, string>;
  setLogFormData: (data: Record<string, string>) => void;
  onAddLogEntry: (e: React.FormEvent) => void;
}

export const ObjectModals: React.FC<ObjectModalsProps> = (props) => {
  return (
    <>
      {/* 1. Modal: ADD TECHNOLOGY */}
      {props.isTechModalOpen && (
        <Modal title="Přidat systém" onClose={() => props.setTechModalOpen(false)}>
          <form onSubmit={props.onAddTechnology} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Název systému</label>
              <input name="name" required placeholder="Např. Hlavní ústředna EPS" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Typ technologie</label>
              <select name="type" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold">
                {Object.values(TechType).map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Umístění</label>
              <input name="location" required placeholder="Např. 1.NP, Místnost serverovny" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Uložit systém</button>
          </form>
        </Modal>
      )}

      {/* 2. Modal: ADD BATTERY */}
      {props.isBatteryModalOpen && (
        <Modal title="Nová baterie" onClose={() => props.setBatteryModalOpen(null)}>
          <form onSubmit={props.onAddBattery} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Kapacita (Ah)</label>
                    <input name="capacityAh" type="number" step="0.1" required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Napětí (V)</label>
                    <input name="voltageV" type="number" step="0.1" required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Datum instalace</label>
                    <input name="installDate" type="date" required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Příští výměna</label>
                    <input name="nextReplacementDate" type="date" required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Sériové číslo</label>
                <input name="serialNumber" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Stav</label>
              <select name="status" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value={BatteryStatus.HEALTHY}>V pořádku (Healthy)</option>
                <option value={BatteryStatus.WARNING}>Varování (Warning)</option>
                <option value={BatteryStatus.CRITICAL}>Kritický (Critical)</option>
                <option value={BatteryStatus.REPLACED}>Vyměněno (Replaced)</option>
              </select>
            </div>
            <button type="submit" className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-500/20 active:scale-95 transition-all">Uložit baterii</button>
          </form>
        </Modal>
      )}

      {/* 3. Modal: CONTACT */}
      {props.isContactModalOpen && (
        <Modal title="Přidat kontakt" onClose={() => props.setContactModalOpen(false)}>
          <form onSubmit={props.onAddContact} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Jméno a příjmení</label>
              <input name="name" required className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Role / Pozice</label>
              <input name="role" required className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="Např. Správce budovy" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Telefon</label>
                <input name="phone" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="+420..." />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">E-mail</label>
                <input name="email" className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="email@domena.cz" />
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Uložit kontakt</button>
          </form>
        </Modal>
      )}

      {/* 4. Modal: EVENT (Planned Maintenance) */}
      {props.isEventModalOpen && (
        <Modal title={props.editingEvent ? "Upravit událost" : "Nová událost"} onClose={() => props.setEventModalOpen(false)}>
             <form onSubmit={props.onSaveEvent} className="space-y-4">
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Název úkonu</label>
                    <input name="title" defaultValue={props.editingEvent?.title} required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Např. Roční revize EPS" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Datum provedení</label>
                        <input name="startDate" type="date" defaultValue={props.editingEvent?.startDate} required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                     </div>
                     <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Příští termín</label>
                        <input name="nextDate" type="date" defaultValue={props.editingEvent?.nextDate} required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                     </div>
                </div>
                <div>
                     <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Interval opakování</label>
                     <select name="interval" defaultValue={props.editingEvent?.interval} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                         <option value="Měsíčně">Měsíčně</option>
                         <option value="Čtvrtletně">Čtvrtletně</option>
                         <option value="Pololetně">Pololetně</option>
                         <option value="Ročně">Ročně</option>
                         <option value="Každé 2 roky">Každé 2 roky</option>
                     </select>
                </div>
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Popis</label>
                    <textarea name="description" defaultValue={props.editingEvent?.description} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Uložit událost</button>
             </form>
        </Modal>
      )}

      {/* 5. Modal: EDIT OBJECT */}
      {props.isEditObjectModalOpen && (
        <Modal title="Upravit objekt" onClose={() => props.setEditObjectModalOpen(false)}>
          <form onSubmit={props.onEditObject} className="space-y-6">
             <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Název objektu</label>
              <input name="name" defaultValue={props.object.name} required className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Zákazník / Skupina</label>
              <select name="groupId" defaultValue={props.object.groupId} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold">
                <option value="">Bez skupiny</option>
                {props.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Adresa</label>
              <input name="address" defaultValue={props.object.address} required className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" />
            </div>

            {/* --- NOVÁ SEKCE PRO SOUŘADNICE --- */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Lat (Šířka)</label>
                <input name="lat" type="number" step="any" defaultValue={props.object.lat} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="50.0..." />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Lng (Délka)</label>
                <input name="lng" type="number" step="any" defaultValue={props.object.lng} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" placeholder="14.4..." />
              </div>
            </div>
            {/* ---------------------------------- */}

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Interní poznámka</label>
              <textarea name="internalNotes" defaultValue={props.object.internalNotes} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" rows={5}></textarea>
            </div>
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Uložit změny</button>
          </form>
        </Modal>
      )}
      {/* 6. Modal: ADD LOG ENTRY */}
      {props.isLogModalOpen && (
        <Modal title="Nový záznam" onClose={() => props.setLogModalOpen(false)}>
          <div className="space-y-6">
            <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Typ záznamu</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {props.templates.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => props.setSelectedTemplateId(t.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${props.selectedTemplateId === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700'}`}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>
            
            <form onSubmit={props.onAddLogEntry} className="space-y-4">
                {props.templates.find(t => t.id === props.selectedTemplateId)?.fields.map(field => (
                    <div key={field.id}>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea 
                                required={field.required}
                                onChange={(e) => props.setLogFormData({...props.logFormData, [field.id]: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                        ) : field.type === 'select' ? (
                            <select
                                required={field.required}
                                onChange={(e) => props.setLogFormData({...props.logFormData, [field.id]: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Vyberte...</option>
                                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : (
                            <input 
                                type={field.type}
                                required={field.required}
                                onChange={(e) => props.setLogFormData({...props.logFormData, [field.id]: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        )}
                    </div>
                ))}
                 <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 active:scale-95 transition-all mt-4">Uložit záznam</button>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
};