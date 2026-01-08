import { BuildingObject, ObjectGroup, FormTemplate, AppUser, BatteryStatus } from '../types';

const TOKEN_KEY = 'bg_auth_token';
const BASE_URL = '/api'; 

export interface IApiService {
  // Objects - Core
  getObjects(): Promise<BuildingObject[]>;
  getObject(id: string): Promise<BuildingObject>;
  createObject(obj: Partial<BuildingObject>): Promise<BuildingObject>;
  updateObjectRoot(id: string, updates: Partial<BuildingObject>): Promise<void>;
  deleteObject(id: string): Promise<void>;

  // Atomic Arrays
  addTechnology(objId: string, tech: any): Promise<void>;
  removeTechnology(objId: string, techId: string): Promise<void>;
  
  addBattery(objId: string, techId: string, battery: any): Promise<void>;
  updateBatteryStatus(objId: string, techId: string, batId: string, status: BatteryStatus, extraData?: any): Promise<void>;
  removeBattery(objId: string, techId: string, batId: string): Promise<void>;

  addLogEntry(objId: string, log: any): Promise<void>;
  
  addTask(objId: string, task: any): Promise<void>;
  updateTask(objId: string, taskId: string, updates: any): Promise<void>;
  removeTask(objId: string, taskId: string): Promise<void>;

  // Generické kolekce (Files, Contacts, Events, PendingIssues)
  addToCollection(objId: string, collection: string, item: any): Promise<void>;
  removeFromCollection(objId: string, collection: string, itemId: string): Promise<void>;
  updateIssueStatus(objId: string, issueId: string, status: string): Promise<void>;

  // Others
  getGroups(): Promise<ObjectGroup[]>;
  saveGroups(groups: ObjectGroup[]): Promise<void>; // Necháme bulk pro zjednodušení UI
  getTemplates(): Promise<FormTemplate[]>;
  saveTemplates(templates: FormTemplate[]): Promise<void>;
  uploadFile(file: File): Promise<{ url: string, filename: string }>;
  getUsers(): Promise<AppUser[]>;
}

class ApiService implements IApiService {
  
  private getHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    const cleanToken = token ? token.replace(/^"(.*)"$/, '$1') : '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanToken}`
    };
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    const url = `${BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.reload(); 
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Request failed: ${method} ${url}`, error);
      throw error;
    }
  }

  // --- Implementation ---

  // Objects
  async getObjects(): Promise<BuildingObject[]> { return this.request('/objects'); }
  async getObject(id: string): Promise<BuildingObject> { return this.request(`/objects/${id}`); }
  async createObject(obj: Partial<BuildingObject>): Promise<BuildingObject> { return this.request('/objects', 'POST', obj); }
  async updateObjectRoot(id: string, updates: Partial<BuildingObject>): Promise<void> { return this.request(`/objects/${id}`, 'PATCH', updates); }
  async deleteObject(id: string): Promise<void> { return this.request(`/objects/${id}`, 'DELETE'); }

  // Technologies
  async addTechnology(objId: string, tech: any): Promise<void> { return this.request(`/objects/${objId}/technologies`, 'POST', tech); }
  async removeTechnology(objId: string, techId: string): Promise<void> { return this.request(`/objects/${objId}/technologies/${techId}`, 'DELETE'); }

  // Batteries
  async addBattery(objId: string, techId: string, battery: any): Promise<void> { return this.request(`/objects/${objId}/technologies/${techId}/batteries`, 'POST', battery); }
  async updateBatteryStatus(objId: string, techId: string, batId: string, status: BatteryStatus, extraData: any = {}): Promise<void> {
    return this.request(`/objects/${objId}/technologies/${techId}/batteries/${batId}`, 'PATCH', { status, ...extraData });
  }
  async removeBattery(objId: string, techId: string, batId: string): Promise<void> { return this.request(`/objects/${objId}/technologies/${techId}/batteries/${batId}`, 'DELETE'); }

  // Logs
  async addLogEntry(objId: string, log: any): Promise<void> { return this.request(`/objects/${objId}/logs`, 'POST', log); }

  // Tasks
  async addTask(objId: string, task: any): Promise<void> { return this.request(`/objects/${objId}/tasks`, 'POST', task); }
  async updateTask(objId: string, taskId: string, updates: any): Promise<void> { return this.request(`/objects/${objId}/tasks/${taskId}`, 'PATCH', updates); }
  async removeTask(objId: string, taskId: string): Promise<void> { return this.request(`/objects/${objId}/tasks/${taskId}`, 'DELETE'); }

  // Collections (Files, etc.)
  async addToCollection(objId: string, collection: string, item: any): Promise<void> { return this.request(`/objects/${objId}/${collection}`, 'POST', item); }
  async removeFromCollection(objId: string, collection: string, itemId: string): Promise<void> { return this.request(`/objects/${objId}/${collection}/${itemId}`, 'DELETE'); }
  async updateIssueStatus(objId: string, issueId: string, status: string): Promise<void> { return this.request(`/objects/${objId}/pendingIssues/${issueId}`, 'PATCH', { status }); }

  // Groups & Templates
  async getGroups(): Promise<ObjectGroup[]> { return this.request('/groups'); }
  async saveGroups(groups: ObjectGroup[]): Promise<void> { return this.request('/groups', 'POST', groups); }
  async getTemplates(): Promise<FormTemplate[]> { return this.request('/templates'); }
  async saveTemplates(templates: FormTemplate[]): Promise<void> { return this.request('/templates', 'POST', templates); }
  
  // Others
  async uploadFile(file: File): Promise<{ url: string, filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem(TOKEN_KEY)?.replace(/^"(.*)"$/, '$1') || '';
    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }
  async getUsers(): Promise<AppUser[]> { return this.request('/users'); }
}

export const getApiService = (): IApiService => new ApiService();