import { BuildingObject, ApiConfig, AppUser } from '../types';
import { dataStore } from './dataStore';

const TOKEN_KEY = 'bg_auth_token';

export interface IApiService {
  getObjects(): Promise<BuildingObject[]>;
  saveObjects(objects: BuildingObject[]): Promise<void>;
}

class MockApiService implements IApiService {
  async getObjects(): Promise<BuildingObject[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return dataStore.getObjects();
  }

  async saveObjects(objects: BuildingObject[]): Promise<void> {
    dataStore.saveObjects(objects);
  }
}

class RemoteApiService implements IApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Odstraníme koncový slash, pokud tam je
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private getHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    // Odstraníme uvozovky, pokud je token uložen jako JSON string (běžná chyba)
    const cleanToken = token ? token.replace(/"/g, '') : '';
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanToken}`
    };
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      // Token vypršel nebo je neplatný -> odhlásit
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('bg_current_user');
      window.location.reload();
      throw new Error('Unauthorized');
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error: ${response.status} - ${text}`);
    }
    return response.json();
  }

  async getObjects(): Promise<BuildingObject[]> {
    const response = await fetch(`${this.baseUrl}/objects`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async saveObjects(objects: BuildingObject[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/objects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(objects)
    });
    await this.handleResponse(response);
  }
}

export const getApiService = (): IApiService => {
  const configRaw = localStorage.getItem('api_config');
  
  let config: ApiConfig;

  if (configRaw) {
    config = JSON.parse(configRaw);
  } else {
    // VÝCHOZÍ NASTAVENÍ PRO PRODUKCI
    config = { 
      mode: 'REMOTE', 
      baseUrl: '/api' // Relativní cesta - Nginx se postará o doménu
    };
  }
  
  if (config.mode === 'REMOTE') {
    return new RemoteApiService(config.baseUrl || '/api');
  }
  return new MockApiService();
};