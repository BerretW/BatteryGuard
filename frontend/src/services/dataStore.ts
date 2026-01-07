
import { BuildingObject, AppUser, BatteryStatus, TechType, ObjectGroup, FormTemplate, RecurrenceInterval } from '../types';

const STORAGE_KEY = 'battery_guard_data';
const GROUPS_KEY = 'battery_guard_groups';
const TEMPLATES_KEY = 'battery_guard_templates';

const DEFAULT_TEMPLATES: FormTemplate[] = [
  {
    id: 't-service',
    name: 'Servisní zásah',
    icon: 'Wrench',
    fields: [
      { id: 'f1', label: 'Popis prací', type: 'textarea', required: true },
      { id: 'f2', label: 'Použitý materiál', type: 'text', required: false },
      { id: 'f3', label: 'Čas strávený (hod)', type: 'number', required: true },
      { id: 'f9', label: 'Poznámka pro příští revizi (pro mé budoucí já)', type: 'textarea', required: false }
    ]
  },
  {
    id: 't-fault',
    name: 'Nahlášení poruchy',
    icon: 'AlertTriangle',
    fields: [
      { id: 'f4', label: 'Projev závady', type: 'textarea', required: true },
      { id: 'f5', label: 'Priorita', type: 'text', required: true }
    ]
  },
  {
    id: 't-revision',
    name: 'Pravidelná revize',
    icon: 'ClipboardCheck',
    fields: [
      { 
        id: 'f6', 
        label: 'Výsledek revize', 
        type: 'select', 
        required: true, 
        options: ['Vyhovuje', 'Vyhovuje s výhradou', 'Nevyhovuje'] 
      },
      { id: 'f7', label: 'Příští termín', type: 'date', required: true },
      { id: 'f9', label: 'Poznámka pro příští revizi (pro mé budoucí já)', type: 'textarea', required: false },
      { id: 'f8', label: 'Poznámka revizora (k aktuálnímu stavu)', type: 'textarea', required: false }
    ]
  }
];

const INITIAL_GROUPS: ObjectGroup[] = [
  { id: 'g1', name: 'ČSOB', color: '#00539b' },
  { id: 'g2', name: 'Městský úřad Brno', color: '#ee1c25' },
  { id: 'g3', name: 'Sklady LogiTech', color: '#22c55e' }
];

const INITIAL_DATA: BuildingObject[] = [
  {
    id: '1',
    name: 'Administrativní budova A',
    address: 'Václavské náměstí 1, Praha',
    description: 'Hlavní ředitelství společnosti.',
    groupId: 'g1',
    lat: 50.0822,
    lng: 14.4277,
    technologies: [
      {
        id: 't1',
        name: 'Centrální ústředna EPS',
        type: TechType.EPS,
        location: '1.NP, místnost 102',
        batteries: [
          {
            id: 'b1',
            capacityAh: 18,
            voltageV: 12,
            installDate: '2022-05-10',
            lastCheckDate: '2023-11-15',
            nextReplacementDate: '2025-05-10',
            status: BatteryStatus.HEALTHY
          }
        ]
      }
    ],
    logEntries: [
      {
        id: 'l1',
        templateId: 't-service',
        templateName: 'Servisní zásah',
        date: '2023-12-01T10:00:00Z',
        author: 'Jan Technik',
        data: { 'f1': 'Výměna vadného čidla v 2.NP', 'f3': '2' }
      }
    ],
    scheduledEvents: [
      {
        id: 'se1',
        title: 'Pravidelná roční revize EPS',
        startDate: '2024-03-15',
        nextDate: '2024-03-15',
        interval: RecurrenceInterval.ANNUALLY,
        description: 'Kompletní zkouška funkčnosti všech hlásičů a sirén.',
        futureNotes: 'Vem si víko od zdroje a náhradní patice MHU 109.',
        isActive: true,
        precisionOnDay: false
      }
    ]
  }
];

export const dataStore = {
  getObjects: (): BuildingObject[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : INITIAL_DATA;
  },
  saveObjects: (objects: BuildingObject[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(objects));
  },
  getGroups: (): ObjectGroup[] => {
    const data = localStorage.getItem(GROUPS_KEY);
    return data ? JSON.parse(data) : INITIAL_GROUPS;
  },
  saveGroups: (groups: ObjectGroup[]) => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  },
  getTemplates: (): FormTemplate[] => {
    const data = localStorage.getItem(TEMPLATES_KEY);
    return data ? JSON.parse(data) : DEFAULT_TEMPLATES;
  },
  saveTemplates: (templates: FormTemplate[]) => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  },
  getCurrentUser: (): AppUser => {
    return {
      id: 'u1',
      name: 'Jan Technik',
      email: 'jan@batteryguard.cz',
      role: 'ADMIN',
      isAuthorized: true,
      createdAt: new Date().toISOString()
    };
  }
};
