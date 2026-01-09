import React, { useState } from 'react'; // PŘIDAT useState
import { useNavigate } from 'react-router-dom';
// PŘIDAT QrCode a Printer ikony
import { ArrowLeft, MapPin, BookOpen, Edit, QrCode, X, Printer } from 'lucide-react';
import { BuildingObject, ObjectGroup } from '../../types';

interface ObjectHeaderProps {
  object: BuildingObject;
  group: ObjectGroup;
  onOpenLogModal: () => void;
  onOpenEditModal: () => void;
}

export const ObjectHeader: React.FC<ObjectHeaderProps> = ({ object, group, onOpenLogModal, onOpenEditModal }) => {
  const navigate = useNavigate();
  // State pro QR Modál
  const [isQRModalOpen, setQRModalOpen] = useState(false);

  // URL pro obrázek QR kódu (relativní cesta přes Nginx proxy)
  const qrImageUrl = `/api/qr/object/${object.id}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 print:hidden">
        {/* ... (zbytek obsahu hlavičky zůstává stejný až k tlačítkům) ... */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex gap-5">
            <button 
              onClick={() => navigate('/objects')} 
              className="p-3 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-2xl transition-all h-fit active:scale-90"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">{object.name}</h1>
                <span className="px-3 py-1 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg" style={{ backgroundColor: group.color || '#94a3b8' }}>
                  {group.name}
                </span>
              </div>
              <div className="flex items-center text-gray-500 dark:text-slate-400 mt-2 font-medium">
                <MapPin className="w-4 h-4 mr-1.5 text-blue-500" />
                <span className="text-sm">{object.address}</span>
              </div>
            </div>
          </div>
          
          {/* TLAČÍTKA V HLAVIČCE */}
          <div className="flex flex-wrap gap-2">
             {/* NOVÉ TLAČÍTKO PRO QR KÓD */}
             <button 
                onClick={() => setQRModalOpen(true)}
                className="px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2"
                title="Zobrazit QR štítek pro tisk"
             >
                <QrCode className="w-5 h-5 text-slate-500" />
             </button>
            
             <button onClick={onOpenLogModal} className="flex-1 md:flex-none px-5 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-white rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Nový zápis
            </button>
            <button onClick={onOpenEditModal} className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <Edit className="w-4 h-4" /> Upravit objekt
            </button>
          </div>
        </div>
      </div>

      {/* MODÁLNÍ OKNO PRO QR KÓD */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 print:bg-white print:p-0 print:items-start">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/10 relative print:shadow-none print:border-0 print:w-full print:max-w-none print:rounded-none">
            
            {/* Zavírací tlačítko (skryto při tisku) */}
            <button 
              onClick={() => setQRModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 print:hidden"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Obsah štítku pro tisk */}
            <div className="p-8 flex flex-col items-center text-center print:p-4">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight mb-2 print:text-black">
                {object.name}
              </h2>
              <p className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-6 print:text-black">
                {object.address}
              </p>
              
              {/* Samotný QR kód načítaný z backendu */}
              <div className="bg-white p-2 rounded-xl border-2 border-gray-100 mb-6 print:border-black print:p-0">
                 {/* Použijeme img tag, který si sáhne na náš nový endpoint. 
                     Přidáme klíč (timestamp), aby se obrázek při opakovaném otevření nepřecachoval špatně */}
                 <img 
                    src={`${qrImageUrl}?t=${Date.now()}`} 
                    alt={`QR kód pro ${object.name}`} 
                    className="w-64 h-64 object-contain"
                 />
              </div>

              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest print:text-black">
                Naskenuj pro servisní přístup
              </p>
              <p className="text-[10px] text-gray-400 mt-1 print:hidden">
                 ID: {object.id}
              </p>

              {/* Tlačítko pro tisk (skryto při samotném tisku) */}
              <button
                onClick={handlePrint}
                className="mt-8 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 print:hidden"
              >
                <Printer className="w-5 h-5" /> Vytisknout štítek
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};