import React from 'react';
import { Home, Navigation, Radio, PhoneCall, ShieldAlert } from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavBarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onTriggerSOS: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  setActiveTab,
  onTriggerSOS
}) => {
  const navItem = (
    tab: AppTab,
    icon: React.ReactNode,
    label: string
  ) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      aria-label={label}
      aria-current={activeTab === tab ? 'page' : undefined}
      className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer relative ${
        activeTab === tab
          ? 'text-red-500 font-black scale-105'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      <span className="text-[10px] tracking-tight font-bold">{label}</span>
      {/* Active indicator dot */}
      {activeTab === tab && (
        <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-red-500" />
      )}
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 text-white px-2 py-2 shadow-2xl pointer-events-auto">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItem('home',     <Home className="w-5 h-5 mb-0.5" />,       'Home')}
        {navItem('plan',     <Navigation className="w-5 h-5 mb-0.5" />, 'Safe Route')}

        {/* Floating Quick SOS Launcher Center Button */}
        <button
          type="button"
          onClick={onTriggerSOS}
          aria-label="Instant one-tap SOS emergency alert"
          className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-600/50 border-4 border-slate-950 transition-transform active:scale-95 cursor-pointer z-50 hover:scale-105"
          title="Instant 1-Tap SOS"
        >
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </button>

        {navItem('live',     <Radio className="w-5 h-5 mb-0.5" />,     'Live Guard')}
        {navItem('contacts', <PhoneCall className="w-5 h-5 mb-0.5" />, 'Helplines')}
      </div>
    </div>
  );
};
