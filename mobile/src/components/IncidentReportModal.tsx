import React, { useState } from 'react';
import { Shield, MapPin, Send, X, AlertTriangle, Lightbulb, UserX } from 'lucide-react';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinLocation: { lat: number; lng: number };
  onSubmitReport: (data: {
    category: 'harassment' | 'poor_lighting' | 'unsafe_area' | 'other';
    description: string;
    lat: number;
    lng: number;
  }) => Promise<{ message: string; status: string }>;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  isOpen,
  onClose,
  pinLocation,
  onSubmitReport
}) => {
  const [category, setCategory] = useState<'harassment' | 'poor_lighting' | 'unsafe_area' | 'other'>('poor_lighting');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; status: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await onSubmitReport({
        category,
        description,
        lat: pinLocation.lat,
        lng: pinLocation.lng
      });
      setFeedback(res);
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Error submitting report', status: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-6 rounded-3xl bg-white border border-rose-200 shadow-2xl relative space-y-4 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-rose-50 text-slate-500 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-red-600 flex items-center justify-center border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">
              Report Kolkata Safety Concern
            </h3>
            <p className="text-xs text-slate-500 font-medium">Anonymous Hyperlocal Community Map Signal</p>
          </div>
        </div>

        {feedback ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm text-center font-bold">
            <p className="mb-1">{feedback.message}</p>
            <p className="text-xs font-semibold opacity-80">Gating Status: {(feedback.status || 'VERIFIED').toUpperCase()}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Geo Pin Location Display */}
            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center space-x-1.5 font-bold">
                <MapPin className="w-4 h-4 text-red-600" />
                <span>Pinned Location:</span>
              </span>
              <strong className="font-mono text-slate-900">{pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}</strong>
            </div>

            {/* Category choices */}
            <div>
              <label className="block mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Safety Issue
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'poor_lighting', label: 'Dark / Unlit Street Lamps', icon: Lightbulb },
                  { id: 'harassment', label: 'Harassment Zone', icon: AlertTriangle },
                  { id: 'unsafe_area', label: 'Isolated Street Corner', icon: Shield },
                  { id: 'other', label: 'Other Safety Concern', icon: AlertTriangle }
                ].map(item => {
                  const Icon = item.icon;
                  const isSel = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id as any)}
                      className={`p-3 rounded-xl border text-left flex items-start space-x-2 text-xs font-bold transition-all ${
                        isSel
                          ? 'bg-red-600 border-red-600 text-white shadow-md'
                          : 'bg-rose-50/50 border-rose-200 text-slate-700 hover:bg-rose-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Details about dark alley, broken street lamps, or crowd safety..."
                className="w-full p-3 rounded-xl bg-rose-50/40 border border-rose-200 text-xs text-slate-900 font-medium outline-none focus:border-red-500 focus:bg-white transition-all"
              />
            </div>

            {/* Privacy notice */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
              <UserX className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Identity Protected: Reports are published anonymously on public Kolkata map.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-wider bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-lg shadow-red-500/25 flex items-center justify-center space-x-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting Report...' : 'Submit Anonymous Report'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
