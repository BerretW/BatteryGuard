import React, { useState } from "react";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  BuildingObject,
  ObjectGroup,
  BatteryStatus,
  TechType,
  DeviceType,
  RegularEvent,
  FormTemplate,
  ObjectTask,       // <--- NOVÉ
  TaskPriority,     // <--- NOVÉ
  TaskStatus,        // <--- NOVÉ,
  BatteryType
} from "../../types";
import { getApiService } from "../../services/apiService";
import { Technology } from "../../types"
import { useBatteryTypes } from "../../hooks/useAppData"; // Nový hook
// Generic Modal Wrapper
const Modal: React.FC<{
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}> = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10 max-h-[90vh] flex flex-col">
      <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-black text-gray-800 dark:text-white tracking-tight uppercase">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-8 overflow-y-auto no-scrollbar">{children}</div>
    </div>
  </div>
);

// Props interface containing state and handlers
interface ObjectModalsProps {
  // --- TECH ---
  isTechModalOpen: boolean;
  setTechModalOpen: (open: boolean) => void;
  onAddTechnology: (e: React.FormEvent<HTMLFormElement>) => void;
  editingTech: Technology | null; // <--- NOVÉ
  // --- BATTERY ---
  isBatteryModalOpen: { techId: string } | null;
  setBatteryModalOpen: (val: { techId: string } | null) => void;
  onAddBattery: (e: React.FormEvent<HTMLFormElement>) => void;

  // --- CONTACT ---
  isContactModalOpen: boolean;
  setContactModalOpen: (open: boolean) => void;
  onAddContact: (e: React.FormEvent<HTMLFormElement>) => void;

  // --- EVENT (Scheduled) ---
  isEventModalOpen: boolean;
  setEventModalOpen: (open: boolean) => void;
  editingEvent: RegularEvent | null;
  onSaveEvent: (e: React.FormEvent<HTMLFormElement>) => void;

  // --- TASK (Úkolníček) [NOVÉ] ---
  isTaskModalOpen: boolean;
  setTaskModalOpen: (open: boolean) => void;
  editingTask: ObjectTask | null;
  onSaveTask: (e: React.FormEvent<HTMLFormElement>) => void;

  // --- EDIT OBJECT ---
  isEditObjectModalOpen: boolean;
  setEditObjectModalOpen: (open: boolean) => void;
  onEditObject: (e: React.FormEvent<HTMLFormElement>) => void;
  object: BuildingObject;
  groups: ObjectGroup[];

  // --- LOG ENTRY ---
  isLogModalOpen: boolean;
  setLogModalOpen: (open: boolean) => void;
  templates: FormTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  logFormData: Record<string, string>;
  setLogFormData: (data: Record<string, string>) => void;
  onAddLogEntry: (futureNote: string, images?: string[]) => void;
}

export const ObjectModals: React.FC<ObjectModalsProps> = (props) => {
  // Lokální state pro nahrávání souborů v Log Modalu
  const [logFiles, setLogFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { data: batteryTypes = [] } = useBatteryTypes();
  const [selectedBatteryTypeId, setSelectedBatteryTypeId] = useState<string>("");
  // Handler pro odeslání logu včetně uploadu obrázků
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const futureNoteInput = form.elements.namedItem('futureNote') as HTMLTextAreaElement | null;
    const futureNoteValue = futureNoteInput ? futureNoteInput.value : '';

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      if (logFiles.length > 0) {
        const api = getApiService();
        for (const file of logFiles) {
          const response = await api.uploadFile(file);
          if (response && response.url) {
            uploadedUrls.push(response.url);
          }
        }
      }

      props.onAddLogEntry(futureNoteValue, uploadedUrls);
      setLogFiles([]);
    } catch (error) {
      console.error("Chyba při ukládání záznamu:", error);
      alert("Chyba při ukládání záznamu.");
    } finally {
      setIsUploading(false);
    }
  };
