import React, { useState } from 'react';
import { FileText, Plus, Calendar, Download, Trash2, Edit, Loader2 } from 'lucide-react';
import { ServiceReport, BuildingObject } from '../../types';
import { useReports, useGenerateReport, useDeleteReport } from '../../hooks/useAppData';
import { ReportWizardModal } from './ReportWizardModal';
import { getApiService } from '../../services/apiService';
import { useUpdateReport } from '../../hooks/useAppData';

interface ReportsTabProps {
  objectId: string;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ objectId }) => {
  const { data: reports = [], isLoading } = useReports(objectId);
  const generateMutation = useGenerateReport();
  const deleteMutation = useDeleteReport();
  const updateMutation = useUpdateReport(); // Přidat tento hook
  const api = getApiService();

  const [editingReport, setEditingReport] = useState<ServiceReport | null>(null);

  const handleCreateReport = (type: string) => {
    generateMutation.mutate({ objectId, type }, {
        onSuccess: (newReport) => {
            setEditingReport(newReport);
        }
    });
  };

  const handleDelete = (id: string) => {
      if (confirm('Opravdu smazat tento protokol?')) {
          deleteMutation.mutate(id);
      }
  };

  const handleDownload = async (id: string) => {
      try {
          await api.downloadReportPdf(id);
      } catch (e) {
          alert("Chyba při stahování PDF.");
      }
  };

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-500"/></div>;

  return (
    <div className="space-y-6">
       
       {/* HEADER */}
       <div className="flex justify-between items-center px-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
             <FileText className="w-4 h-4" /> Servisní protokoly a revize
          </h3>
          <div className="flex gap-2">
             <button 
                onClick={() => handleCreateReport('REVIZE_EZS')}
                disabled={generateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
             >
                {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                Nová Revize EZS
             </button>
          </div>
       </div>

       {/* LIST */}
       {reports.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-slate-800">
             <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-700 mb-2" />
             <p className="text-gray-400 font-bold text-sm">Žádné protokoly.</p>
          </div>
       ) : (
          <div className="grid gap-3">
             {reports.map(report => (
                <div key={report.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-blue-200 dark:hover:border-blue-900 transition-all">
                   <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${report.status === 'FINAL' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'} dark:bg-slate-800`}>
                         <FileText className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                            {report.type === 'REVIZE_EZS' ? 'Pravidelná revize PZTS' : report.type}
                         </h4>
                         <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 mt-1">
                            <span className="font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">{report.reportNumber}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(report.dateExecution).toLocaleDateString()}</span>
                            <span>{report.technicianName}</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                         onClick={() => handleDownload(report.id)}
                         className="flex-1 sm:flex-none py-2 px-4 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition flex items-center justify-center gap-2"
                      >
                         <Download className="w-4 h-4" /> PDF
                      </button>
                      <button 
                         onClick={() => setEditingReport(report)}
                         className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                         title="Upravit"
                      >
                         <Edit className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => handleDelete(report.id)}
                         className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                         title="Smazat"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             ))}
          </div>
       )}

       {/* MODAL */}
       {editingReport && (
          <ReportWizardModal 
             report={editingReport} 
             onClose={() => setEditingReport(null)}
             onUpdate={(id, updates) => updateMutation.mutate({ id, updates })}
          />
       )}
    </div>
  );
};