import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Users, Calendar, ClipboardCheck, AlertCircle, FolderOpen } from 'lucide-react';
import { 
  BuildingObject, BatteryStatus, Contact, RegularEvent, ObjectGroup, 
  TechType, Technology, Battery, LogEntry, FormTemplate, PendingIssue, FileAttachment, ObjectTask 
} from '../types';
import { getApiService } from '../services/apiService';
import { authService } from '../services/authService';

// Import sub-components
import { ObjectHeader } from './object-detail/ObjectHeader';
import { TechTab } from './object-detail/TechTab';
import { InfoTab } from './object-detail/InfoTab';
import { EventsTab } from './object-detail/EventsTab';
import { LogTab } from './object-detail/LogTab';
import { FilesTab } from './object-detail/FilesTab';
import { TasksTab } from './object-detail/TasksTab';
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
  
  // Najdeme objekt v lokálním seznamu (pro prvotní render), ale spoléháme na API
  const object = objects.find(o => o.id === id);

  // UI State
  const [activeTab, setActiveTab] = useState<'tech' | 'log' | 'events' | 'info' | 'files' | 'tasks'>('tech');
  
  // Modals state
  const [isTechModalOpen, setTechModalOpen] = useState(false);
  const [isBatteryModalOpen, setBatteryModalOpen] = useState<{ techId: string } | null>(null);
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isEditObjectModalOpen, setEditObjectModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  
  // Data editing state
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [logFormData, setLogFormData] = useState<Record<string, string>>({});
  const [editingEvent, setEditingEvent] = useState<RegularEvent | null>(null);
  const [editingTask, setEditingTask] = useState<ObjectTask | null>(null);

  // --- DATA LOADING & REFRESH ---

  // 1. Načtení šablon
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

  // 2. Helper pro obnovení dat objektu (Atomická konzistence)
  const reloadObject = useCallback(async () => {
    if (!id) return;
    try {
      const freshObject = await api.getObject(id);
      // Aktualizujeme globální state v App.tsx, aby seznam objektů byl aktuální
      // (ale neposíláme to zpět na server, jen update UI)
      const newObjects = objects.map(o => o.id === freshObject.id ? freshObject : o);
      setObjects(newObjects);
    } catch (e) {
      console.error("Failed to reload object:", e);
    }
  }, [id, objects, setObjects, api]);

  // Pokud objekt neexistuje
  if (!object) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-400" />
        <div className="text-xl text-gray-600 font-bold">Objekt nebyl nalezen</div>
        <button onClick={() => navigate('/objects')} className="text-blue-600 hover:underline">Zpět na seznam</button>
      </div>
    );
  }

  const getGroupInfo = (groupId?: string) => {
    const g = groups.find(g => g.id === groupId);
    return g || { name: 'Bez skupiny', color: '#94a3b8' };
  };

  // --- HANDLERS (ATOMIC OPERATIONS) ---

  // 1. Tasks (Úkolníček)
  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    // Validace
    if (!currentUser) return alert("Musíte být přihlášen.");

    const taskData: any = {
        description: fd.get('description') as string,
        deadline: fd.get('deadline') as string,
        priority: fd.get('priority'),
        status: fd.get('status'),
        note: fd.get('note') as string,
    };

    try {
        if (editingTask) {
             // UPDATE
             await api.updateTask(object.id, editingTask.id, taskData);
        } else {
             // CREATE
             const newTask = {
                 ...taskData,
                 id: Math.random().toString(36).substr(2, 9),
                 createdAt: new Date().toISOString(),
                 createdBy: currentUser.name
             };
             await api.addTask(object.id, newTask);
        }
        await reloadObject();
        setTaskModalOpen(false);
        setEditingTask(null);
    } catch (e) {
        alert("Chyba při ukládání úkolu.");
    }
  };

  const removeTask = async (taskId: string) => {
    if (!confirm("Smazat úkol?")) return;
    try {
        await api.removeTask(object.id, taskId);
        await reloadObject();
    } catch (e) {
        alert("Chyba při mazání úkolu.");
    }
  };
  
  const quickTaskStatusChange = async (task: ObjectTask, newStatus: any) => {
     try {
         await api.updateTask(object.id, task.id, { status: newStatus });
         await reloadObject();
     } catch (e) {
         console.error("Failed to update status", e);
     }
  };

  // 2. Files (Kartotéka)
  const addFileToObject = async (file: FileAttachment) => {
    try {
        await api.addToCollection(object.id, 'files', file);
        await reloadObject();
    } catch (e) {
        alert("Chyba při ukládání souboru.");
    }
  };

  const removeFileFromObject = async (fileId: string) => {
    try {
        await api.removeFromCollection(object.id, 'files', fileId);
        await reloadObject();
    } catch (e) {
        alert("Chyba při mazání souboru.");
    }
  };

  // 3. Technologies & Batteries
  const handleAddTechnology = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newTech: Technology = {
      id: Math.random().toString(36).substr(2, 9),
      name: fd.get('name') as string,
      type: fd.get('type') as TechType,
      location: fd.get('location') as string,
      batteries: []
    };
    try {
        await api.addTechnology(object.id, newTech);
        await reloadObject();
        setTechModalOpen(false);
    } catch (e) {
        alert("Chyba při přidávání systému.");
    }
  };

  const removeTechnology = async (techId: string) => {
    if(!confirm("Opravdu smazat tento systém a všechny jeho baterie?")) return;
    try {
        await api.removeTechnology(object.id, techId);
        await reloadObject();
    } catch (e) {
        alert("Chyba při mazání systému.");
    }
  };

  const handleAddBattery = async (e: React.FormEvent<HTMLFormElement>) => {
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
    try {
        await api.addBattery(object.id, isBatteryModalOpen.techId, newBattery);
        await reloadObject();
        setBatteryModalOpen(null);
    } catch (e) {
        alert("Chyba při přidávání baterie.");
    }
  };

  const removeBattery = async (techId: string, batteryId: string) => {
    if(!confirm("Smazat baterii?")) return;
    try {
        await api.removeBattery(object.id, techId, batteryId);
        await reloadObject();
    } catch (e) {
        alert("Chyba při mazání baterie.");
    }
  };

  const handleBatteryStatusChange = async (techId: string, batteryId: string, newStatus: BatteryStatus) => {
    const tech = object.technologies.find(t => t.id === techId);
    const battery = tech?.batteries.find(b => b.id === batteryId);
    
    if (!tech || !battery || battery.status === newStatus) return;

    try {
        const oldStatus = battery.status;
        let extraData: any = {};
        let logNote = 'Automatický záznam z detailu objektu';

        // Logika pro výměnu - automatický posun datumu
        if (newStatus === BatteryStatus.REPLACED) {
            const now = new Date();
            const installDateStr = now.toISOString().split('T')[0];
            const nextDate = new Date(now);
            nextDate.setFullYear(nextDate.getFullYear() + 2); // Default 2 roky
            const nextReplaceStr = nextDate.toISOString().split('T')[0];

            extraData = {
                installDate: installDateStr,
                nextReplacementDate: nextReplaceStr
            };
            logNote += `. Aktualizováno datum instalace (${installDateStr}).`;
        }

        // 1. Update statusu baterie (Atomicky)
        await api.updateBatteryStatus(object.id, techId, batteryId, newStatus, extraData);

        // 2. Vytvoření logu (Atomicky)
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
        await api.addLogEntry(object.id, newLogEntry);

        // 3. Refresh
        await reloadObject();

    } catch (e) {
        console.error("Status change error", e);
        alert("Chyba při změně stavu.");
    }
  };

  // 4. Contacts
  const addContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newContact: Contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: fd.get('name') as string,
      role: fd.get('role') as string,
      phone: fd.get('phone') as string,
      email: fd.get('email') as string
    };
    try {
        await api.addToCollection(object.id, 'contacts', newContact);
        await reloadObject();
        setContactModalOpen(false);
    } catch (e) { alert("Chyba při ukládání kontaktu."); }
  };

  const removeContact = async (id: string) => {
    if(!confirm("Smazat kontakt?")) return;
    try {
        await api.removeFromCollection(object.id, 'contacts', id);
        await reloadObject();
    } catch (e) { alert("Chyba při mazání kontaktu."); }
  };

  // 5. Events (Scheduled)
  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
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

    try {
        // Backend nemá dedikovaný endpoint pro update eventu v poli, 
        // použijeme Remove + Add pro editaci (nebo čistý Add pro nový)
        if (editingEvent) {
             await api.removeFromCollection(object.id, 'scheduledEvents', editingEvent.id);
        }
        await api.addToCollection(object.id, 'scheduledEvents', eventData);
        
        await reloadObject();
        setEventModalOpen(false);
        setEditingEvent(null);
    } catch (e) {
        alert("Chyba při ukládání události.");
    }
  };

  const removeEvent = async (id: string) => {
    if(!confirm("Smazat událost?")) return;
    try {
        await api.removeFromCollection(object.id, 'scheduledEvents', id);
        await reloadObject();
    } catch (e) { alert("Chyba při mazání události."); }
  };

  // 6. Logs & Pending Issues
  const handleAddLogEntry = async (futureNote: string, images: string[] = []) => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const newEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      templateId: template.id,
      templateName: template.name,
      date: new Date().toISOString(),
      author: currentUser?.name || 'Neznámý',
      data: logFormData,
      images: images 
    };

    try {
        // 1. Uložit Log
        await api.addLogEntry(object.id, newEntry);

        // 2. Pokud je poznámka pro budoucí já, uložit jako PendingIssue
        if (futureNote && futureNote.trim() !== "") {
            const newIssue: PendingIssue = {
                id: Math.random().toString(36).substr(2, 9),
                text: futureNote,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.name || 'Neznámý',
                status: 'OPEN'
            };
            await api.addToCollection(object.id, 'pendingIssues', newIssue);
        }

        await reloadObject();
        setLogModalOpen(false);
        setLogFormData({});
    } catch (e) {
        alert("Chyba při ukládání záznamu.");
    }
  };

  // 7. Pending Issues Actions
  const toggleIssueStatus = async (issueId: string) => {
     const issue = object.pendingIssues?.find(i => i.id === issueId);
     if (!issue) return;
     const newStatus = issue.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
     try {
         await api.updateIssueStatus(object.id, issueId, newStatus);
         await reloadObject();
     } catch (e) { alert("Chyba při změně stavu."); }
  };

  const deleteIssue = async (issueId: string) => {
      if(!confirm("Smazat tuto poznámku?")) return;
      try {
          await api.removeFromCollection(object.id, 'pendingIssues', issueId);
          await reloadObject();
      } catch (e) { alert("Chyba při mazání."); }
  };

  // 8. Edit Root Object properties
  const handleEditObject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const latVal = fd.get('lat');
    const lngVal = fd.get('lng');

    const updates: Partial<BuildingObject> = {
      name: fd.get('name') as string,
      address: fd.get('address') as string,
      internalNotes: fd.get('internalNotes') as string,
      groupId: fd.get('groupId') as string || undefined,
      lat: latVal ? Number(latVal) : undefined,
      lng: lngVal ? Number(lngVal) : undefined
    };
    
    try {
        await api.updateObjectRoot(object.id, updates);
        await reloadObject();
        setEditObjectModalOpen(false);
    } catch (e) {
        alert("Chyba při aktualizaci objektu.");
    }
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
        <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={<FolderOpen />} label="Kartotéka" />
        <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={<Users />} label="Kontakty & Info" />
        <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={<Calendar />} label="Plánované" />
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<AlertCircle />} label="Úkolníček" /> 
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
        
        {activeTab === 'files' && (
            <FilesTab 
                files={object.files || []} 
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

        {activeTab === 'tasks' && (
          <TasksTab 
              tasks={object.tasks || []}
              onAddTask={() => { setEditingTask(null); setTaskModalOpen(true); }}
              onEditTask={(t) => { setEditingTask(t); setTaskModalOpen(true); }}
              onRemoveTask={removeTask}
              onQuickStatusChange={quickTaskStatusChange}
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
        
        // Tasks
        isTaskModalOpen={isTaskModalOpen}
        setTaskModalOpen={setTaskModalOpen}
        editingTask={editingTask}
        onSaveTask={handleSaveTask}
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