const [batForm, setBatForm] = useState({
    capacityAh: '',
    voltageV: '',
    manufacturer: '', // Toto asi uložíme do serialNumber nebo Notes, protože Battery model nemá manufacturer field (dle types.ts)
    notes: ''
});

// Handler pro změnu typu
const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeId = e.target.value;
    setSelectedBatteryTypeId(typeId);
    
    const type = batteryTypes.find(t => t.id === typeId);
    if (type) {
        setBatForm({
            ...batForm,
            capacityAh: type.capacityAh.toString(),
            voltageV: type.voltageV.toString(),
            // Značku a model uložíme do poznámky, pokud tam nic není, nebo přepíšeme
            notes: `${type.manufacturer} ${type.name}` 
        });
    }
};
  return (
    <>
      {/* 1. Modal: ADD / EDIT TECHNOLOGY */}
      {props.isTechModalOpen && (
        <Modal
          title={props.editingTech ? "Upravit zařízení" : "Přidat zařízení"}
          onClose={() => props.setTechModalOpen(false)}
        >
          <form onSubmit={props.onAddTechnology} className="space-y-6">
            {props.editingTech && (
              <input type="hidden" name="id" value={props.editingTech.id} />
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                Název (Identifikátor)
              </label>
              <input
                name="name"
                defaultValue={props.editingTech?.name}
                required
                placeholder="Např. ZDR-01 (Zdroj chodba)"
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
              />
            </div>

            {/* DVA SELECTY VEDLE SEBE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                  Systém
                </label>
                <select
                  name="type"
                  defaultValue={props.editingTech?.type}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold text-sm"
                >
                  {Object.entries(TechType).map(([key, value]) => (
                    <option key={key} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                  Typ zařízení
                </label>
                <select
                  name="deviceType"
                  defaultValue={props.editingTech?.deviceType}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold text-sm"
                >
                  {Object.values(DeviceType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                Umístění
              </label>
              <input
                name="location"
                defaultValue={props.editingTech?.location}
                required
                placeholder="Např. 3.NP, Místnost 302"
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              {props.editingTech ? "Uložit změny" : "Přidat zařízení"}
            </button>
          </form>
        </Modal>
      )}
      {/* 2. Modal: ADD BATTERY */}
      {props.isBatteryModalOpen && (
<Modal title="Nová baterie" onClose={() => props.setBatteryModalOpen(null)}>
  <form onSubmit={props.onAddBattery} className="space-y-4">
    
    {/* VÝBĚR Z KATALOGU */}
    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl mb-4 border border-blue-100 dark:border-blue-900/30">
        <label className="block text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
            Rychlý výběr z katalogu
        </label>
        <select 
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 dark:border-blue-800"
            value={selectedBatteryTypeId}
            onChange={handleTypeChange}
        >
            <option value="">-- Ruční zadání --</option>
            {batteryTypes.map(bt => (
                <option key={bt.id} value={bt.id}>
                    {bt.manufacturer} {bt.name} ({bt.capacityAh}Ah / {bt.voltageV}V)
                </option>
            ))}
        </select>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
          Kapacita (Ah)
        </label>
        <input
          name="capacityAh"
          type="number"
          step="0.1"
          required
          value={batForm.capacityAh}
          onChange={e => setBatForm({...batForm, capacityAh: e.target.value})}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
          Napětí (V)
        </label>
        <input
          name="voltageV"
          type="number"
          step="0.1"
          required
          value={batForm.voltageV}
          onChange={e => setBatForm({...batForm, voltageV: e.target.value})}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
    
    {/* ... Datumy instalace a výměny zůstávají stejné ... */}
     <div className="grid grid-cols-2 gap-4">
        <div>
        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
            Datum instalace
        </label>
        <input
            name="installDate"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        </div>
        <div>
        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
            Příští výměna
        </label>
        <input
            name="nextReplacementDate"
            type="date"
            required
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        </div>
    </div>

    <div>
      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
        Sériové číslo
      </label>
      <input
        name="serialNumber"
        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* Poznámka se předvyplní názvem baterie */}
    <div>
        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
            Poznámka / Typ
        </label>
        <input 
            name="notes"
            value={batForm.notes}
            onChange={e => setBatForm({...batForm, notes: e.target.value})}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Specifikace baterie..."
        />
    </div>

    <div>
      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
        Stav
      </label>
      <select
        name="status"
        defaultValue={BatteryStatus.HEALTHY}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value={BatteryStatus.HEALTHY}>V pořádku (Healthy)</option>
        <option value={BatteryStatus.WARNING}>Varování (Warning)</option>
        <option value={BatteryStatus.CRITICAL}>Kritický (Critical)</option>
        <option value={BatteryStatus.REPLACED}>Vyměněno (Replaced)</option>
      </select>
    </div>
    
    <button
      type="submit"
      className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-500/20 active:scale-95 transition-all"
    >
      Uložit baterii
    </button>
  </form>
</Modal>
)}

      {/* 3. Modal: CONTACT */}
      {props.isContactModalOpen && (
        <Modal
          title="Přidat kontakt"
          onClose={() => props.setContactModalOpen(false)}
        >
          <form onSubmit={props.onAddContact} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                Jméno a příjmení
              </label>
              <input
                name="name"
                required
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                Role / Pozice
              </label>
              <input
                name="role"
                required
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
                placeholder="Např. Správce budovy"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                  Telefon
                </label>
                <input
                  name="phone"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
                  placeholder="+420..."
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                  E-mail
                </label>
                <input
                  name="email"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
                  placeholder="email@domena.cz"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Uložit kontakt
            </button>
          </form>
        </Modal>
      )}

      {/* 4. Modal: EVENT (Planned Maintenance) */}
      {props.isEventModalOpen && (
        <Modal
          title={props.editingEvent ? "Upravit událost" : "Nová událost"}
          onClose={() => props.setEventModalOpen(false)}
        >
          <form onSubmit={props.onSaveEvent} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                Název úkonu
              </label>
              <input
                name="title"
                defaultValue={props.editingEvent?.title}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Např. Roční revize EPS"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                Opakování / Interval
              </label>
              <select
                name="interval"
                defaultValue={props.editingEvent?.interval || "Ročně"}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Jednorázově">Jednorázově (Neopakuje se)</option>
                <option value="Měsíčně">Měsíčně</option>
                <option value="Čtvrtletně">Čtvrtletně</option>
                <option value="Pololetně">Pololetně</option>
                <option value="Ročně">Ročně</option>
                <option value="Každé 2 roky">Každé 2 roky</option>
                <option value="Každé 4 roky">Každé 4 roky</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Plánované datum
                </label>
                <input
                  name="nextDate"
                  type="date"
                  defaultValue={props.editingEvent?.nextDate}
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Počáteční datum
                </label>
                <input
                  name="startDate"
                  type="date"
                  defaultValue={props.editingEvent?.startDate || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                Popis
              </label>
              <textarea
                name="description"
                defaultValue={props.editingEvent?.description}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Podrobnosti k úkolu..."
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Uložit událost
            </button>
          </form>
        </Modal>
      )}

      {/* 5. Modal: EDIT OBJECT */}
      {props.isEditObjectModalOpen && (
        <Modal
          title="Upravit objekt"
          onClose={() => props.setEditObjectModalOpen(false)}
        >
          <form onSubmit={props.onEditObject} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                Název objektu
              </label>
              <input
                name="name"
                defaultValue={props.object.name}
                required
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                Zákazník / Skupina
              </label>
              <select
                name="groupId"
                defaultValue={props.object.groupId}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
              >
                <option value="">Bez skupiny</option>
                {props.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                Adresa
              </label>
              <input
                name="address"
                defaultValue={props.object.address}
                required
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                  Lat (Šířka)
                </label>
                <input
                  name="lat"
                  type="number"
                  step="any"
                  defaultValue={props.object.lat}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
                  placeholder="50.0..."
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                  Lng (Délka)
                </label>
                <input
                  name="lng"
                  type="number"
                  step="any"
                  defaultValue={props.object.lng}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
                  placeholder="14.4..."
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                Interní poznámka
              </label>
              <textarea
                name="internalNotes"
                defaultValue={props.object.internalNotes}
                className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold"
                rows={5}
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Uložit změny
            </button>
          </form>
        </Modal>
      )}

      {/* 6. Modal: ADD LOG ENTRY */}
      {props.isLogModalOpen && (
        <Modal
          title="Nový záznam"
          onClose={() => {
            props.setLogModalOpen(false);
            setLogFiles([]);
          }}
        >
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                Typ záznamu
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {props.templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => props.setSelectedTemplateId(t.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${props.selectedTemplateId === t.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"
                      }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              {/* Dynamická pole šablony */}
              {props.templates
                .find((t) => t.id === props.selectedTemplateId)
                ?.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                      {field.label}{" "}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        required={field.required}
                        onChange={(e) =>
                          props.setLogFormData({
                            ...props.logFormData,
                            [field.id]: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    ) : field.type === "select" ? (
                      <select
                        required={field.required}
                        onChange={(e) =>
                          props.setLogFormData({
                            ...props.logFormData,
                            [field.id]: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Vyberte...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        onChange={(e) =>
                          props.setLogFormData({
                            ...props.logFormData,
                            [field.id]: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}

              {/* --- SEKCE PRO PŘÍLOHY (FOTKY) --- */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Přílohy (Fotografie)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    if (e.target.files) {
                      setLogFiles(Array.from(e.target.files));
                    }
                  }}
                  className="w-full text-sm text-slate-500 dark:text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-xl file:border-0
                      file:text-xs file:font-black file:uppercase
                      file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-600 dark:file:text-blue-400
                      hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 cursor-pointer"
                />
                {logFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {logFiles.map((f, i) => (
                      <span
                        key={i}
                        className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-gray-600 dark:text-slate-300 font-medium border border-gray-200 dark:border-slate-700"
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* --- SEKCE PRO PŘÍŠTÍ NÁVŠTĚVU --- */}
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800">
                <label className="block text-xs font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2">
                  Zpráva pro mé budoucí já (Odložená závada)
                </label>
                <textarea
                  name="futureNote"
                  className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl font-medium dark:text-amber-100 outline-none focus:ring-2 focus:ring-amber-500 placeholder-amber-300"
                  rows={2}
                  placeholder="Např. Baterie 2 má zoxidovaný kontakt, příště vyčistit..."
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className={`w-full py-4 rounded-2xl font-black shadow-xl shadow-indigo-500/20 active:scale-95 transition-all mt-4 flex justify-center items-center gap-2 ${isUploading
                    ? "bg-indigo-400 cursor-wait"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
              >
                {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isUploading ? "Nahrávám obrázky..." : "Uložit záznam"}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* 7. Modal: TASK (Úkolníček) - NOVÉ */}
      {props.isTaskModalOpen && (
        <Modal
          title={props.editingTask ? "Upravit úkol" : "Nový úkol"}
          onClose={() => props.setTaskModalOpen(false)}
        >
          <form onSubmit={props.onSaveTask} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Popis úkolu</label>
              <input
                name="description"
                required
                defaultValue={props.editingTask?.description}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Např. Vyměnit zámek u branky"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Priorita</label>
                <select
                  name="priority"
                  defaultValue={props.editingTask?.priority || 'MEDIUM'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Nízká</option>
                  <option value="MEDIUM">Střední</option>
                  <option value="HIGH">Vysoká</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Termín</label>
                <input
                  type="date"
                  name="deadline"
                  required
                  defaultValue={props.editingTask?.deadline || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Stav</label>
              <select
                name="status"
                defaultValue={props.editingTask?.status || 'OPEN'}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OPEN">Založeno</option>
                <option value="IN_PROGRESS">Řeší se</option>
                <option value="DONE">Vyřešeno</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Poznámka</label>
              <textarea
                name="note"
                defaultValue={props.editingTask?.note}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
              Uložit úkol
            </button>
          </form>
        </Modal>
      )}
    </>
  );
};