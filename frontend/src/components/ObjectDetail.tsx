import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Users, Calendar, ClipboardCheck, AlertCircle, FolderOpen } from 'lucide-react';
import { 
  BuildingObject, BatteryStatus, Contact, RegularEvent, ObjectGroup, 
  TechType, Technology, Battery, LogEntry, FormTemplate, PendingIssue, FileAttachment 
} from '../types';
import { getApiService } from '../services/apiService';
import { authService } from '../services/authService';

// Import sub-components
import { ObjectHeader } from './object-detail/ObjectHeader';
import { TechTab } from './object-detail/TechTab';
import { InfoTab } from './object-detail/InfoTab';
import { EventsTab } from './object-detail/EventsTab';
import { LogTab } from './object-detail/LogTab';
import { FilesTab } from './object-detail/FilesTab'; // <--- NOVÝ IMPORT
import { ObjectModals } from './object-detail/ObjectModals';

interface ObjectDetailProps {
  objects: BuildingObject[];
  setObjects: (objects: BuildingObject[]) => void;
  groups: ObjectGroup[];
}

const ObjectDetail: React.FC<ObjectDetailProps> = ({ objects, setObjects, groups }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = getApiService();
  const currentUser = authService.getCurrentUser();

  // State - PŘIDÁNA 'files' do activeTab
  const [activeTab, setActiveTab] = useState<'tech' | 'log' | 'events' | 'info' | 'files'>('tech');
  
  // Modals state
  const [isTechModalOpen, setTechModalOpen] = useState(false);
  const [isBatteryModalOpen, setBatteryModalOpen] = useState<{ techId: string } | null>(null);
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isEditObjectModalOpen, setEditObjectModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  
  // Form data state
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [logFormData, setLogFormData] = useState<Record<string, string>>({});
  const [editingEvent, setEditingEvent] = useState<RegularEvent | null>(null);

  const object = objects.find(o => o.id === id);

  // Load templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const tpls = await api.getTemplates();
        setTemplates(tpls);
        if (tpls.length > 0) setSelectedTemplateId(tpls[0].id);
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    };
    fetchTemplates();
  }, []);

  if (!object) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-400" />
        <div className="text-xl text-gray-600 font-bold">Objekt nebyl nalezen</div>
        <button onClick={() => navigate('/objects')} className="text-blue-600 hover:underline">Zpět na seznam</button>
      </div>
    );
  }

  // --- Handlers ---
  const updateCurrentObject = (updatedObject: BuildingObject) => {
    const newObjects = objects.map(o => o.id === updatedObject.id ? updatedObject : o);
    setObjects(newObjects);
  };

  const getGroupInfo = (groupId?: string) => {
    const g = groups.find(g => g.id === groupId);
    return g || { name: 'Bez skupiny', color: '#94a3b8' };
  };

  // --- Files / Kartotéka Handlers (NOVÉ) ---
  const addFileToObject = (file: FileAttachment) => {
    const currentFiles = object.files || [];
    updateCurrentObject({ ...object, files: [...currentFiles, file] });
  };

  const removeFileFromObject = (fileId: string) => {
    const currentFiles = object.files || [];
    updateCurrentObject({ ...object, files: currentFiles.filter(f => f.id !== fileId) });
  };

  // Technologies & Batteries
  const handleAddTechnology = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newTech: Technology = {
      id: Math.random().toString(36).substr(2, 9),
      name: fd.get('name') as string,
      type: fd.get('type') as TechType,
      location: fd.get('location') as string,
      batteries: []
    };
    updateCurrentObject({ ...object, technologies: [...object.technologies, newTech] });
    setTechModalOpen(false);
  };

  const removeTechnology = (techId: string) => {
    if(!confirm("Opravdu smazat tento systém?")) return;
    updateCurrentObject({ ...object, technologies: object.technologies.filter(t => t.id !== techId) });
  };

  const handleAddBattery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isBatteryModalOpen) return;
    const fd = new FormData(e.currentTarget);
    const newBattery: Battery = {
      id: Math.random().toString(36).substr(2, 9),
      capacityAh: parseFloat(fd.get('capacityAh') as string),
      voltageV: parseFloat(fd.get('voltageV') as string),
      installDate: fd.get('installDate') as string,
      lastCheckDate: new Date().toISOString().split('T')[0],
      nextReplacementDate: fd.get('nextReplacementDate') as string,
      status: fd.get('status') as BatteryStatus,
      manufactureDate: fd.get('manufactureDate') as string,
      notes: fd.get('notes') as string,
      serialNumber: fd.get('serialNumber') as string
    };
    const updatedTechnologies = object.technologies.map(t => 
      t.id === isBatteryModalOpen.techId ? { ...t, batteries: [...t.batteries, newBattery] } : t
    );
    updateCurrentObject({ ...object, technologies: updatedTechnologies });
    setBatteryModalOpen(null);
  };

  const removeBattery = (techId: string, batteryId: string) => {
    if(!confirm("Smazat baterii?")) return;
    const updatedTechnologies = object.technologies.map(t => 
      t.id === techId ? { ...t, batteries: t.batteries.filter(b => b.id !== batteryId) } : t
    );
    updateCurrentObject({ ...object, technologies: updatedTechnologies });
  };

  // Rychlá změna stavu s automatickým zápisem do logu
  const handleBatteryStatusChange = (techId: string, batteryId: string, newStatus: BatteryStatus) => {
    const tech = object.technologies.find(t => t.id === techId);
    const battery = tech?.batteries.find(b => b.id === batteryId);
    
    if (!tech || !battery || battery.status === newStatus) return;

    const oldStatus = battery.status;
    let updatedBattery = { ...battery, status: newStatus };
    let logNote = 'Automatický záznam z detailu objektu';

    if (newStatus === BatteryStatus.REPLACED) {
        const now = new Date();
        const installDateStr = now.toISOString().split('T')[0];
        
        const nextDate = new Date(now);
        nextDate.setFullYear(nextDate.getFullYear() + 2);
        const nextReplaceStr = nextDate.toISOString().split('T')[0];

        updatedBattery = {
            ...updatedBattery,
            installDate: installDateStr,
            nextReplacementDate: nextReplaceStr
        };

        logNote += `. Aktualizováno datum instalace (${installDateStr}) a další výměny (${nextReplaceStr}).`;
    }

    const newLogEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      templateId: 'system-auto-status',
      templateName: 'Rychlá změna stavu',
      date: new Date().toISOString(),
      author: currentUser?.name || 'Systém',
      data: {
        'Technologie': tech.name,
        'Baterie': `${battery.capacityAh}Ah / ${battery.voltageV}V`,
        'Původní stav': oldStatus,
        'Nový stav': newStatus,
        'Poznámka': logNote
      }
    };

    const updatedTechnologies = object.technologies.map(t => {
      if (t.id !== techId) return t;
      return {
        ...t,
        batteries: t.batteries.map(b => 
          b.id === batteryId ? updatedBattery : b
        )
      };
    });

    updateCurrentObject({
      ...object,
      technologies: updatedTechnologies,
      logEntries: [newLogEntry, ...(object.logEntries || [])]
    });
  };

  // Contacts
  const addContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newContact: Contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: fd.get('name') as string,
      role: fd.get('role') as string,
      phone: fd.get('phone') as string,
      email: fd.get('email') as string
    };
    updateCurrentObject({ ...object, contacts: [...(object.contacts || []), newContact] });
    setContactModalOpen(false);
  };

  const removeContact = (id: string) => {
    if(!confirm("Smazat kontakt?")) return;
    updateCurrentObject({ ...object, contacts: (object.contacts || []).filter(c => c.id !== id) });
  };

  // Events
  const handleSaveEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const eventData: RegularEvent = {
      id: editingEvent ? editingEvent.id : Math.random().toString(36).substr(2, 9),
      title: fd.get('title') as string,
      startDate: fd.get('startDate') as string,
      nextDate: fd.get('nextDate') as string,
      interval: fd.get('interval') as any,
      description: fd.get('description') as string,
      isActive: true,
      precisionOnDay: true
    };
    let newEvents = object.scheduledEvents || [];
    if (editingEvent) {
      newEvents = newEvents.map(ev => ev.id === editingEvent.id ? eventData : ev);
    } else {
      newEvents = [...newEvents, eventData];
    }
    updateCurrentObject({ ...object, scheduledEvents: newEvents });
    setEventModalOpen(false);
    setEditingEvent(null);
  };

  const removeEvent = (id: string) => {
    if(!confirm("Smazat událost?")) return;
    updateCurrentObject({ ...object, scheduledEvents: (object.scheduledEvents || []).filter(e => e.id !== id) });
  };

  // Logs & Future Notes Logic
  // PŘIDÁNO: Podpora pro images argument
  const handleAddLogEntry = (e: React.FormEvent, images: string[] = []) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    // Zkusíme najít futureNote v elements, pokud tam není, je to v pořádku
    const futureNoteInput = form.elements.namedItem('futureNote') as HTMLTextAreaElement | null;
    const futureNote = futureNoteInput ? futureNoteInput.value : '';

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const newEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      templateId: template.id,
      templateName: template.name,
      date: new Date().toISOString(),
      author: currentUser?.name || 'Neznámý',
      data: logFormData,
      images: images // Uložení URL obrázků
    };

    let updatedObject = {
       ...object, 
       logEntries: [newEntry, ...(object.logEntries || [])] 
    };

    if (futureNote && futureNote.trim() !== "") {
        const newIssue: PendingIssue = {
            id: Math.random().toString(36).substr(2, 9),
            text: futureNote,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Neznámý',
            status: 'OPEN'
        };
        updatedObject.pendingIssues = [newIssue, ...(object.pendingIssues || [])];
    }

    updateCurrentObject(updatedObject);
    setLogModalOpen(false);
    setLogFormData({});
  };

  // Pending Issues
  const toggleIssueStatus = (issueId: string) => {
     const updatedIssues = (object.pendingIssues || []).map(issue => 
        issue.id === issueId 
            ? { ...issue, status: issue.status === 'OPEN' ? 'RESOLVED' : 'OPEN' } as PendingIssue
            : issue
     );
     updateCurrentObject({ ...object, pendingIssues: updatedIssues });
  };

  const deleteIssue = (issueId: string) => {
      if(!confirm("Smazat tuto poznámku?")) return;
      const updatedIssues = (object.pendingIssues || []).filter(issue => issue.id !== issueId);
      updateCurrentObject({ ...object, pendingIssues: updatedIssues });
  };

  // Edit Object
  const handleEditObject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const latVal = fd.get('lat');
    const lngVal = fd.get('lng');

    const updated = {
      ...object,
      name: fd.get('name') as string,
      address: fd.get('address') as string,
      internalNotes: fd.get('internalNotes') as string,
      groupId: fd.get('groupId') as string || undefined,
      lat: latVal ? Number(latVal) : undefined,
      lng: lngVal ? Number(lngVal) : undefined
    };
    
    updateCurrentObject(updated);
    setEditObjectModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <ObjectHeader 
        object={object} 
        group={getGroupInfo(object.groupId)}
        onOpenLogModal={() => setLogModalOpen(true)}
        onOpenEditModal={() => setEditObjectModalOpen(true)}
      />

      {/* Navigace záložek */}
      <div className="flex p-1.5 bg-gray-100 dark:bg-slate-900 rounded-[1.5rem] border border-gray-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'tech'} onClick={() => setActiveTab('tech')} icon={<Shield />} label="Technologie" />
        
        {/* NOVÁ ZÁLOŽKA KARTOTÉKA */}
        <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={<FolderOpen />} label="Kartotéka" />
        
        <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={<Users />} label="Kontakty & Info" />
        <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={<Calendar />} label="Plánované" />
        <TabButton active={activeTab === 'log'} onClick={() => setActiveTab('log')} icon={<ClipboardCheck />} label="Deník" />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
        {activeTab === 'tech' && (
          <TechTab 
            technologies={object.technologies}
            onAddTech={() => setTechModalOpen(true)}
            onRemoveTech={removeTechnology}
            onAddBattery={(techId) => setBatteryModalOpen({ techId })}
            onRemoveBattery={removeBattery}
            onStatusChange={handleBatteryStatusChange}
          />
        )}
        
        {/* NOVÝ OBSAH: KARTOTÉKA */}
        {activeTab === 'files' && (
            <FilesTab 
                files={object.files || []} // Defenzivní přístup (kdyby pole v DB chybělo)
                onAddFile={addFileToObject}
                onRemoveFile={removeFileFromObject}
            />
        )}

        {activeTab === 'info' && (
          <InfoTab 
            contacts={object.contacts}
            internalNotes={object.internalNotes}
            onAddContact={() => setContactModalOpen(true)}
            onRemoveContact={removeContact}
          />
        )}
        {activeTab === 'events' && (
          <EventsTab 
            events={object.scheduledEvents}
            pendingIssues={object.pendingIssues || []}
            onAddEvent={() => { setEditingEvent(null); setEventModalOpen(true); }}
            onEditEvent={(ev) => { setEditingEvent(ev); setEventModalOpen(true); }}
            onRemoveEvent={removeEvent}
            onToggleIssue={toggleIssueStatus}
            onDeleteIssue={deleteIssue}
          />
        )}
        {activeTab === 'log' && (
          <LogTab 
            entries={object.logEntries}
            templates={templates}
          />
        )}
      </div>

      <ObjectModals 
        // Tech
        isTechModalOpen={isTechModalOpen}
        setTechModalOpen={setTechModalOpen}
        onAddTechnology={handleAddTechnology}
        
        // Battery
        isBatteryModalOpen={isBatteryModalOpen}
        setBatteryModalOpen={setBatteryModalOpen}
        onAddBattery={handleAddBattery}
        
        // Contact
        isContactModalOpen={isContactModalOpen}
        setContactModalOpen={setContactModalOpen}
        onAddContact={addContact}

        // Event
        isEventModalOpen={isEventModalOpen}
        setEventModalOpen={setEventModalOpen}
        editingEvent={editingEvent}
        onSaveEvent={handleSaveEvent}

        // Object Edit
        isEditObjectModalOpen={isEditObjectModalOpen}
        setEditObjectModalOpen={setEditObjectModalOpen}
        onEditObject={handleEditObject}
        object={object}
        groups={groups}

        // Log
        isLogModalOpen={isLogModalOpen}
        setLogModalOpen={setLogModalOpen}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
        logFormData={logFormData}
        setLogFormData={setLogFormData}
        onAddLogEntry={handleAddLogEntry}
      />
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

export default ObjectDetail;