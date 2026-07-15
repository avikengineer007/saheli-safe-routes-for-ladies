import React from 'react';
import { useElderlyMode } from '../context/ElderlyModeContext';
import { HeartHandshake, Phone, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

interface ElderlyModeViewProps {
  onStartSimpleJourney: () => void;
  onTriggerSOS: () => void;
}

export const ElderlyModeView: React.FC<ElderlyModeViewProps> = ({
  onStartSimpleJourney,
  onTriggerSOS
}) => {
  const { caregiverPhone, setCaregiverPhone, caregiverLinked, setCaregiverLinked } = useElderlyMode();

  return (
    <div className="p-6 rounded-3xl bg-white border-2 border-red-500 shadow-2xl text-slate-900 space-y-6">
      
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-rose-200">
        <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-500/30">
          <Sparkles className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-red-600 tracking-tight">
            Kolkata Elderly Companion
          </h2>
          <p className="text-sm font-semibold text-slate-600">Simple 2-Tap Kolkata Safe Walk & Family Alert</p>
        </div>
      </div>

      {/* Large 2-Tap Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Safe Kolkata Walk Button */}
        <button
          onClick={onStartSimpleJourney}
          className="p-6 rounded-3xl bg-gradient-to-br from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black text-xl tracking-wide flex flex-col items-center justify-center space-y-2 shadow-2xl shadow-red-500/30 transition-all border-2 border-rose-300 transform hover:scale-102"
        >
          <Navigation className="w-11 h-11 text-white" />
          <span>START SAFE WALK</span>
          <span className="text-xs font-bold uppercase text-rose-100 opacity-90">Auto-routes along well-lit Kolkata main roads</span>
        </button>

        {/* Big Emergency SOS Button */}
        <button
          onClick={onTriggerSOS}
          className="p-6 rounded-3xl bg-red-700 hover:bg-red-800 text-white font-black text-xl tracking-wide flex flex-col items-center justify-center space-y-2 shadow-2xl shadow-red-700/40 transition-all border-2 border-red-900 transform hover:scale-102"
        >
          <ShieldAlert className="w-11 h-11 text-white animate-pulse" />
          <span>EMERGENCY SOS</span>
          <span className="text-xs font-bold uppercase text-rose-100 opacity-90">Instant alert to family + Kolkata 1091 helpline</span>
        </button>

      </div>

      {/* Caregiver Settings Card */}
      <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-600 font-extrabold text-lg">
            <HeartHandshake className="w-6 h-6 text-red-600" />
            <span>Caregiver Link & Walk Updates</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={caregiverLinked}
              onChange={e => setCaregiverLinked(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <Phone className="w-5 h-5 text-red-600 shrink-0" />
          <input
            type="text"
            value={caregiverPhone}
            onChange={e => setCaregiverPhone(e.target.value)}
            placeholder="Caregiver Phone (+91 ...)"
            className="w-full p-3 rounded-xl bg-white border border-rose-300 text-slate-900 text-base font-bold outline-none focus:border-red-500 shadow-inner"
          />
        </div>

        <p className="text-xs text-slate-600 font-semibold leading-relaxed">
          * Family contacts automatically receive live SMS tracking links when you start a Kolkata walk or tap SOS.
        </p>
      </div>

    </div>
  );
};
