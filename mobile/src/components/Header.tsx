import React from 'react';
import { ShieldCheck, HeartHandshake, Eye, Sparkles, MapPin } from 'lucide-react';
import { useElderlyMode } from '../context/ElderlyModeContext';

interface HeaderProps {
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  activeTab: 'home' | 'plan' | 'live' | 'heatmap' | 'contacts';
  setActiveTab: (tab: 'home' | 'plan' | 'live' | 'heatmap' | 'contacts') => void;
}

export const Header: React.FC<HeaderProps> = ({
  showHeatmap,
  onToggleHeatmap,
  activeTab,
  setActiveTab
}) => {
  const { ageGroup, setAgeGroup, isElderlyMode, caregiverLinked } = useElderlyMode();

  return (
    <header className="w-full py-4 px-6 bg-white border-b border-rose-200 shadow-md text-slate-900 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand Header */}
        <div onClick={() => setActiveTab('home')} className="flex items-center space-x-3 cursor-pointer select-none">
          <img
            src="/logo.png"
            alt="SAHELI Safety Route Logo"
            className="w-12 h-12 object-cover rounded-2xl shadow-md border border-rose-200 hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-tight text-red-600">
                SAHELI
              </h1>
              <span className="text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-red-600" />
                <span>Pan-India Safe Routes (28 States & 8 UTs)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Safe Walking Path Finder & Emergency Guard for Sisters & Elders across India</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="flex flex-wrap items-center space-x-1 bg-rose-100 p-1.5 rounded-2xl border border-rose-200">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'plan'
                ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Find Safe Route
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Tracking
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'contacts'
                ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Safety Contacts
          </button>
        </div>

        {/* Right Accessibility Controls */}
        <div className="flex items-center space-x-3">
          {/* Heatmap Toggle */}
          <button
            onClick={onToggleHeatmap}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              showHeatmap
                ? 'bg-rose-100 border-rose-300 text-rose-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-rose-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-red-500" />
            <span>Safety Map</span>
          </button>

          {/* Simple Mode Toggle */}
          <div className="flex items-center bg-white border border-rose-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setAgeGroup('adult')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                !isElderlyMode
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setAgeGroup('elderly')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                isElderlyMode
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-red-600 hover:text-red-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Elderly Mode</span>
            </button>
          </div>

          {/* Caregiver Indicator */}
          {caregiverLinked && (
            <div className="hidden lg:flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 font-semibold">
              <HeartHandshake className="w-4 h-4 text-red-600" />
              <span>Caregiver Connected</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
