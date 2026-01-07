import React from 'react';
import { Users, Plus, Phone, Mail, Trash2, FileText } from 'lucide-react';
import { BuildingObject } from '../../types';

interface InfoTabProps {
  contacts: BuildingObject['contacts'];
  internalNotes?: string;
  onAddContact: () => void;
  onRemoveContact: (id: string) => void;
}

export const InfoTab: React.FC<InfoTabProps> = ({ contacts, internalNotes, onAddContact, onRemoveContact }) => {
  return (
    <div className="space-y-6">
      {/* Contacts */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" /> Kontakty
          </h3>
          <button 
            onClick={onAddContact}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Přidat kontakt
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(!contacts || contacts.length === 0) ? (
            <p className="col-span-full text-center py-6 text-slate-400 dark:text-slate-600 font-medium italic">Žádné uložené kontakty.</p>
          ) : (
            contacts.map(contact => (
              <div key={contact.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-transparent dark:border-slate-800 rounded-3xl flex justify-between items-start group">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-black text-gray-800 dark:text-white">{contact.name}</h4>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{contact.role}</p>
                  </div>
                  <div className="space-y-1.5">
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors font-medium">
                      <Phone className="w-4 h-4" /> {contact.phone}
                    </a>
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors font-medium">
                      <Mail className="w-4 h-4" /> {contact.email}
                    </a>
                  </div>
                </div>
                <button onClick={() => onRemoveContact(contact.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6 text-amber-500" /> Interní poznámky a kódy
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-transparent dark:border-slate-800">
            {internalNotes ? (
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium leading-relaxed">
                {internalNotes}
              </p>
            ) : (
              <p className="text-slate-400 dark:text-slate-600 italic font-medium">Žádné interní poznámky k tomuto objektu.</p>
            )}
          </div>
      </div>
    </div>
  );
};