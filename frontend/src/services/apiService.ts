// FILE: frontend/src/services/apiService.ts

import { BuildingObject, ObjectGroup, FormTemplate, AppUser, BatteryStatus, BatteryType } from '../types';
import { authService } from './authService'; 
const TOKEN_KEY = 'bg_auth_token';
const BASE_URL = '/api'; 

export interface IApiService {
  // Objects - Core
  getObjects(): Promise<BuildingObject[]>;
  getObject(id: string): Promise<BuildingObject>;
  createObject(obj: Partial<BuildingObject>): Promise<BuildingObject>;
  updateObjectRoot(id: string, updates: Partial<BuildingObject>): Promise<void>;
  deleteObject(id: string): Promise<void>;

  // Technologies
  addTechnology(objId: string, tech: any): Promise<void>;
  removeTechnology(objId: string, techId: string): Promise<void>;
  updateTechnology(objId: string, techId: string, updates: any): Promise<void>;
  
  // Batteries
  addBattery(objId: string, techId: string, battery: any): Promise<void>;
  updateBatteryStatus(objId: string, techId: string, batId: string, status: BatteryStatus, extraData?: any): Promise<void>;
  removeBattery(objId: string, techId: string, batId: string): Promise<void>;
  
  // Battery Types
  getBatteryTypes(): Promise<BatteryType[]>;
  createBatteryType(bt: Partial<BatteryType>): Promise<BatteryType>;
  deleteBatteryType(id: string): Promise<void>;

  // Logs
  addLogEntry(objId: string, log: any): Promise<void>;
  
  // Tasks
  addTask(objId: string, task: any): Promise<void>;
  updateTask(objId: string, taskId: string, updates: any): Promise<void>;
  removeTask(objId: string, taskId: string): Promise<void>;

  // Generické kolekce (Files, Contacts, Events, PendingIssues)
  addToCollection(objId: string, collection: string, item: any): Promise<void>;
  removeFromCollection(objId: string, collection: string, itemId: string): Promise<void>;
  updateIssueStatus(objId: string, issueId: string, status: string): Promise<void>;

  // Groups & Templates
  getGroups(): Promise<ObjectGroup[]>;
  saveGroups(groups: ObjectGroup[]): Promise<void>; // Necháme bulk pro zjednodušení UI
  getTemplates(): Promise<FormTemplate[]>;
  saveTemplates(templates: FormTemplate[]): Promise<void>;
  
  // Files & Backup
  uploadFile(file: File): Promise<{ url: string, filename: string }>;
  downloadBackup(): Promise<void>; // Void, protože to vyvolá download dialog
  restoreBackup(file: File): Promise<void>;

  // Users & Auth (Rozšířené)
  getUsers(): Promise<AppUser[]>;
  createUser(user: { name: string, email: string, password?: string, role: 'ADMIN' | 'TECHNICIAN' }): Promise<AppUser>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;
  updateSelfPassword(currentPassword: string, newPassword: string): Promise<void>;
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
        authService.logout(); // Toto provede kompletní vyčištění a reload
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
      }
      // Vrací prázdnou odpověď, pokud Content-Type není JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
          return response.json();
      }
      return {};
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
  async updateTechnology(objId: string, techId: string, updates: any): Promise<void> { 
      return this.request(`/objects/${objId}/technologies/${techId}`, 'PATCH', updates); 
  }
  
  // Batteries
  async addBattery(objId: string, techId: string, battery: any): Promise<void> { return this.request(`/objects/${objId}/technologies/${techId}/batteries`, 'POST', battery); }
  async updateBatteryStatus(objId: string, techId: string, batId: string, status: BatteryStatus, extraData: any = {}): Promise<void> {
    return this.request(`/objects/${objId}/technologies/${techId}/batteries/${batId}`, 'PATCH', { status, ...extraData });
  }
  async removeBattery(objId: string, techId: string, batId: string): Promise<void> { return this.request(`/objects/${objId}/technologies/${techId}/batteries/${batId}`, 'DELETE'); }
  
  // Battery Types
  async getBatteryTypes(): Promise<BatteryType[]> { return this.request('/battery-types'); }
  async createBatteryType(bt: Partial<BatteryType>): Promise<BatteryType> { return this.request('/battery-types', 'POST', bt); }
  async deleteBatteryType(id: string): Promise<void> { return this.request(`/battery-types/${id}`, 'DELETE'); }
  
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
  
  // Files & Backup
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
  
  async downloadBackup(): Promise<void> {
    const token = localStorage.getItem('bg_auth_token')?.replace(/^"(.*)"$/, '$1') || '';
    
    // Použijeme fetch s blobem pro stažení souboru
    const response = await fetch('/api/backup/export', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Backup download failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async restoreBackup(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('bg_auth_token')?.replace(/^"(.*)"$/, '$1') || '';
    
    const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // Content-Type se nastaví automaticky s boundary
        body: formData
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Restore failed");
    }
  }

  // Users & Auth (Rozšířené)
  async getUsers(): Promise<AppUser[]> { return this.request('/users'); }
  
  async createUser(user: { name: string, email: string, password?: string, role: 'ADMIN' | 'TECHNICIAN' }): Promise<AppUser> {
    return this.request('/users', 'POST', user);
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    return this.request(`/users/${userId}/password`, 'PATCH', { newPassword });
  }

  async updateSelfPassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.request('/auth/password', 'PATCH', { currentPassword, newPassword });
  }
}

export const getApiService = (): IApiService => new ApiService();