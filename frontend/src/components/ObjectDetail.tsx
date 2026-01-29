import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Users, Calendar, ClipboardCheck, AlertCircle, FolderOpen, Loader2 } from 'lucide-react';
import {
  BuildingObject, BatteryStatus, Contact, RegularEvent, ObjectGroup,
  TechType, Technology, Battery, LogEntry, FormTemplate, PendingIssue, FileAttachment, ObjectTask
} from '../types';
import { authService } from '../services/authService';

// Importy React Query Hooků
import {
  useObject,
  useTemplates,
  useAddTechnology,
  useUpdateTechnology,
  useRemoveTechnology,
  useAddBattery,
  useUpdateBatteryStatus,
  useRemoveBattery,
  useAddFile,
  useRemoveFile,
  useAddContact,
  useRemoveContact,
  useAddEvent,
  useRemoveEvent,
  useAddLogEntry,
  useAddIssue,
  useUpdateIssueStatus,
  useRemoveIssue,
  useUpdateObjectRoot,
  useAddTask,
  useUpdateTask,
  useRemoveTask
} from '../hooks/useAppData';

// Importy sub-komponent
import { ObjectHeader } from './object-detail/ObjectHeader';
import { TechTab } from './object-detail/TechTab';
import { InfoTab } from './object-detail/InfoTab';
import { EventsTab } from './object-detail/EventsTab';
import { LogTab } from './object-detail/LogTab';
import { FilesTab } from './object-detail/FilesTab';
import { TasksTab } from './object-detail/TasksTab';
import { ObjectModals } from './object-detail/ObjectModals';
import { DeviceType } from '../types';

interface ObjectDetailProps {
  // Pro zpětnou kompatibilitu s App.tsx, ale reálně se nepoužívají (data bere hook useObject)
  objects?: BuildingObject[]; 
  setObjects?: any;
  
  // Groups potřebujeme pro nastavení (Lead time, životnost baterií)
  groups: ObjectGroup[];
}

