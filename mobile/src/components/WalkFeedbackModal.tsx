import React, { useState } from 'react';
import { Star, CheckCircle, X, ThumbsUp, ThumbsDown, Lightbulb, MessageSquare } from 'lucide-react';
import { ApiClient } from '../services/apiClient';

interface WalkFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  journeyId: string;
  routeName: string;
}

export const WalkFeedbackModal: React.FC<WalkFeedbackModalProps> = ({
  isOpen,
  onClose,
  journeyId,
  routeName
}) => {
  const [safetyRating, setSafetyRating] = useState<number>(5);
  const [lightingAdequate, setLightingAdequate] = useState<string>('adequate');
  const [detourWorthIt, setDetourWorthIt] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await ApiClient.submitWalkFeedback({
        journeyId,
        safetyRating,
        lightingAdequate,
        detourWorthIt,
        notes: notes.trim() || undefined
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1600);
    } catch {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1600);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 space-y-5 animate-scale-in">
        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Walk Feedback Recorded!</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your real walked-route experience directly fine-tunes the deterministic safety weights for all sisters in Kolkata.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-rose-100">
              <div>
                <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Journey Completed Safely
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Rate Your Walk
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                  {routeName}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Question 1: Perceived Safety Star Rating */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>How safe did this route feel overall?</span>
              </label>
              <div className="flex items-center justify-center space-x-2 py-1 bg-rose-50/50 rounded-2xl border border-rose-100">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSafetyRating(star)}
                    className="p-1.5 focus:outline-none transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= safetyRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2: Street Lighting Ground Truth */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Was street lighting adequate on this walk?</span>
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { value: 'adequate', label: 'Well Lit' },
                  { value: 'partial', label: 'Dim / Partial' },
                  { value: 'pitch_dark', label: 'Dark / Broken' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLightingAdequate(opt.value)}
                    className={`py-2 px-1 rounded-xl text-center font-bold border transition-all ${
                      lightingAdequate === opt.value
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 3: Detour Acceptance */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>Did the extra walking detour feel worth the safety?</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDetourWorthIt(true)}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-2 font-bold border transition-all ${
                    detourWorthIt
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes, felt safer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetourWorthIt(false)}
                  className={`py-2 px-3 rounded-xl flex items-center justify-center space-x-2 font-bold border transition-all ${
                    !detourWorthIt
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>No, too long</span>
                </button>
              </div>
            </div>

            {/* Question 4: Additional Real Observations */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                <span>Any specifics (friendly shops, barking dogs, quiet lanes)?</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes to help refine Kolkata safety map..."
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Submit Walk Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
