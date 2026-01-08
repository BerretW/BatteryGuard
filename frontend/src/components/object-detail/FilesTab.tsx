import React, { useState, useMemo } from 'react';
import { 
  FileText, Image, File, Trash2, Download, UploadCloud, 
  FileSpreadsheet, Loader2, X, Tag, Folder, Search, Filter 
} from 'lucide-react';
import { BuildingObject, FileAttachment, FileCategory } from '../../types';
import { getApiService } from '../../services/apiService';
import { authService } from '../../services/authService';

interface FilesTabProps {
  files: BuildingObject['files'];
  onAddFile: (file: FileAttachment) => void;
  onRemoveFile: (fileId: string) => void;
}

// Mapování kategorií na čitelné názvy a barvy
const CATEGORY_MAP: Record<FileCategory, { label: string, color: string, bg: string, border: string }> = {
  'REVISION': { label: 'Revize', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  'PROJECT': { label: 'Projekt', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  'PHOTO': { label: 'Fotky', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  'MANUAL': { label: 'Manuály', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
  'CONTRACT': { label: 'Smlouvy', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
  'OTHER': { label: 'Ostatní', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' },
};

export const FilesTab: React.FC<FilesTabProps> = ({ files = [], onAddFile, onRemoveFile }) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('OTHER');

  // Search & Filter states (NOVÉ)
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FileCategory | 'ALL'>('ALL');

  const api = getApiService();
  const currentUser = authService.getCurrentUser();

  // --- FILTROVACÍ LOGIKA (NOVÉ) ---
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // 1. Filtr podle textu
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(lowerTerm));
    }

    // 2. Filtr podle kategorie
    if (activeFilter !== 'ALL') {
      result = result.filter(f => f.category === activeFilter);
    }

    // 3. Seřazení (nejnovější nahoře)
    return result.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [files, searchTerm, activeFilter]);

  // --- HANDLERS ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setCustomName(nameWithoutExt);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const response = await api.uploadFile(selectedFile);
      
      let fileType: FileAttachment['type'] = 'other';
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) fileType = 'image';
      else if (ext === 'pdf') fileType = 'pdf';
      else if (['doc', 'docx'].includes(ext || '')) fileType = 'doc';
      else if (['xls', 'xlsx', 'csv'].includes(ext || '')) fileType = 'excel';

      const newFile: FileAttachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: customName || selectedFile.name,
        url: response.url,
        type: fileType,
        category: selectedCategory,
        size: selectedFile.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.name || 'Neznámý'
      };

      onAddFile(newFile);
      closeModal();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Chyba při nahrávání souboru.");
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setCustomName('');
    setSelectedCategory('OTHER');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'doc': return <FileText className="w-8 h-8 text-blue-500" />;
      case 'excel': return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
      case 'image': return <Image className="w-8 h-8 text-purple-500" />;
      default: return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header s tlačítkem nahrát */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <Folder className="w-4 h-4" /> Kartotéka dokumentů
        </h3>
        <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 w-full sm:w-auto justify-center"
        >
             <UploadCloud className="w-4 h-4" />
             Nahrát dokument
        </button>
      </div>

      {/* --- TOOLBAR: VYHLEDÁVÁNÍ A FILTRY (NOVÉ) --- */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            
            {/* Vyhledávání */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text"
                    placeholder="Hledat podle názvu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Filtry kategorií */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 mr-1" />
                <button
                    onClick={() => setActiveFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                        activeFilter === 'ALL' 
                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' 
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                >
                    Vše
                </button>
                {(Object.keys(CATEGORY_MAP) as FileCategory[]).map(cat => {
                    const info = CATEGORY_MAP[cat];
                    const isActive = activeFilter === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveFilter(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                                isActive 
                                ? `${info.bg} ${info.color} ${info.border} ring-1 ring-inset` 
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                        >
                           {isActive && <div className={`w-1.5 h-1.5 rounded-full bg-current`} />}
                           {info.label}
                        </button>
                    );
                })}
            </div>
        </div>
      )}

      {/* Seznam souborů */}
      {files.length === 0 ? (
        // STAV 1: Žádné soubory v objektu
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-slate-800">
          <Folder className="w-16 h-16 mx-auto text-gray-200 dark:text-slate-700 mb-4" />
          <p className="text-gray-400 font-bold text-lg">Zatím žádné dokumenty.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-6 text-blue-600 font-bold text-sm hover:underline">
            Nahrát první soubor
          </button>
        </div>
      ) : filteredFiles.length === 0 ? (
        // STAV 2: Soubory existují, ale filtr nic nenašel
        <div className="text-center py-10">
            <Search className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nebyly nalezeny žádné dokumenty odpovídající filtru.</p>
            <button 
                onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
                className="mt-2 text-blue-600 text-sm font-bold hover:underline"
            >
                Zrušit filtry
            </button>
        </div>
      ) : (
        // STAV 3: Zobrazení výsledků
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map(file => {
            const catInfo = CATEGORY_MAP[file.category] || CATEGORY_MAP['OTHER'];
            return (
              <div key={file.id} className="group bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm transition-all flex flex-col h-full animate-in fade-in duration-300">
                
                <div className="flex items-start gap-4 mb-3">
                    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl flex-shrink-0">
                        {getIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 w-fit px-2 py-0.5 rounded-md ${catInfo.bg} ${catInfo.color}`}>
                            {catInfo.label}
                        </div>
                        <a href={file.url} target="_blank" rel="noreferrer" className="block font-bold text-gray-800 dark:text-white truncate hover:text-blue-600 hover:underline text-sm" title={file.name}>
                        {file.name}
                        </a>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-[10px] text-gray-400 font-medium">
                         <span className="block">{new Date(file.uploadedAt).toLocaleDateString()}</span>
                         <span className="block text-gray-300 dark:text-slate-600">{file.uploadedBy}</span>
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                            href={file.url} 
                            download 
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition"
                            title="Stáhnout"
                        >
                            <Download className="w-4 h-4" />
                        </a>
                        <button 
                            onClick={() => {
                                if(confirm(`Opravdu smazat soubor "${file.name}"?`)) onRemoveFile(file.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                            title="Smazat"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL PRO NAHRÁVÁNÍ (Zůstává stejný) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white tracking-tight uppercase flex items-center gap-2">
                        <UploadCloud className="w-6 h-6 text-blue-500" /> Nahrát dokument
                    </h2>
                    <button onClick={closeModal} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                            Soubor
                        </label>
                        <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${selectedFile ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'}`}>
                            <input type="file" id="modal-file-upload" className="hidden" onChange={handleFileSelect} />
                            <label htmlFor="modal-file-upload" className="cursor-pointer w-full h-full block">
                                {selectedFile ? (
                                    <div className="flex items-center justify-center gap-3 text-green-700 dark:text-green-400">
                                        <FileText className="w-6 h-6" />
                                        <span className="font-bold truncate max-w-[200px]">{selectedFile.name}</span>
                                    </div>
                                ) : (
                                    <div className="text-gray-400 dark:text-slate-500">
                                        <UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <span className="text-sm font-bold">Klikněte pro výběr souboru</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                            Kategorie dokumentu
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(CATEGORY_MAP) as FileCategory[]).map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-3 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2 border-2 ${
                                        selectedCategory === cat 
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                        : 'border-transparent bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${selectedCategory === cat ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                    {CATEGORY_MAP[cat].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">
                            Název (zobrazí se v seznamu)
                        </label>
                        <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                placeholder="Např. Revize 2024"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={!selectedFile || isUploading}
                        className={`w-full py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex justify-center items-center gap-2 ${
                            !selectedFile || isUploading 
                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {isUploading ? 'Nahrávám...' : 'Uložit do kartotéky'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};