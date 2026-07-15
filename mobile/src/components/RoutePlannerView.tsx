import React, { useState } from 'react';
import { RouteCandidate } from '../types';
import { Shield, Clock, Navigation, CheckCircle2, AlertTriangle, MapPin, Sparkles, Sliders } from 'lucide-react';

interface RoutePlannerViewProps {
  candidates: RouteCandidate[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  onCalculateRoutes: (originName: string, destName: string, budget: number) => void;
  onStartJourney: (route: RouteCandidate) => void;
  isElderlyMode: boolean;
  disclaimerNotice?: string;
}

const ALL_KOLKATA_LOCATIONS = [
  'Park Street Metro Station',
  'Rabindra Sadan Crossing',
  'Victoria Memorial Hall',
  'Salt Lake Sector V (IT Hub)',
  'Howrah Railway Station',
  'Sealdah Railway Station',
  'Netaji Subhash Chandra Bose Intl Airport (CCU)',
  'Gariahat Crossing & Mall',
  'Esplanade Bus Terminus',
  'New Market (Lindsay Street)',
  'College Street Market & University',
  'Burrabazar Commercial Area',
  'Karunamoyee Bus Station (Salt Lake)',
  'Eco Park Rajarhat',
  'City Centre 1 (Salt Lake)',
  'EM Bypass Ruby Hospital Crossing',
  'Science City Kolkata',
  'Ballygunge Phandi',
  'Jadavpur 8B Bus Stand',
  'Jadavpur University Campus',
  'Kalighat Temple',
  'Tollygunge Metro Station',
  'Bhowanipore',
  'South City Mall (Prince Anwar Shah Rd)',
  'Behala Chowrasta',
  'Alipore Zoo',
  'Shyambazar Five Point Crossing',
  'Shobhabazar Sutanuti',
  'Dakshineswar Temple',
  'Belur Math'
];

export const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({
  candidates,
  selectedRouteId,
  onSelectRoute,
  onCalculateRoutes,
  onStartJourney,
  isElderlyMode,
  disclaimerNotice
}) => {
  const [originText, setOriginText] = useState('Park Street Metro Station');
  const [destText, setDestText] = useState('Rabindra Sadan Crossing');
  const [detourBudget, setDetourBudget] = useState(25);

  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  const selectedCandidate = candidates.find(c => c.id === selectedRouteId) || candidates[0];

  const filteredOriginList = ALL_KOLKATA_LOCATIONS.filter(l =>
    l.toLowerCase().includes(originText.toLowerCase())
  );

  const filteredDestList = ALL_KOLKATA_LOCATIONS.filter(l =>
    l.toLowerCase().includes(destText.toLowerCase())
  );

  const handleChipClick = (target: 'origin' | 'dest', label: string) => {
    if (target === 'origin') {
      setOriginText(label);
      setShowOriginSuggestions(false);
    } else {
      setDestText(label);
      setShowDestSuggestions(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Route Planner Box */}
      <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xl space-y-4">
        
        <div className="flex items-center justify-between pb-2 border-b border-rose-100">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              Kolkata Safe Location Search
            </h2>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-100 px-3 py-1 rounded-full border border-rose-300">
            Google Maps & Kolkata Police Data Active
          </span>
        </div>

        {/* Input Controls with Autocomplete Dropdowns */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShowOriginSuggestions(false);
            setShowDestSuggestions(false);
            onCalculateRoutes(originText, destText, detourBudget);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Origin Search */}
            <div className="relative">
              <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-slate-700">
                Where are you starting from?
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />
                <input
                  type="text"
                  value={originText}
                  onChange={e => {
                    setOriginText(e.target.value);
                    setShowOriginSuggestions(true);
                  }}
                  onFocus={() => setShowOriginSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                  placeholder="Search starting Kolkata location..."
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-rose-300 bg-white text-slate-900 font-extrabold text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
                />
              </div>

              {/* Origin Autocomplete Menu */}
              {showOriginSuggestions && filteredOriginList.length > 0 && (
                <div className="absolute left-0 right-0 top-20 bg-white border-2 border-rose-300 rounded-2xl shadow-2xl py-2 z-50 max-h-60 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] uppercase font-black text-rose-600 border-b border-rose-100 bg-rose-50">
                    Google Maps Matching Locations
                  </div>
                  {filteredOriginList.map(place => (
                    <button
                      type="button"
                      key={`orig_sug_${place}`}
                      onClick={() => {
                        setOriginText(place);
                        setShowOriginSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-rose-500 hover:text-white flex items-center justify-between border-b border-slate-100 transition-colors"
                    >
                      <span>📍 {place}</span>
                      <span className="text-[10px] opacity-75">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Kolkata Chips for Origin */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-slate-400 self-center">Popular:</span>
                {ALL_KOLKATA_LOCATIONS.slice(0, 3).map(chip => (
                  <button
                    type="button"
                    key={`orig_${chip}`}
                    onClick={() => handleChipClick('origin', chip)}
                    className="px-2.5 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-900 text-[11px] font-extrabold transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Search */}
            <div className="relative">
              <label className="block mb-1.5 font-bold text-xs uppercase tracking-wider text-slate-700">
                Where do you want to go safely?
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 w-3 h-3 rounded-full bg-red-600 ring-4 ring-red-100" />
                <input
                  type="text"
                  value={destText}
                  onChange={e => {
                    setDestText(e.target.value);
                    setShowDestSuggestions(true);
                  }}
                  onFocus={() => setShowDestSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                  placeholder="Search destination Kolkata location..."
                  className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-rose-300 bg-white text-slate-900 font-extrabold text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
                />
              </div>

              {/* Destination Autocomplete Menu */}
              {showDestSuggestions && filteredDestList.length > 0 && (
                <div className="absolute left-0 right-0 top-20 bg-white border-2 border-rose-300 rounded-2xl shadow-2xl py-2 z-50 max-h-60 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] uppercase font-black text-rose-600 border-b border-rose-100 bg-rose-50">
                    Google Maps Matching Locations
                  </div>
                  {filteredDestList.map(place => (
                    <button
                      type="button"
                      key={`dest_sug_${place}`}
                      onClick={() => {
                        setDestText(place);
                        setShowDestSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-rose-500 hover:text-white flex items-center justify-between border-b border-slate-100 transition-colors"
                    >
                      <span>📍 {place}</span>
                      <span className="text-[10px] opacity-75">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Kolkata Chips for Destination */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-slate-400 self-center">Popular:</span>
                {ALL_KOLKATA_LOCATIONS.slice(3, 6).map(chip => (
                  <button
                    type="button"
                    key={`dest_${chip}`}
                    onClick={() => handleChipClick('dest', chip)}
                    className="px-2.5 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-900 text-[11px] font-extrabold transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detour Safety Preference Slider */}
          <div className="pt-3 border-t border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
              <Sliders className="w-4 h-4 text-red-600" />
              <span>Max Extra Walking Detour for Safety: <strong className="text-red-600 font-bold">+{detourBudget}% extra time</strong></span>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-1/2">
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={detourBudget}
                onChange={e => setDetourBudget(Number(e.target.value))}
                className="w-full accent-red-600 h-2 bg-rose-100 rounded-lg cursor-pointer"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-md shadow-red-500/25 transition-all shrink-0"
              >
                Find Safest Path
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Candidate Route Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {candidates.map(candidate => {
          const isSelected = candidate.id === selectedRouteId;
          const isSafest = candidate.tag === 'safest';

          return (
            <div
              key={candidate.id}
              onClick={() => onSelectRoute(candidate.id)}
              className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative ${
                isSelected
                  ? 'bg-white border-red-500 ring-2 ring-red-500/30 shadow-2xl scale-[1.01]'
                  : 'bg-white/80 border-rose-200 hover:border-rose-300 shadow-sm'
              }`}
            >
              {isSafest && (
                <span className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Safest Pick</span>
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {candidate.name}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs font-semibold text-slate-500 mt-1.5">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <span>{candidate.durationMinutes} min walk</span>
                    </span>
                    <span>•</span>
                    <span>{(candidate.distanceMeters / 1000).toFixed(2)} km</span>
                  </div>
                </div>

                {/* Score Badge */}
                <div className={`px-3 py-1.5 rounded-2xl text-center border ${
                  candidate.compositeSafetyScore >= 80
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : candidate.compositeSafetyScore >= 60
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-rose-100 border-rose-300 text-rose-800'
                }`}>
                  <div className="text-xl font-black leading-none">{candidate.compositeSafetyScore}</div>
                  <div className="text-[9px] uppercase tracking-wider font-bold">Safety</div>
                </div>
              </div>

              {/* Safety Explanations */}
              <div className="space-y-1.5 mt-3 pt-3 border-t border-rose-100">
                {candidate.scoreExplanation.slice(0, 2).map((exp, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs font-medium text-slate-700">
                    <Shield className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{exp}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Action Launch Box */}
      {selectedCandidate && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-red-600 via-rose-500 to-rose-600 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-100 text-xs font-extrabold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ready to start: {selectedCandidate.name}</span>
            </div>
            <p className="text-xs text-rose-100 font-medium max-w-xl leading-relaxed">
              Provides turn-by-turn guidance along well-lit Kolkata streets with live location check-ins to trusted family contacts.
            </p>
          </div>

          <button
            onClick={() => onStartJourney(selectedCandidate)}
            className="w-full md:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-rose-50 text-red-600 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-2xl transition-all transform hover:scale-105"
          >
            <Navigation className="w-5 h-5 text-red-600" />
            <span>Start Safe Kolkata Walk</span>
          </button>
        </div>
      )}

      {disclaimerNotice && (
        <p className="text-[11px] text-slate-500 text-center font-medium italic">
          * {disclaimerNotice}
        </p>
      )}
    </div>
  );
};
