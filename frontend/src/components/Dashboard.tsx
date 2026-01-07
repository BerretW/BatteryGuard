
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { BuildingObject, BatteryStatus } from '../types';
import { AlertTriangle, Battery, CheckCircle, Shield } from 'lucide-react';

interface DashboardProps {
  objects: BuildingObject[];
}

const Dashboard: React.FC<DashboardProps> = ({ objects }) => {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Building className="text-blue-500" />} 
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6">Stav akumulátorů napříč sítí</h3>
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6">Počet baterií podle objektu</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={objectsStats}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="batteries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: number | string }> = ({ icon, title, value }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className="p-3 bg-gray-50 rounded-lg">
      {/* Fix: Cast icon to React.ReactElement<any> to resolve type mismatch when cloning with className prop */}
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const Building = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
);

export default Dashboard;
