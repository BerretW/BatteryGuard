import { AppUser } from '../types';

const TOKEN_KEY = 'bg_auth_token';
const USERS_KEY = 'bg_users';
const CURRENT_USER_KEY = 'bg_current_user';

// Helper pro zjištění, zda používáme remote API
const isRemote = () => {
    const config = localStorage.getItem('api_config');
    // Defaultně REMOTE, pokud není nastaveno jinak (pro produkci)
    if (!config) return true;
    return JSON.parse(config).mode === 'REMOTE';
};

const getBaseUrl = () => {
    const config = localStorage.getItem('api_config');
    // Defaultně /api (pro produkci)
    const url = config ? JSON.parse(config).baseUrl : '/api';
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const authService = {
  // Lokální mock uživatelé (pro fallback)
  getUsers: (): AppUser[] => {
    // V remote módu bychom měli volat API, ale pro jednoduchost UI
    // zatím načítá z localStorage, pokud jsme v MOCK.
    // Pro Remote mód implementujeme fetch v komponentě UserManagement.
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  },
saveToken: (token: string) => {
      localStorage.setItem(TOKEN_KEY, token);
  },
  getCurrentUser: (): AppUser | null => {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // LOGIN
  login: async (email: string, pass: string): Promise<boolean> => {
    if (isRemote()) {
        try {
            const response = await fetch(`${getBaseUrl()}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });
            
            if (!response.ok) return false;
            
            const data = await response.json();
            // Uložíme token a user data
            localStorage.setItem(TOKEN_KEY, data.token); // Token jako prostý string
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
            return true;
        } catch (e) {
            console.error("Login failed", e);
            return false;
        }
    } else {
        // --- MOCK LOGIKA (Zachováno pro lokální vývoj) ---
        // Hardcoded admin
        if (email === 'admin@local.cz' && pass === 'admin123') {
            const adminUser: AppUser = {
                id: 'admin-001', name: 'Hlavní Administrátor', email: 'admin@local.cz',
                role: 'ADMIN', isAuthorized: true, createdAt: new Date().toISOString()
            };
            localStorage.setItem(TOKEN_KEY, 'mock-token');
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(adminUser));
            return true;
        }
        // Check local users
        const users = authService.getUsers();
        const user = users.find(u => u.email === email);
        if (user && pass === 'pass') { // Mock password
             localStorage.setItem(TOKEN_KEY, 'mock-token');
             localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
             return true;
        }
        return false;
    }
  },

  // REGISTRACE
  register: async (name: string, email: string) => {
    if (isRemote()) {
        await fetch(`${getBaseUrl()}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password: 'pass' })
        });
    } else {
        // MOCK logika
        const users = authService.getUsers();
        const newUser: AppUser = {
            id: Math.random().toString(36).substr(2, 9),
            name, email, role: 'TECHNICIAN', isAuthorized: false, createdAt: new Date().toISOString()
        };
        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.reload();
  },

  // AUTORIZACE (Admin) - V remote módu to řešíme přes API volání v komponentě
  authorizeUser: async (userId: string, role: 'ADMIN' | 'TECHNICIAN', authorized: boolean) => {
      if (isRemote()) {
          const token = localStorage.getItem(TOKEN_KEY);
          await fetch(`${getBaseUrl()}/users/${userId}`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ role, isAuthorized: authorized })
          });
      } else {
          const users = authService.getUsers();
          const updated = users.map(u => u.id === userId ? { ...u, role, isAuthorized: authorized } : u);
          localStorage.setItem(USERS_KEY, JSON.stringify(updated));
      }
  }
};