const ObjectDetail: React.FC<ObjectDetailProps> = ({ groups }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  // --- 1. DATA FETCHING (React Query) ---
  const { data: object, isLoading, isError } = useObject(id || '');
  const { data: templates = [] } = useTemplates();

  // --- 2. MUTATIONS DEFINITIONS ---
  const addTechMutation = useAddTechnology();
  const updateTechMutation = useUpdateTechnology();
  const removeTechMutation = useRemoveTechnology();

  const addBatteryMutation = useAddBattery();
  const updateBatteryStatusMutation = useUpdateBatteryStatus();
  const removeBatteryMutation = useRemoveBattery();

  const addFileMutation = useAddFile();
  const removeFileMutation = useRemoveFile();

  const addContactMutation = useAddContact();
  const removeContactMutation = useRemoveContact();

  const addEventMutation = useAddEvent();
  const removeEventMutation = useRemoveEvent();

  const addLogMutation = useAddLogEntry();
  
  const addIssueMutation = useAddIssue();
  const updateIssueMutation = useUpdateIssueStatus();
  const removeIssueMutation = useRemoveIssue();

  const updateObjectRootMutation = useUpdateObjectRoot();

  const addTaskMutation = useAddTask();
  const updateTaskMutation = useUpdateTask();
  const removeTaskMutation = useRemoveTask();

  // --- 3. UI STATE ---
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [logFormData, setLogFormData] = useState<Record<string, string>>({});
  const [editingEvent, setEditingEvent] = useState<RegularEvent | null>(null);
  const [editingTask, setEditingTask] = useState<ObjectTask | null>(null);
  const [editingTech, setEditingTech] = useState<Technology | null>(null);

  // --- 4. ERROR / LOADING STATES ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <div className="text-gray-500 font-medium">Načítám detail objektu...</div>
      </div>
    );
  }

  if (isError || !object) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-400" />
        <div className="text-xl text-gray-600 font-bold">Objekt nebyl nalezen nebo nastala chyba</div>
        <button onClick={() => navigate('/objects')} className="text-blue-600 hover:underline">Zpět na seznam</button>
      </div>
    );
  }

  const getGroupInfo = (groupId?: string) => {
    const g = groups.find(g => g.id === groupId);
    return g || { name: 'Bez skupiny', color: '#94a3b8' };
  };

  // --- 5. HANDLERS (Using Mutations) ---

  // --- TASKS ---
  const handleSaveTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return alert("Musíte být přihlášen.");
    
    const fd = new FormData(e.currentTarget);
    const taskData: any = {
      description: fd.get('description') as string,
      deadline: fd.get('deadline') as string,
      priority: fd.get('priority'),
      status: fd.get('status'),
      note: fd.get('note') as string,
    };

    if (editingTask) {
      updateTaskMutation.mutate(
        { objId: object.id, taskId: editingTask.id, updates: taskData },
        { onSuccess: () => { setTaskModalOpen(false); setEditingTask(null); } }
      );
    } else {
      const newTask = {
        ...taskData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name
      };
      addTaskMutation.mutate(
        { objId: object.id, task: newTask },
        { onSuccess: () => { setTaskModalOpen(false); setEditingTask(null); } }
      );
    }
  };

  const removeTask = (taskId: string) => {
    if (confirm("Smazat úkol?")) {
      removeTaskMutation.mutate({ objId: object.id, taskId });
    }
  };

  const quickTaskStatusChange = (task: ObjectTask, newStatus: any) => {
    updateTaskMutation.mutate({ objId: object.id, taskId: task.id, updates: { status: newStatus } });
  };

  // --- FILES ---
  const addFileToObject = (file: FileAttachment) => {
    addFileMutation.mutate({ objId: object.id, file });
  };

  const removeFileFromObject = (fileId: string) => {
    removeFileMutation.mutate({ objId: object.id, fileId });
  };

  // --- TECHNOLOGIES ---
  const handleAddTechnology = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const techData = {
      name: fd.get('name') as string,
      type: fd.get('type') as TechType,
      deviceType: fd.get('deviceType') as DeviceType,
      location: fd.get('location') as string,
    };

    if (editingTech) {
        updateTechMutation.mutate(
            { objId: object.id, techId: editingTech.id, updates: techData },
            { onSuccess: () => { setTechModalOpen(false); setEditingTech(null); } }
        );
    } else {
        const newTech: Technology = {
            id: Math.random().toString(36).substr(2, 9),
            ...techData,
            batteries: []
        };
        addTechMutation.mutate(
            { objId: object.id, tech: newTech },
            { onSuccess: () => { setTechModalOpen(false); setEditingTech(null); } }
        );
    }
  };

  const removeTechnology = (techId: string) => {
    if (confirm("Opravdu smazat tento systém a všechny jeho baterie?")) {
      removeTechMutation.mutate({ objId: object.id, techId });
    }
  };

  // --- BATTERIES ---
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
    
    addBatteryMutation.mutate(
        { objId: object.id, techId: isBatteryModalOpen.techId, battery: newBattery },
        { onSuccess: () => setBatteryModalOpen(null) }
    );
  };

  const removeBattery = (techId: string, batteryId: string) => {
    if (confirm("Smazat baterii?")) {
      removeBatteryMutation.mutate({ objId: object.id, techId, batId: batteryId });
    }
  };

  const handleBatteryStatusChange = (techId: string, batteryId: string, newStatus: BatteryStatus) => {
    const tech = object.technologies.find(t => t.id === techId);
    const battery = tech?.batteries.find(b => b.id === batteryId);

    if (!tech || !battery || battery.status === newStatus) return;

    const oldStatus = battery.status;
    let extraData: any = {};
    let logNote = 'Automatický záznam z detailu objektu';

    // LOGIKA PRO VÝMĚNU
    if (newStatus === BatteryStatus.REPLACED) {
      const now = new Date();
      const installDateStr = now.toISOString().split('T')[0];
      
      const group = groups.find(g => g.id === object.groupId);
      const lifeMonths = group?.defaultBatteryLifeMonths || 24;

      const nextDate = new Date(now);
      nextDate.setMonth(nextDate.getMonth() + lifeMonths);
      const nextReplaceStr = nextDate.toISOString().split('T')[0];

      extraData = {
        installDate: installDateStr,
        nextReplacementDate: nextReplaceStr
      };
      logNote += `. Aktualizováno datum instalace (${installDateStr}). Další výměna nastavena za ${lifeMonths} měsíců (${nextReplaceStr}).`;
    }

    // 1. Update statusu baterie
    updateBatteryStatusMutation.mutate({ objId: object.id, techId, batId: batteryId, status: newStatus, extraData });

    // 2. Vytvoření logu
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
    addLogMutation.mutate({ objId: object.id, log: newLogEntry });
  };

  // --- CONTACTS ---
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
    addContactMutation.mutate(
        { objId: object.id, contact: newContact },
        { onSuccess: () => setContactModalOpen(false) }
    );
  };

  const removeContact = (contactId: string) => {
    if (confirm("Smazat kontakt?")) {
        removeContactMutation.mutate({ objId: object.id, contactId });
    }
  };

  // --- EVENTS ---
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

    if (editingEvent) {
       // Pro úpravu nejdřív smažeme starý a přidáme nový (kvůli jednoduchosti API na backendu, 
       // pokud backend podporuje update, použijte update)
       removeEventMutation.mutate(
         { objId: object.id, eventId: editingEvent.id },
         { onSuccess: () => addEventMutation.mutate({ objId: object.id, event: eventData }) }
       );
    } else {
       addEventMutation.mutate({ objId: object.id, event: eventData });
    }
    setEventModalOpen(false);
    setEditingEvent(null);
  };

  const removeEvent = (eventId: string) => {
    if (confirm("Smazat událost?")) {
        removeEventMutation.mutate({ objId: object.id, eventId });
    }
  };

  // --- LOGS & ISSUES ---
  const handleAddLogEntry = (futureNote: string, images: string[] = []) => {
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

    addLogMutation.mutate({ objId: object.id, log: newEntry });

    if (futureNote && futureNote.trim() !== "") {
      const newIssue: PendingIssue = {
        id: Math.random().toString(36).substr(2, 9),
        text: futureNote,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Neznámý',
        status: 'OPEN'
      };
      addIssueMutation.mutate({ objId: object.id, issue: newIssue });
    }

    setLogModalOpen(false);
    setLogFormData({});
  };

  const toggleIssueStatus = (issueId: string) => {
    const issue = object.pendingIssues?.find(i => i.id === issueId);
    if (!issue) return;
    const newStatus = issue.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    updateIssueMutation.mutate({ objId: object.id, issueId, status: newStatus });
  };

  const deleteIssue = (issueId: string) => {
    if (confirm("Smazat tuto poznámku?")) {
      removeIssueMutation.mutate({ objId: object.id, issueId });
    }
  };

  // --- ROOT OBJECT EDIT ---
  const handleEditObject = (e: React.FormEvent<HTMLFormElement>) => {
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
      lng: lngVal ? Number(lngVal) : undefined,
      technicalDescription: fd.get('technicalDescription') as string, 
    };

    updateObjectRootMutation.mutate(
        { id: object.id, updates },
        { onSuccess: () => setEditObjectModalOpen(false) }
    );
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
            onAddTech={() => { setEditingTech(null); setTechModalOpen(true); }}
            onEditTech={(t) => { setEditingTech(t); setTechModalOpen(true); }}
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
        editingTech={editingTech}
        
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