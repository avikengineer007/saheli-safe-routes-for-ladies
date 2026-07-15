import React, { useState } from 'react';
import { RouteCandidate } from '../types';
import { Shield, Clock, Navigation, CheckCircle2, AlertTriangle, MapPin, Sparkles, Sliders, LocateFixed } from 'lucide-react';
import { PlaceSearchInput } from './PlaceSearchInput';

interface RoutePlannerViewProps {
  candidates: RouteCandidate[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  onCalculateRoutes: (originName: string, destName: string, budget: number, originCoords?: { lat: number; lng: number }, destCoords?: { lat: number; lng: number }) => void;
  onStartJourney: (route: RouteCandidate) => void;
  isElderlyMode: boolean;
  disclaimerNotice?: string;
  userLocation?: { lat: number; lng: number };
}

const ALL_INDIAN_LOCATIONS = [
  // Delhi NCR
  'Connaught Place (Delhi)',
  'India Gate (New Delhi)',
  'Hauz Khas Village (Delhi)',
  'Cyber City (Gurugram, HR)',
  'Noida Sector 18 (UP)',
  'Chandni Chowk (Old Delhi)',
  // Maharashtra
  'Marine Drive (Mumbai, MH)',
  'Gateway of India (Mumbai, MH)',
  'Bandra Kurla Complex (BKC, Mumbai)',
  'FC Road (Pune, MH)',
  // Karnataka & South
  'MG Road Metro (Bengaluru, KA)',
  'Koramangala 5th Block (Bengaluru)',
  'T. Nagar Bus Terminus (Chennai, TN)',
  'Marina Beach (Chennai, TN)',
  'HITEC City (Hyderabad, TS)',
  'Charminar (Hyderabad, TS)',
  'Marine Drive Kochi (Kerala)',
  // West Bengal & East
  'Park Street Metro (Kolkata, WB)',
  'Rabindra Sadan (Kolkata, WB)',
  'Salt Lake Sector V (Kolkata, WB)',
  'Howrah Railway Station (WB)',
  'Patna Sahib Railway Hub (Bihar)',
  'KIIT Chowk Bhubaneswar (Odisha)',
  // North & Northeast
  'Police Bazaar (Shillong, ML)',
  'GS Road ABC Crossing (Guwahati, AS)',
  'Lal Chowk (Srinagar, J&K)',
  'Sector 17 Plaza (Chandigarh, UT)',
  'Hazratganj GPO (Lucknow, UP)',
  'Pink City Hawa Mahal (Jaipur, RJ)',
  'Sabarmati Riverfront (Ahmedabad, GJ)'
];

export const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({
  candidates,
  selectedRouteId,
  onSelectRoute,
  onCalculateRoutes,
  onStartJourney,
  isElderlyMode,
  disclaimerNotice,
  userLocation
}) => {
  const [originText, setOriginText] = useState('Connaught Place (Delhi)');
  const [destText, setDestText] = useState('India Gate (New Delhi)');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [detourBudget, setDetourBudget] = useState(25);

  const selectedCandidate = candidates.find(c => c.id === selectedRouteId) || candidates[0];

  return (
    <div className="space-y-4">
      {/* Route Planner Box */}
      <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xl space-y-4">
        
        <div className="flex items-center justify-between pb-2 border-b border-rose-100">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              Pan-India Safe Location Search
            </h2>
          </div>
          <span className="text-xs font-bold text-rose-600 bg-rose-100 px-3 py-1 rounded-full border border-rose-300">
            28 States & 8 UTs Active • Google Maps & Police Open Data
          </span>
        </div>

        {/* Input Controls with Smart Place Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCalculateRoutes(originText, destText, detourBudget, originCoords, destCoords);
          }}
          className="space-y-4"
        >
          {/* GPS Quick-Start Banner */}
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-rose-50 border border-blue-200">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <LocateFixed className="w-4 h-4 text-white" />
            </div>
            <div className="text-xs text-slate-700 font-medium leading-relaxed">
              <span className="font-extrabold text-blue-700">New!</span> Type any place in India or tap{' '}
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase">
                <Navigation className="w-2.5 h-2.5" />
                <span>My Location</span>
              </span>{' '}
              to auto-fill your current GPS position as the starting point.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Origin Search with GPS */}
            <PlaceSearchInput
              id="origin-search"
              label="Where are you starting from?"
              value={originText}
              onChange={(val, coords) => {
                setOriginText(val);
                setOriginCoords(coords);
              }}
              placeholder="Search starting location in India..."
              dotColor="blue"
              showGpsButton={true}
              userLocation={userLocation}
            />

            {/* Destination Search */}
            <PlaceSearchInput
              id="destination-search"
              label="Where do you want to go safely?"
              value={destText}
              onChange={(val, coords) => {
                setDestText(val);
                setDestCoords(coords);
              }}
              placeholder="Search destination in India..."
              dotColor="red"
              showGpsButton={false}
            />
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
                className="px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-md shadow-red-500/25 transition-all shrink-0 hover:scale-105 active:scale-95"
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
              Provides turn-by-turn guidance along well-lit Indian streets with live location check-ins to trusted family contacts.
            </p>
          </div>

          <button
            onClick={() => onStartJourney(selectedCandidate)}
            className="w-full md:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-rose-50 text-red-600 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-2xl transition-all transform hover:scale-105"
          >
            <Navigation className="w-5 h-5 text-red-600" />
            <span>Start Pan-India Safe Walk</span>
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
