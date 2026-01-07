
import { BuildingObject, ApiConfig } from '../types';
import { dataStore } from './dataStore';

export interface IApiService {
  getObjects(): Promise<BuildingObject[]>;
  saveObjects(objects: BuildingObject[]): Promise<void>;
}

class MockApiService implements IApiService {
  async getObjects(): Promise<BuildingObject[]> {
    // Simulace síťového zpoždění
    await new Promise(resolve => setTimeout(resolve, 500));
    return dataStore.getObjects();
  }

  async saveObjects(objects: BuildingObject[]): Promise<void> {
    dataStore.saveObjects(objects);
  }
}

class RemoteApiService implements IApiService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  async getObjects(): Promise<BuildingObject[]> {
    const response = await fetch(`${this.config.baseUrl}/objects`);
    if (!response.ok) throw new Error('Nepodařilo se načíst data z API');
    return response.json();
  }

  async saveObjects(objects: BuildingObject[]): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(objects)
    });
    if (!response.ok) throw new Error('Nepodařilo se uložit data do API');
  }
}

export const getApiService = (): IApiService => {
  const configRaw = localStorage.getItem('api_config');
  const config: ApiConfig = configRaw ? JSON.parse(configRaw) : { mode: 'MOCK', baseUrl: '' };
  
  if (config.mode === 'REMOTE') {
    return new RemoteApiService(config);
  }
  return new MockApiService();
};
