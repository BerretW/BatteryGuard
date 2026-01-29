// FILE: frontend/src/App.tsx

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { 
  Building2, 
  ClipboardList, 
  Users, 
  Menu, 
  X,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  ShieldCheck,
  Map as MapIcon,
  LogOut,
  Clock,
  Tags,
  Sun,
  Moon,
  CheckCircle2,
  RefreshCw, // Nová ikona pro loading stav
  Plus,      // <--- NOVÁ IKONA
  Key        // <--- NOVÁ IKONA
} from 'lucide-react';

// Importy typů
import { AppUser, ObjectTask } from './types';

// Importy služeb
import { authService } from './services/authService';

// Importy React Query Hooků
import { 
  useObjects, 
  useGroups, 
  useUsers, 
  useAuthorizeUser,
  useCreateUser,         // <--- NOVÉ
  useUpdateUserPassword  // <--- NOVÉ
} from './hooks/useAppData';

// Importy komponent
import Dashboard from './components/Dashboard';
import ObjectList from './components/ObjectList';
import ObjectDetail from './components/ObjectDetail';
import MaintenancePlanner from './components/MaintenancePlanner';
import Settings from './components/Settings';
import MapView from './components/MapView';
import Login from './components/Login';
import CalendarView from './components/CalendarView';
import GroupManagement from './components/GroupManagement';
import { GlobalTaskList } from './components/GlobalTaskList';


// --- POMOCNÉ KOMPONENTY PRO SPRÁVU UŽIVATELŮ (Musí být definovány zde nebo importovány) ---

// Zjednodušená implementace modálního okna pro UserManagement
const Modal: React.FC<{
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  isSubmitting: boolean;
}> = ({ title, children, onClose, isSubmitting }) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-gray-800 dark:text-white">{title}</h2>
        <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
          <X className="w-6 h-6" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const UserCreationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    isSubmitting: boolean;
}> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
    if (!isOpen) return null;
    return (
        <Modal 
            title="Přidat nového uživatele" 
            onClose={onClose} 
            isSubmitting={isSubmitting}
        >
             <form onSubmit={(e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 onSubmit({
                     name: fd.get('name'), 
                     email: fd.get('email'), 
                     password: fd.get('password'), 
                     role: fd.get('role')
                 });
             }} className="space-y-4">
                <input name="name" placeholder="Jméno a příjmení" required className="w-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl dark:text-white" />
                <input name="email" type="email" placeholder="E-mail" required className="w-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl dark:text-white" />
                <input name="password" type="password" placeholder="Heslo" required className="w-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl dark:text-white" />
                <select name="role" required className="w-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl dark:text-white">
                    <option value="TECHNICIAN">Technik</option>
                    <option value="ADMIN">Admin</option>
                </select>
                <div className="flex gap-4 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold">Zrušit</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
                         {isSubmitting ? 'Vytvářím...' : 'Vytvořit uživatele'}
                    </button>
                </div>
             </form>
        </Modal>
    );
};

const PasswordChangeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isSubmitting: boolean;
}> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
    if (!isOpen) return null;
    return (
        <Modal 
            title="Změna hesla pro uživatele" 
            onClose={onClose} 
            isSubmitting={isSubmitting}
        >
             <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Nové heslo</label>
                    <input name="newPassword" type="password" placeholder="Nové heslo" required className="w-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl dark:text-white" />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Potvrdit nové heslo</label>
                    <input name="confirmPassword" type="password" placeholder="Potvrdit nové heslo" required className="w-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl dark:text-white" />
                </div>
                <div className="flex gap-4 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold">Zrušit</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700">
                         {isSubmitting ? 'Měním heslo...' : 'Změnit heslo'}
                    </button>
                </div>
             </form>
        </Modal>
    );
};


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(authService.getCurrentUser());
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // --- REACT QUERY DATA FETCHING ---
  const { 
    data: objects = [], 
    isLoading: loadingObjects, 
    isRefetching: refetchingObjects,
    refetch: refetchObjects 
  } = useObjects({ enabled: !!currentUser }); 

  const { 
    data: groups = [], 
    isLoading: loadingGroups 
  } = useGroups({ enabled: !!currentUser });

  const isLoading = loadingObjects || loadingGroups;
  // ----------------------------------

  // Dark mode logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  // Effect pro Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Effect pro kontrolu konzistence session
  useEffect(() => {
    const token = localStorage.getItem('bg_auth_token');
    // Pokud máme usera v paměti, ale chybí token, odhlásíme ho
    if (currentUser && !token) {
       handleLogout();
    }
  }, [currentUser]);

  const handleLogin = () => {
    setCurrentUser(authService.getCurrentUser());
    // Po přihlášení můžeme vynutit načtení dat
    refetchObjects();
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Dummy funkce pro zpětnou kompatibilitu komponent, které ještě vyžadují prop 'setObjects'
  const noOpSetObjects = () => { console.log("State je spravován React Query"); };
  const noOpSetGroups = () => { console.log("State je spravován React Query"); };

  // 1. Stav: Nepřihlášený uživatel
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // 2. Stav: Přihlášený, ale neautorizovaný uživatel
  if (!currentUser.isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
          <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Čekání na autorizaci</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-4">
            Váš účet <span className="font-bold text-gray-800 dark:text-slate-200">{currentUser.email}</span> byl vytvořen, 
            ale administrátor jej zatím neschválil.
          </p>
          <button 
            onClick={handleLogout}
            className="mt-8 px-6 py-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            Odhlásit se
          </button>
        </div>
      </div>
    );
  }

  // 3. Stav: Plně přihlášený uživatel
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        
        {/* Mobilní overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 bg-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-8 h-8 text-blue-400" />
                <span className="text-xl font-bold tracking-tight">BatteryGuard</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              <SidebarLink to="/" icon={<LayoutDashboard />} label="Dashboard" onClick={() => setSidebarOpen(false)} />
              <SidebarLink to="/objects" icon={<Building2 />} label="Objekty" onClick={() => setSidebarOpen(false)} />
              <SidebarLink to="/tasks" icon={<CheckCircle2 />} label="Úkolníček" onClick={() => setSidebarOpen(false)} />
              <SidebarLink to="/groups" icon={<Tags />} label="Zákazníci / Skupiny" onClick={() => setSidebarOpen(false)} />
              <SidebarLink to="/map" icon={<MapIcon />} label="Mapa" onClick={() => setSidebarOpen(false)} />
              <SidebarLink to="/calendar" icon={<CalendarIcon />} label="Kalendář" onClick={() => setSidebarOpen(false)} />
              <SidebarLink to="/maintenance" icon={<ClipboardList />} label="Plán údržby" onClick={() => setSidebarOpen(false)} />
              
              {currentUser.role === 'ADMIN' && (
                <SidebarLink to="/users" icon={<Users />} label="Uživatelé" onClick={() => setSidebarOpen(false)} />
              )}
              
              <SidebarLink to="/settings" icon={<SettingsIcon />} label="Nastavení" onClick={() => setSidebarOpen(false)} />
            </nav>

            <div className="p-4 mt-auto border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 font-semibold text-blue-400 uppercase">
                    {currentUser.name[0]}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 capitalize truncate">{currentUser.role}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-400 transition"
                  title="Odhlásit se"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Hlavní obsah */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm z-30">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-500 dark:text-slate-400 rounded-lg lg:hidden hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 ml-3 lg:ml-0 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">BatteryGuard Pro</h1>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                    onClick={() => refetchObjects()}
                    disabled={refetchingObjects}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-slate-800 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                    title="Obnovit data ze serveru"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refetchingObjects ? 'animate-spin' : ''}`} /> 
                    {refetchingObjects ? 'Synchronizuji...' : 'Synchronizovat'}
                </button>
                <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:ring-2 hover:ring-blue-500/50 transition-all active:scale-95"
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </header>

          {/* Router View */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-slate-400 font-medium">Synchronizace dat se serverem...</p>
              </div>
            ) : (
              <Routes>
                <Route path="/" element={<Dashboard objects={objects} />} />
                
                {/* Předáváme noOp funkce pro kompatibilitu, pokud komponenty očekávají props */}
                <Route path="/objects" element={<ObjectList objects={objects} setObjects={noOpSetObjects} groups={groups} />} />
                <Route path="/object/:id" element={<ObjectDetail objects={objects} setObjects={noOpSetObjects} groups={groups} />} />
                
                <Route path="/groups" element={<GroupManagement groups={groups} setGroups={noOpSetGroups} objects={objects} />} />
                <Route path="/map" element={<MapView objects={objects} groups={groups} />} />
                <Route path="/calendar" element={<CalendarView objects={objects} />} />
                <Route 
                  path="/maintenance" 
                  element={
                    <MaintenancePlanner 
                      objects={objects} 
                      setObjects={noOpSetObjects} 
                      groups={groups} 
                    />
                  } 
                />
                <Route path="/settings" element={<Settings objects={objects} />} />
                
                <Route path="/users" element={
                   currentUser.role === 'ADMIN' ? <UserManagement /> : <Navigate to="/" />
                } />
                <Route path="/tasks" element={<GlobalTaskList objects={objects} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            )}
          </div>
        </main>
      </div>
    </Router>
  );
};

// --- User Management (Admin) - VYLEPŠENO ---
const UserManagement: React.FC = () => {
  const current = authService.getCurrentUser();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false); // <--- NOVÉ
  const [passwordChangeUserId, setPasswordChangeUserId] = useState<string | null>(null); // <--- NOVÉ
  
  // Použití hooku pro načtení uživatelů
  const { data: users = [], isLoading, isError } = useUsers();
  
  // Použití hooků pro mutace
  const authorizeMutation = useAuthorizeUser();
  const createUserMutation = useCreateUser();             // <--- NOVÉ
  const updatePasswordMutation = useUpdateUserPassword();  // <--- NOVÉ

  if (current?.role !== 'ADMIN') {
    return <div className="p-10 text-center text-red-500 font-bold">Nemáte oprávnění k této sekci.</div>;
  }

  const toggleAuth = (userId: string, isAuth: boolean, role: string) => {
      authorizeMutation.mutate({ userId, role, authorized: isAuth });
  };
  
  // --- HANDLERY PRO MODAL ---
  const handleCreateUser = (data: any) => {
    createUserMutation.mutate(data, {
        onSuccess: () => {
            setIsAddUserModalOpen(false);
            alert(`Uživatel ${data.email} byl vytvořen.`);
        },
        onError: (err) => {
            console.error(err);
            alert("Chyba při vytváření uživatele. Zkuste jiný e-mail.");
        }
    });
  };

  const handlePasswordChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = fd.get('newPassword') as string;
    const confirmPassword = fd.get('confirmPassword') as string;
    const userId = passwordChangeUserId;

    if (!userId || newPassword !== confirmPassword) {
        alert("Hesla se neshodují.");
        return;
    }
    
    updatePasswordMutation.mutate({ userId, newPassword }, {
        onSuccess: () => {
            setPasswordChangeUserId(null);
            alert("Heslo bylo úspěšně změněno.");
        },
        onError: (err) => {
            console.error(err);
            alert("Chyba při změně hesla.");
        }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" /> Správa uživatelů
            </h2>
            <button 
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-bold active:scale-95"
            >
                <Plus className="w-5 h-5" />
                <span>Přidat uživatele</span>
            </button>
       </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
            <div className="p-10 text-center text-gray-500">Načítám uživatele...</div>
        ) : isError ? (
            <div className="p-10 text-center text-red-500">Chyba při načítání uživatelů.</div>
        ) : (
            <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800">
                <tr>
                <th className="px-6 py-4 font-bold text-gray-700 dark:text-slate-300">Uživatel</th>
                <th className="px-6 py-4 font-bold text-gray-700 dark:text-slate-300">Role</th>
                <th className="px-6 py-4 font-bold text-gray-700 dark:text-slate-300">Stav</th>
                <th className="px-6 py-4 font-bold text-gray-700 dark:text-slate-300">Akce</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {users.map(u => (
                <tr key={u.id}>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {u.name} 
                        <div className="font-normal text-gray-400 text-xs">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-600 dark:text-slate-400">{u.role}</td>
                    <td className="px-6 py-4">
                        {u.isAuthorized 
                            ? <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-xs font-bold">Aktivní</span> 
                            : <span className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded text-xs font-bold">Čeká</span>
                        }
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                    {u.id !== current.id && (
                        <>
                            <button 
                                onClick={() => toggleAuth(u.id, !u.isAuthorized, u.role)} 
                                disabled={authorizeMutation.isPending}
                                className={`font-bold hover:underline text-xs px-2 py-1 rounded transition disabled:opacity-50 ${u.isAuthorized ? 'text-red-500 hover:bg-red-50' : 'text-blue-600 hover:bg-blue-50'}`}
                            >
                            {u.isAuthorized ? 'Deaktivovat' : 'Autorizovat'}
                            </button>
                            <button
                                onClick={() => setPasswordChangeUserId(u.id)}
                                className="font-bold hover:underline text-xs px-2 py-1 rounded text-amber-600 hover:bg-amber-50 transition flex items-center gap-1"
                                title="Změnit heslo"
                            >
                                <Key className="w-4 h-4" /> Heslo
                            </button>
                        </>
                    )}
                    </td>
                </tr>
                ))}
                {users.length === 0 && (
                    <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-500">Žádní uživatelé nenalezeni</td>
                    </tr>
                )}
            </tbody>
            </table>
        )}
      </div>
      
      {/* 1. Modal pro přidání uživatele */}
      <UserCreationModal 
          isOpen={isAddUserModalOpen} 
          onClose={() => setIsAddUserModalOpen(false)} 
          onSubmit={handleCreateUser} 
          isSubmitting={createUserMutation.isPending}
      />

      {/* 2. Modal pro změnu hesla */}
      <PasswordChangeModal
          isOpen={!!passwordChangeUserId}
          onClose={() => setPasswordChangeUserId(null)}
          onSubmit={handlePasswordChange}
          isSubmitting={updatePasswordMutation.isPending}
      />
    </div>
  );
};

// Pomocná komponenta pro Sidebar linky
const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick: () => void }> = ({ to, icon, label, onClick }) => (
  <Link to={to} onClick={onClick} className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-900 transition-colors text-slate-300 hover:text-white group">
    {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5 group-hover:text-blue-400 transition-colors' })}
    <span className="font-medium">{label}</span>
  </Link>
);

export default App;