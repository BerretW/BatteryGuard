
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, ArrowLeft, MapPin, Plus, History, AlertTriangle, CheckCircle, 
  Clock, Battery as BatteryIcon, Trash2, Calendar, BookOpen, MessageSquare, 
  Edit, Save, ClipboardCheck, ChevronDown, X, Tag, Bell, Share2, Target, 
  Phone, Mail, Users, FileText, Lock, Shield
} from 'lucide-react';
import { BuildingObject, Technology, Battery, TechType, BatteryStatus, LogEntry, FormTemplate, ObjectGroup, RegularEvent, RecurrenceInterval, Contact } from '../types';
import { dataStore } from '../services/dataStore';

interface ObjectDetailProps {
  objects: BuildingObject[];
  setObjects: (objects: BuildingObject[]) => void;
}

const ObjectDetail: React.FC<ObjectDetailProps> = ({ objects, setObjects }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tech' | 'log' | 'events' | 'info'>('tech');
  
  const [isTechModalOpen, setTechModalOpen] = useState(false);
  const [isBatteryModalOpen, setBatteryModalOpen] = useState<{ techId: string } | null>(null);
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isEditObjectModalOpen, setEditObjectModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  
  const [editingEvent, setEditingEvent] = useState<RegularEvent | null>(null);
  const [groups, setGroups] = useState<ObjectGroup[]>([]);

  const object = objects.find(o => o.id === id);

  useEffect(() => {
    setGroups(dataStore.getGroups());
  }, []);

  if (!object) {
    return <div className="p-10 text-center dark:text-slate-400 font-bold">Objekt nebyl nalezen.</div>;
  }

  const handleUpdateContacts = (newContacts: Contact[]) => {
    const updatedObjects = objects.map(o => o.id === id ? { ...o, contacts: newContacts } : o);
    setObjects(updatedObjects);
  };

  const handleRemoveContact = (contactId: string) => {
    if (!confirm('Opravdu smazat kontakt?')) return;
    handleUpdateContacts((object.contacts || []).filter(c => c.id !== contactId));
  };

  const addContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newContact: Contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string
    };
    handleUpdateContacts([...(object.contacts || []), newContact]);
    setContactModalOpen(false);
  };

  const getGroupInfo = (groupId?: string) => {
    const g = groups.find(g => g.id === groupId);
    return g || { name: 'Bez skupiny', color: '#94a3b8' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Dynamic Header */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex gap-5">
            <button 
              onClick={() => navigate('/objects')} 
              className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-all h-fit active:scale-90"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">{object.name}</h1>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
                  {getGroupInfo(object.groupId).name}
                </span>
              </div>
              <div className="flex items-center text-gray-500 dark:text-slate-400 mt-2 font-medium">
                <MapPin className="w-4 h-4 mr-1.5 text-blue-500" />
                <span className="text-sm">{object.address}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
             <button onClick={() => setLogModalOpen(true)} className="flex-1 md:flex-none px-5 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Nový zápis
            </button>
            <button onClick={() => setEditObjectModalOpen(true)} className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <Edit className="w-4 h-4" /> Upravit objekt
            </button>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex p-1.5 bg-gray-100 dark:bg-slate-900 rounded-[1.5rem] border border-gray-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'tech'} onClick={() => setActiveTab('tech')} icon={<Shield />} label="Technologie" />
        <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={<Users />} label="Kontakty & Info" />
        <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={<Calendar />} label="Plánované" />
        <TabButton active={activeTab === 'log'} onClick={() => setActiveTab('log')} icon={<ClipboardCheck />} label="Deník" />
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
        {activeTab === 'tech' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Seznam systémů</h3>
               <button onClick={() => setTechModalOpen(true)} className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline">
                 <Plus className="w-4 h-4" /> Přidat systém
               </button>
            </div>
            {object.technologies.map(tech => (
              <div key={tech.id} className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl"><Shield className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 dark:text-white leading-tight">{tech.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Lokalita: {tech.location}</p>
                    </div>
                  </div>
                  <button onClick={() => setBatteryModalOpen({ techId: tech.id })} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl font-bold text-xs shadow-sm hover:ring-2 hover:ring-blue-500/20 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-500" /> Baterie
                  </button>
                </div>
                <div className="p-6">
                  {tech.batteries.length === 0 ? (
                    <p className="text-center py-10 text-gray-400 dark:text-slate-600 italic font-medium">Žádné evidované akumulátory.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tech.batteries.map(battery => (
                        <div key={battery.id} className="p-5 rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-200 dark:hover:border-blue-900 transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-2">
                              <BatteryIcon className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                              <span className="font-black text-gray-800 dark:text-slate-200">{battery.capacityAh}Ah / {battery.voltageV}V</span>
                            </div>
                            <StatusBadge status={battery.status} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600">Instalace: {new Date(battery.installDate).toLocaleDateString()}</p>
                            <p className="text-[10px] font-black uppercase text-amber-500">Výměna: {new Date(battery.nextReplacementDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Contacts Section */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-500" /> Kontakty
                </h3>
                <button 
                  onClick={() => setContactModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Přidat kontakt
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(!object.contacts || object.contacts.length === 0) ? (
                  <p className="col-span-full text-center py-6 text-slate-400 dark:text-slate-600 font-medium italic">Žádné uložené kontakty.</p>
                ) : (
                  object.contacts.map(contact => (
                    <div key={contact.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-transparent dark:border-slate-800 rounded-3xl flex justify-between items-start group">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-black text-gray-800 dark:text-white">{contact.name}</h4>
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{contact.role}</p>
                        </div>
                        <div className="space-y-1.5">
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors font-medium">
                            <Phone className="w-4 h-4" /> {contact.phone}
                          </a>
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors font-medium">
                            <Mail className="w-4 h-4" /> {contact.email}
                          </a>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveContact(contact.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Internal Notes Section */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
               <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                  <FileText className="w-6 h-6 text-amber-500" /> Interní poznámky a kódy
               </h3>
               <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-transparent dark:border-slate-800">
                 {object.internalNotes ? (
                   <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium leading-relaxed">
                     {object.internalNotes}
                   </p>
                 ) : (
                   <p className="text-slate-400 dark:text-slate-600 italic font-medium">Žádné interní poznámky k tomuto objektu.</p>
                 )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Časová osa revizí</h3>
               <button onClick={() => { setEditingEvent(null); setEventModalOpen(true); }} className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:underline">
                 <Plus className="w-4 h-4" /> Nová událost
               </button>
            </div>
            {(!object.scheduledEvents || object.scheduledEvents.length === 0) ? (
              <div className="bg-white dark:bg-slate-900 p-16 text-center rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
                <Bell className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-500 dark:text-slate-400">Žádné plánované akce</h3>
              </div>
            ) : (
              object.scheduledEvents.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-6">
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[100px] h-fit">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{new Date(event.nextDate).toLocaleString('cs-CZ', { month: 'short' })}</span>
                    <span className="text-3xl font-black text-indigo-700 dark:text-indigo-400">{new Date(event.nextDate).getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-black text-gray-900 dark:text-white">{event.title}</h4>
                      <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">{event.interval}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400 font-medium mb-4">{event.description}</p>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingEvent(event); setEventModalOpen(true); }} className="px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all">Upravit</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'log' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-4">Historie záznamů</h3>
            {(!object.logEntries || object.logEntries.length === 0) ? (
              <p className="text-center py-10 text-slate-400 dark:text-slate-600 font-medium">Deník je zatím prázdný.</p>
            ) : (
              object.logEntries.map(entry => (
                <div key={entry.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex gap-5">
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl h-fit"><BookOpen className="w-6 h-6" /></div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white text-lg">{entry.templateName}</h4>
                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
                      {new Date(entry.date).toLocaleString()} • {entry.author}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Shared Modal UI */}
      {isContactModalOpen && (
        <Modal title="Přidat kontakt" onClose={() => setContactModalOpen(false)}>
          <form onSubmit={addContact} className="space-y-6">
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

      {/* Edit Object Modal */}
      {isEditObjectModalOpen && (
        <Modal title="Upravit objekt" onClose={() => setEditObjectModalOpen(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const updated = objects.map(o => o.id === id ? {
              ...o,
              name: fd.get('name') as string,
              address: fd.get('address') as string,
              internalNotes: fd.get('internalNotes') as string,
              groupId: fd.get('groupId') as string || undefined
            } : o);
            setObjects(updated);
            setEditObjectModalOpen(false);
          }} className="space-y-6">
             <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Název objektu</label>
              <input name="name" defaultValue={object.name} required className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Zákazník / Skupina</label>
              <select name="groupId" defaultValue={object.groupId} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold">
                <option value="">Bez skupiny</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Adresa</label>
              <input name="address" defaultValue={object.address} required className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Interní poznámka (přístupy, kódy...)</label>
              <textarea name="internalNotes" defaultValue={object.internalNotes} className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:text-white rounded-2xl outline-none font-bold" rows={5}></textarea>
            </div>
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Uložit změny</button>
          </form>
        </Modal>
      )}

      {/* Placeholders for other modals... */}
      {isTechModalOpen && <Modal title="Nový systém" onClose={() => setTechModalOpen(false)}><p className="text-slate-500 font-bold">Formulář se připravuje...</p></Modal>}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm ring-1 ring-gray-200/50 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const Modal: React.FC<{ title: string, children: React.ReactNode, onClose: () => void }> = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10">
      <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
        <h2 className="text-xl font-black text-gray-800 dark:text-white tracking-tight uppercase">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-8 max-h-[75vh] overflow-y-auto no-scrollbar">{children}</div>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: BatteryStatus }> = ({ status }) => {
  const styles = { 
    [BatteryStatus.HEALTHY]: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400', 
    [BatteryStatus.WARNING]: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', 
    [BatteryStatus.CRITICAL]: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', 
    [BatteryStatus.REPLACED]: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' 
  };
  return <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${styles[status]}`}>{status}</span>;
};

export default ObjectDetail;
