import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { BuildingObject, BatteryStatus } from '../types';
import { AlertTriangle, Battery, Building2, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  objects: BuildingObject[];
}

const Dashboard: React.FC<DashboardProps> = ({ objects }) => {
  const navigate = useNavigate();

  // 1. STATISTIKA BATERIÍ
  const allBatteries = objects.flatMap(o => o.technologies.flatMap(t => t.batteries));
  const statusCounts = {
    [BatteryStatus.HEALTHY]: allBatteries.filter(b => b.status === BatteryStatus.HEALTHY).length,
    [BatteryStatus.WARNING]: allBatteries.filter(b => b.status === BatteryStatus.WARNING).length,
    [BatteryStatus.CRITICAL]: allBatteries.filter(b => b.status === BatteryStatus.CRITICAL).length,
    [BatteryStatus.REPLACED]: allBatteries.filter(b => b.status === BatteryStatus.REPLACED).length,
  };

  const pieData = [
    { name: 'V pořádku', value: statusCounts[BatteryStatus.HEALTHY], color: '#10b981' },
    { name: 'Varování', value: statusCounts[BatteryStatus.WARNING], color: '#f59e0b' },
    { name: 'Kritické', value: statusCounts[BatteryStatus.CRITICAL], color: '#ef4444' },
  ];

  const objectsStats = objects.map(o => ({
    name: o.name,
    batteries: o.technologies.reduce((sum, t) => sum + t.batteries.length, 0)
  }));

  // 2. STATISTIKA ÚKOLŮ (NOVÉ)
  // Spočítáme úkoly, které nejsou hotové a mají termín v minulosti
  const overdueTasksCount = objects.flatMap(o => o.tasks || []).filter(t => 
    t.status !== 'DONE' && new Date(t.deadline) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      
      {/* --- NOVÝ BANNER PRO ÚKOLY --- */}
      <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[2rem] p-8 text-white shadow-lg shadow-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
         {/* Dekorativní pozadí */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-32 blur-3xl pointer-events-none"></div>
         
         <div className="relative z-10">
            <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-blue-200" />
              {overdueTasksCount > 0 
                ? `Máte ${overdueTasksCount} úkolů po termínu`
                : "Všechny úkoly jsou v pořádku"
              }
            </h2>
            <p className="text-blue-100 font-medium">
              {overdueTasksCount > 0 
                ? "Zkontrolujte globální přehled operativních úkolů a vyřešte resty." 
                : "Skvělá práce! Nemáte žádné zpožděné provozní úkoly."
              }
            </p>
         </div>
         <button 
           onClick={() => navigate('/tasks')}
           className="relative z-10 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold shadow-sm hover:bg-blue-50 transition active:scale-95 whitespace-nowrap"
         >
            Otevřít úkolníček
         </button>
      </div>
      {/* ----------------------------- */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Building2 className="text-blue-500" />} 
          title="Celkem objektů" 
          value={objects.length} 
        />
        <StatCard 
          icon={<Battery className="text-green-500" />} 
          title="Celkem baterií" 
          value={allBatteries.length} 
        />
        <StatCard 
          icon={<AlertTriangle className="text-yellow-500" />} 
          title="Ke kontrole" 
          value={statusCounts[BatteryStatus.WARNING]} 
        />
        <StatCard 
          icon={<AlertTriangle className="text-red-500" />} 
          title="Kritické stavy" 
          value={statusCounts[BatteryStatus.CRITICAL]} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-black text-gray-800 dark:text-white mb-6">Stav akumulátorů napříč sítí</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-black text-gray-800 dark:text-white mb-6">Počet baterií podle objektu</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={objectsStats}>
                <XAxis dataKey="name" fontSize={12} tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="batteries" fill="#3b82f6" radius={[6, 6, 6, 6]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: number | string }> = ({ icon, title, value }) => (
  <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 flex items-center space-x-4">
    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl">
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-gray-800 dark:text-white">{value}</p>
    </div>
  </div>
);

export default Dashboard;