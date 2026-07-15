import React from 'react';
import { Home, Navigation, Radio, PhoneCall, UserCheck, ShieldAlert } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: 'home' | 'plan' | 'live' | 'heatmap' | 'contacts';
  setActiveTab: (tab: 'home' | 'plan' | 'live' | 'heatmap' | 'contacts') => void;
  onTriggerSOS: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  setActiveTab,
  onTriggerSOS
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 text-white px-2 py-2 shadow-2xl pointer-events-auto">
      <div className="max-w-md mx-auto flex items-center justify-around">
        
        {/* Home Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'text-red-500 font-black scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">Home</span>
        </button>

        {/* Find Route Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'plan'
              ? 'text-red-500 font-black scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">Safe Route</span>
        </button>

        {/* Floating Quick SOS Launcher Center Button */}
        <button
          type="button"
          onClick={onTriggerSOS}
          className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-600/50 border-4 border-slate-950 transition-transform active:scale-95 cursor-pointer z-50"
          title="Instant 1-Tap SOS"
        >
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </button>

        {/* Live Tracking Guard */}
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'live'
              ? 'text-red-500 font-black scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">Live Guard</span>
        </button>

        {/* Safety Contacts */}
        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'contacts'
              ? 'text-red-500 font-black scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight font-bold">Helplines</span>
        </button>
      </div>
    </div>
  );
};
