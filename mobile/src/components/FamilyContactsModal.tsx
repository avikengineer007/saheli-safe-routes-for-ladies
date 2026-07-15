import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Phone, UserCheck, Heart, CheckCircle2, X, Sparkles, Send, Star } from 'lucide-react';

export interface FamilyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  autoSmsAlert: boolean;
}

interface FamilyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FamilyContactsModal: React.FC<FamilyContactsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [contacts, setContacts] = useState<FamilyContact[]>(() => {
    const saved = localStorage.getItem('saheli_family_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to empty
      }
    }
    return [];
  });

  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Sister');
  const [newPhone, setNewPhone] = useState('');
  const [newAutoSms, setNewAutoSms] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    localStorage.setItem('saheli_family_contacts', JSON.stringify(contacts));
  }, [contacts]);

  if (!isOpen) return null;

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const cleanNum = newPhone.replace(/[^0-9]/g, '');
    if (cleanNum.length < 10) {
      setNotice('Please enter a valid 10-digit mobile number.');
      return;
    }

    const newContact: FamilyContact = {
      id: 'cnt_' + Date.now(),
      name: newName.trim(),
      relationship: newRelationship,
      phone: cleanNum,
      isPrimary: contacts.length === 0,
      autoSmsAlert: newAutoSms
    };

    setContacts(prev => [...prev, newContact]);
    setNewName('');
    setNewPhone('');
    setNotice('Family contact added successfully!');
    setTimeout(() => setNotice(''), 3000);
  };

  const handleDeleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleSetPrimary = (id: string) => {
    setContacts(prev =>
      prev.map(c => ({
        ...c,
        isPrimary: c.id === id
      }))
    );
    setNotice('Primary emergency contact updated!');
    setTimeout(() => setNotice(''), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-2xl relative space-y-6 text-slate-900 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-rose-50 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-rose-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Emergency Family Contacts Slot
            </h2>
            <p className="text-xs text-slate-500 font-medium">Add sisters, parents, or trusted friends for live SOS & SMS alerts</p>
          </div>
        </div>

        {notice && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Existing Contacts List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
            <UserCheck className="w-4 h-4 text-red-600" />
            <span>Saved Emergency Family Circle ({contacts.length})</span>
          </h3>

          {contacts.length === 0 ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-dashed border-rose-200 text-center text-xs text-slate-500 font-medium">
              No family contacts added yet. Use the form below to add your first emergency contact.
            </div>
          ) : (
            <div className="space-y-2.5">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    contact.isPrimary
                      ? 'bg-gradient-to-r from-rose-50 to-red-50 border-red-300 shadow-sm ring-1 ring-red-200'
                      : 'bg-white border-slate-200 hover:border-rose-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-sm">{contact.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {contact.relationship}
                      </span>
                      {contact.isPrimary && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white shadow-sm flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span>Primary SOS Target</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-mono font-bold text-slate-600 flex items-center space-x-3">
                      <span>📞 +91 {contact.phone}</span>
                      <span className="text-emerald-700 font-sans text-[11px] font-semibold">
                        {contact.autoSmsAlert ? '• Auto-SMS Enabled' : '• Call Only'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {!contact.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(contact.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-red-700 text-[11px] font-bold transition-colors"
                        title="Make Primary Contact"
                      >
                        Set Primary
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-rose-50 transition-colors"
                      title="Remove Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Contact Slot Form */}
        <form onSubmit={handleAddContact} className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-black uppercase text-red-700">
            <Plus className="w-4 h-4" />
            <span>Add New Trusted Family Contact</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-[11px] font-bold text-slate-700 uppercase">
                Contact Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Priya (Sister)"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white text-slate-900 font-bold text-xs outline-none focus:border-red-600 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-slate-700 uppercase">
                Relationship
              </label>
              <select
                value={newRelationship}
                onChange={e => setNewRelationship(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white text-slate-900 font-bold text-xs outline-none focus:border-red-600 transition-all shadow-sm"
              >
                <option value="Sister">Sister</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Guardian">Guardian</option>
                <option value="Friend">Friend</option>
                <option value="Spouse">Spouse</option>
                <option value="Caregiver">Caregiver</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-bold text-slate-700 uppercase">
              Mobile Number (+91)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">+91</span>
              <input
                type="tel"
                maxLength={10}
                value={newPhone}
                onChange={e => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter 10-digit phone number"
                required
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-rose-200 bg-white text-slate-900 font-bold text-xs outline-none focus:border-red-600 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              id="autoSms"
              checked={newAutoSms}
              onChange={e => setNewAutoSms(e.target.checked)}
              className="w-4 h-4 accent-red-600 rounded"
            />
            <label htmlFor="autoSms" className="cursor-pointer select-none font-semibold">
              Automatically send SMS tracking link during SOS emergency trigger
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-red-500/20 flex items-center justify-center space-x-1.5 transition-all transform hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Save Emergency Family Contact</span>
          </button>
        </form>

        <div className="pt-2 border-t border-rose-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
