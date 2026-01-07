import { AppUser } from '../types';

const TOKEN_KEY = 'bg_auth_token';
const CURRENT_USER_KEY = 'bg_current_user';
const BASE_URL = '/api/auth';

export const authService = {
  saveToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  
  getCurrentUser: (): AppUser | null => {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  getUsers: async (): Promise<AppUser[]> => {
    // Toto je nyní asynchronní volání, komponenty se musí přizpůsobit
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch('/api/users', { 
        headers: { 'Authorization': `Bearer ${token}` } 
    });
    if (!res.ok) return [];
    return res.json();
  },

  login: async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  register: async (name: string, email: string) => {
    await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: 'pass' })
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.reload();
  },

  authorizeUser: async (userId: string, role: string, authorized: boolean) => {
    const token = localStorage.getItem(TOKEN_KEY);
    await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ role, isAuthorized: authorized })
    });
  }
};