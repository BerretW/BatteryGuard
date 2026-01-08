import { BuildingObject, ObjectGroup, FormTemplate, AppUser } from '../types';

const TOKEN_KEY = 'bg_auth_token';
const BASE_URL = '/api'; 

export interface IApiService {
  // Objekty
  getObjects(): Promise<BuildingObject[]>;
  saveObjects(objects: BuildingObject[]): Promise<void>;
  
  // Skupiny
  getGroups(): Promise<ObjectGroup[]>;
  saveGroups(groups: ObjectGroup[]): Promise<void>;

  // Šablony (Settings)
  getTemplates(): Promise<FormTemplate[]>;
  saveTemplates(templates: FormTemplate[]): Promise<void>;

  uploadFile(file: File): Promise<{ url: string, filename: string }>;

  // Uživatelé (Admin)
  getUsers(): Promise<AppUser[]>;
}

class ApiService implements IApiService {
  
  private getHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    // Odstraníme uvozovky, které se tam mohly dostat špatným uložením
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

      // 401 = Token vypršel nebo je neplatný
      if (response.status === 401) {
        console.warn("Unauthorized - Session expired");
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('bg_current_user');
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

  async uploadFile(file: File): Promise<{ url: string, filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Zde nepoužíváme standardní this.request, protože potřebujeme poslat FormData bez Content-Type: application/json
    const token = localStorage.getItem('bg_auth_token'); // Použijte vaši konstantu TOKEN_KEY
    const cleanToken = token ? token.replace(/^"(.*)"$/, '$1') : '';

    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cleanToken}`
            // Content-Type se nastaví automaticky prohlížečem včetně boundary
        },
        body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
}

  async getObjects(): Promise<BuildingObject[]> {
    return this.request('/objects');
  }
  async saveObjects(objects: BuildingObject[]): Promise<void> {
    await this.request('/objects', 'POST', objects);
  }

  async getGroups(): Promise<ObjectGroup[]> {
    return this.request('/groups');
  }
  async saveGroups(groups: ObjectGroup[]): Promise<void> {
    await this.request('/groups', 'POST', groups);
  }

  async getTemplates(): Promise<FormTemplate[]> {
    return this.request('/templates');
  }
  async saveTemplates(templates: FormTemplate[]): Promise<void> {
    await this.request('/templates', 'POST', templates);
  }

  async getUsers(): Promise<AppUser[]> {
    return this.request('/users');
  }
}

export const getApiService = (): IApiService => new ApiService();