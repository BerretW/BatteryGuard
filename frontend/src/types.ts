
export enum BatteryStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  REPLACED = 'REPLACED'
}

export enum TechType {
  EPS = 'Elektrická požární signalizace (EPS)',
  EZS = 'Elektronická zabezpočovací signalizace (EZS)',
  CCTV = 'Kamerový systém (CCTV)',
  SKV = 'Systém kontroly vstupu (SKV)',
  OTHER = 'Jiný systém'
}

export enum RecurrenceInterval {
  ONCE = 'Jednorázově',
  MONTHLY = 'Měsíčně',
  QUARTERLY = 'Čtvrtletně',
  SEMI_ANNUALLY = 'Pololetně',
  ANNUALLY = 'Ročně',
  BI_ANNUALLY = 'Každé 2 roky',
  QUADRENNIALLY = 'Každé 4 roky'
}

export interface RegularEvent {
  id: string;
  title: string;
  startDate: string;
  nextDate: string;
  interval: RecurrenceInterval;
  description?: string;
  futureNotes?: string;
  isActive: boolean;
  precisionOnDay: boolean;
}

export interface Battery {
  id: string;
  capacityAh: number;
  voltageV: number;
  installDate: string;
  lastCheckDate: string;
  nextReplacementDate: string;
  status: BatteryStatus;
  serialNumber?: string;
  manufactureDate?: string;
  notes?: string;
}

export interface Technology {
  id: string;
  name: string;
  type: TechType;
  location: string;
  batteries: Battery[];
}

export interface ObjectGroup {
  id: string;
  name: string;
  color?: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
}

export interface FormTemplate {
  id: string;
  name: string;
  icon: string;
  fields: FormFieldDefinition[];
}

export interface LogEntry {
  id: string;
  templateId: string;
  templateName: string;
  date: string;
  author: string;
  data: Record<string, string>;
}

export interface BuildingObject {
  id: string;
  name: string;
  address: string;
  description: string;
  internalNotes?: string;
  contacts?: Contact[];
  technologies: Technology[];
  logEntries: LogEntry[];
  scheduledEvents: RegularEvent[];
  groupId?: string;
  lat?: number;
  lng?: number;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TECHNICIAN';
  isAuthorized: boolean;
  createdAt: string;
}

export type ApiMode = 'MOCK' | 'REMOTE';

export interface ApiConfig {
  mode: ApiMode;
  baseUrl: string;
}
