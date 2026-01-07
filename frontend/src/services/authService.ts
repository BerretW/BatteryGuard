
import { AppUser } from '../types';

const TOKEN_KEY = 'bg_auth_token';
const USERS_KEY = 'bg_users';

// Default mock admin
const DEFAULT_ADMIN: AppUser = {
  id: 'admin-001',
  name: 'Hlavní Administrátor',
  email: 'admin@local.cz',
  role: 'ADMIN',
  isAuthorized: true,
  createdAt: new Date().toISOString()
};

export const authService = {
  getUsers: (): AppUser[] => {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [DEFAULT_ADMIN];
  },

  saveUsers: (users: AppUser[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  login: (email: string, pass: string): { user: AppUser, token: string } | null => {
    // Simulated credential check
    if (email === 'admin@local.cz' && pass === 'admin123') {
      const token = btoa(JSON.stringify({ email, exp: Date.now() + 86400000 }));
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('bg_current_user', JSON.stringify(DEFAULT_ADMIN));
      return { user: DEFAULT_ADMIN, token };
    }

    const users = authService.getUsers();
    const user = users.find(u => u.email === email);
    
    // In real app, passwords would be hashed. Simulating match for any existing user with 'pass'
    if (user && pass === 'pass') {
      const token = btoa(JSON.stringify({ email, exp: Date.now() + 86400000 }));
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('bg_current_user', JSON.stringify(user));
      return { user, token };
    }
    return null;
  },

  register: (name: string, email: string): AppUser => {
    const users = authService.getUsers();
    const newUser: AppUser = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      role: 'TECHNICIAN',
      isAuthorized: false,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    authService.saveUsers(users);
    return newUser;
  },

  getCurrentUser: (): AppUser | null => {
    const user = localStorage.getItem('bg_current_user');
    return user ? JSON.parse(user) : null;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('bg_current_user');
  },

  authorizeUser: (userId: string, role: 'ADMIN' | 'TECHNICIAN', authorized: boolean) => {
    const users = authService.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, role, isAuthorized: authorized } : u);
    authService.saveUsers(updated);
  }
};
