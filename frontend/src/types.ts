
export enum BatteryStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  REPLACED = 'REPLACED'
}

export enum TechType {
  EPS = 'EPS - Elektrická požární signalizace (EPS)',
  EZS = 'PZTS - Elektronická zabezpočovací signalizace (EZS)',
  CCTV = 'CCTV - Kamerový systém (CCTV)',
  SKV = 'SKV - Systém kontroly vstupu (SKV)',
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

export enum TaskPriority {
  LOW = 'Nízká',
  MEDIUM = 'Střední',
  HIGH = 'Vysoká'
}

export enum TaskStatus {
  OPEN = 'Založeno',
  IN_PROGRESS = 'Řeší se',
  DONE = 'Vyřešeno'
}

export interface ObjectTask {
  id: string;
  description: string;
  deadline: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  note?: string;
  createdAt: string;
  createdBy: string;
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
  type: TechType;          // Např. EPS
  deviceType: DeviceType;  // Např. Napájecí zdroj <--- NOVÉ POLE
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
  pendingIssues?: PendingIssue[];
  groupId?: string;
  lat?: number;
  lng?: number;
  files: FileAttachment[];
  tasks: ObjectTask[]; // <--- PŘIDAT TOTO POLE
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
export interface PendingIssue {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  status: 'OPEN' | 'RESOLVED';
}

export interface LogEntry {
  id: string;
  templateId: string;
  templateName: string;
  date: string;
  author: string;
  data: Record<string, string>;
  images?: string[]; // PŘIDÁNO
}
export type FileCategory = 
  | 'REVISION' 
  | 'PROJECT' 
  | 'PHOTO' 
  | 'MANUAL' 
  | 'CONTRACT' 
  | 'OTHER';

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'excel' | 'image' | 'other';
  category: FileCategory; // <--- NOVÉ POLE
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ObjectGroup {
  id: string;
  name: string;
  color?: string;
  defaultBatteryLifeMonths?: number; // Životnost v měsících (např. 24, 36)
  notificationLeadTimeWeeks?: number; // Upozornit X týdnů předem
}
export enum DeviceType {
  PANEL = 'Ústředna',
  UNIT = 'Řídící jednotka',
  SOURCE_MAIN = 'Napájecí zdroj',
  SOURCE_BOOSTER = 'Posilový zdroj',
  OTHER_DEVICE = 'Jiné zařízení'
}