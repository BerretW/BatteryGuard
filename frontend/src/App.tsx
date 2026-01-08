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
  CheckCircle2
} from 'lucide-react';

// Importy typů
import { BuildingObject, AppUser, ObjectGroup } from './types';

// Importy služeb
import { getApiService } from './services/apiService';
import { authService } from './services/authService';

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

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(authService.getCurrentUser());
  const [objects, setObjects] = useState<BuildingObject[]>([]);
  const [groups, setGroups] = useState<ObjectGroup[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dark mode logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const api = getApiService();

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

  // Effect pro načítání dat po přihlášení
  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [objData, groupData] = await Promise.all([
        api.getObjects(),
        api.getGroups()
      ]);
      setObjects(objData);
      setGroups(groupData);
    } catch (error) {
      console.error("Chyba při načítání dat z API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setCurrentUser(authService.getCurrentUser());
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // --- ZMĚNA: Update už neukládá na server, jen mění UI ---
  // Komponenty (ObjectDetail, ObjectList) volají API samy a pak zavolají toto pro update UI.
  const updateLocalObjects = (newObjects: BuildingObject[]) => {
    setObjects(newObjects);
  };

  // Skupiny jsou malé, tam můžeme nechat hromadné uložení pro jednoduchost
  const updateGroups = async (newGroups: ObjectGroup[]) => {
    setGroups(newGroups);
    try {
      await api.saveGroups(newGroups);
    } catch (error) {
      console.error("Group save error:", error);
      alert("Chyba při ukládání skupin na server.");
    }
  };

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
                    onClick={() => fetchData()}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-slate-800 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-slate-700 transition"
                    title="Obnovit data ze serveru"
                >
                    <Clock className="w-3.5 h-3.5" /> Synchronizovat
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
                
                {/* Předáváme updateLocalObjects - komponenty už samy volají API */}
                <Route path="/objects" element={<ObjectList objects={objects} setObjects={updateLocalObjects} groups={groups} />} />
                <Route path="/object/:id" element={<ObjectDetail objects={objects} setObjects={updateLocalObjects} groups={groups} />} />
                
                <Route path="/groups" element={<GroupManagement groups={groups} setGroups={updateGroups} objects={objects} />} />
                <Route path="/map" element={<MapView objects={objects} />} />
                <Route path="/calendar" element={<CalendarView objects={objects} />} />
                <Route path="/maintenance" element={<MaintenancePlanner objects={objects} setObjects={updateLocalObjects} />} />
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

// --- User Management (Admin) ---
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const current = authService.getCurrentUser();

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const apiUsers = await authService.getUsers();
            setUsers(apiUsers);
        } catch (e) {
            console.error("Failed to load users", e);
        }
    };
    fetchUsers();
  }, []);

  if (current?.role !== 'ADMIN') {
    return <div className="p-10 text-center text-red-500 font-bold">Nemáte oprávnění k této sekci.</div>;
  }

  const toggleAuth = async (userId: string, isAuth: boolean, role: string) => {
    setLoading(true);
    try {
        await authService.authorizeUser(userId, role, isAuth);
        const updatedUsers = await authService.getUsers();
        setUsers(updatedUsers);
    } catch (e) {
        alert("Chyba při změně oprávnění");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Správa uživatelů</h2>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
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
                <td className="px-6 py-4">
                  {u.id !== current.id && (
                    <button 
                        onClick={() => toggleAuth(u.id, !u.isAuthorized, u.role)} 
                        disabled={loading}
                        className={`font-bold hover:underline ${u.isAuthorized ? 'text-red-500' : 'text-blue-600'}`}
                    >
                      {u.isAuthorized ? 'Deaktivovat' : 'Autorizovat'}
                    </button>
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
      </div>
    </div>
  );
};

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick: () => void }> = ({ to, icon, label, onClick }) => (
  <Link to={to} onClick={onClick} className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-900 transition-colors text-slate-300 hover:text-white group">
    {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5 group-hover:text-blue-400 transition-colors' })}
    <span className="font-medium">{label}</span>
  </Link>
);

export default App;