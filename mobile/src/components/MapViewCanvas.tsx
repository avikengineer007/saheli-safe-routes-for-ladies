import React from 'react';
import { RouteCandidate, HeatmapPoint } from '../types';

interface MapViewCanvasProps {
  candidates: RouteCandidate[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  heatmapPoints: HeatmapPoint[];
  showHeatmap: boolean;
  activeJourneyLocation?: { lat: number; lng: number };
  isDeviated?: boolean;
  isElderlyMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

export const MapViewCanvas: React.FC<MapViewCanvasProps> = ({
  candidates,
  selectedRouteId,
  onSelectRoute,
  heatmapPoints,
  showHeatmap,
  activeJourneyLocation,
  isDeviated,
  isElderlyMode,
  onMapClick
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResultPin, setSearchResultPin] = React.useState<{ lat: number; lng: number; name: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const LANDMARKS = [
    // Delhi NCR
    { name: 'Connaught Place (Delhi)', lat: 28.6315, lng: 77.2167 },
    { name: 'India Gate (New Delhi)', lat: 28.6129, lng: 77.2295 },
    { name: 'Hauz Khas Village (Delhi)', lat: 28.5494, lng: 77.1960 },
    { name: 'Cyber City (Gurugram, HR)', lat: 28.4950, lng: 77.0895 },
    { name: 'Noida Sector 18 (UP)', lat: 28.5708, lng: 77.3261 },
    // Maharashtra & West
    { name: 'Marine Drive (Mumbai, MH)', lat: 18.9438, lng: 72.8232 },
    { name: 'Gateway of India (Mumbai)', lat: 18.9220, lng: 72.8347 },
    { name: 'Bandra Kurla Complex (BKC, Mumbai)', lat: 19.0657, lng: 72.8686 },
    { name: 'FC Road (Pune, MH)', lat: 18.5204, lng: 73.8416 },
    { name: 'Pink City Hawa Mahal (Jaipur, RJ)', lat: 26.9239, lng: 75.8267 },
    { name: 'Sabarmati Riverfront (Ahmedabad, GJ)', lat: 23.0300, lng: 72.5800 },
    // Karnataka & South
    { name: 'MG Road Metro (Bengaluru, KA)', lat: 12.9756, lng: 77.6066 },
    { name: 'Koramangala 5th Block (Bengaluru)', lat: 12.9352, lng: 77.6245 },
    { name: 'T. Nagar Bus Terminus (Chennai, TN)', lat: 13.0418, lng: 80.2341 },
    { name: 'Marina Beach (Chennai, TN)', lat: 13.0500, lng: 80.2824 },
    { name: 'HITEC City (Hyderabad, TS)', lat: 17.4435, lng: 78.3772 },
    { name: 'Charminar (Hyderabad, TS)', lat: 17.3616, lng: 78.4747 },
    { name: 'Marine Drive Kochi (Kerala)', lat: 9.9784, lng: 76.2753 },
    // West Bengal & East
    { name: 'Park Street Metro (Kolkata, WB)', lat: 22.5552, lng: 88.3510 },
    { name: 'Rabindra Sadan (Kolkata, WB)', lat: 22.5416, lng: 88.3475 },
    { name: 'Salt Lake Sector V (Kolkata, WB)', lat: 22.5731, lng: 88.4337 },
    { name: 'Howrah Railway Station (WB)', lat: 22.5839, lng: 88.3430 },
    { name: 'Patna Sahib Railway Hub (Bihar)', lat: 25.6110, lng: 85.2285 },
    { name: 'KIIT Chowk Bhubaneswar (Odisha)', lat: 20.3533, lng: 85.8189 },
    // Northeast & North
    { name: 'Police Bazaar (Shillong, ML)', lat: 25.5760, lng: 91.8847 },
    { name: 'GS Road ABC Crossing (Guwahati, AS)', lat: 26.1554, lng: 91.7783 },
    { name: 'Lal Chowk (Srinagar, J&K)', lat: 34.0713, lng: 74.8078 },
    { name: 'Sector 17 Plaza (Chandigarh, UT)', lat: 30.7398, lng: 76.7827 },
    { name: 'Hazratganj GPO (Lucknow, UP)', lat: 26.8467, lng: 80.9462 }
  ];

  const suggestions = searchQuery.trim()
    ? LANDMARKS.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : LANDMARKS;

  // Calculate dynamic center & bounding box from candidate routes or search pin
  const allPts: Array<[number, number]> = [];
  candidates.forEach(c => c.geoJsonPolyline.forEach(pt => allPts.push(pt)));
  if (searchResultPin) allPts.push([searchResultPin.lat, searchResultPin.lng]);

  let baseLat = 22.5500;
  let baseLng = 88.3500;
  let scaleFactor = 32000;

  if (allPts.length > 0) {
    const lats = allPts.map(p => p[0]);
    const lngs = allPts.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    baseLat = (minLat + maxLat) / 2;
    baseLng = (minLng + maxLng) / 2;

    const latSpan = Math.max(0.015, maxLat - minLat);
    const lngSpan = Math.max(0.015, maxLng - minLng);

    const scaleY = 380 / latSpan;
    const scaleX = 680 / lngSpan;
    scaleFactor = Math.min(scaleX, scaleY, 45000);
  }

  const projectCoords = (lat: number, lng: number): [number, number] => {
    const x = 400 + (lng - baseLng) * scaleFactor;
    const y = 250 - (lat - baseLat) * scaleFactor;
    return [Math.max(30, Math.min(770, x)), Math.max(30, Math.min(470, y))];
  };

  const handleSelectPlace = (place: { lat: number; lng: number; name: string }) => {
    setSearchQuery(place.name);
    setSearchResultPin(place);
    setShowSuggestions(false);
    if (onMapClick) {
      onMapClick(place.lat, place.lng);
    }
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMapClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const lng = baseLng + (clickX - 400) / scaleFactor;
    const lat = baseLat - (clickY - 250) / scaleFactor;
    onMapClick(lat, lng);
  };

  // Kolkata Landmark positions for map context
  const victoriaCoords = projectCoords(22.5448, 88.3426);
  const parkStMetroCoords = projectCoords(22.5552, 88.3510);
  const rabindraSadanCoords = projectCoords(22.5416, 88.3475);

  return (
    <div className={`relative w-full h-[480px] rounded-3xl overflow-hidden shadow-2xl border ${
      isElderlyMode ? 'border-amber-400 bg-slate-950' : 'border-slate-800 bg-slate-900'
    }`}>
      {/* Top Map Control Bar with Search */}
      <div className="absolute top-4 left-4 right-4 z-40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* City Badge Overlay */}
        <div className="flex items-center space-x-2 bg-slate-800 border-2 border-slate-600 px-4 py-2 rounded-full text-xs text-white shrink-0 shadow-2xl z-40">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-black text-slate-100 tracking-wide">Kolkata Safe Map</span>
        </div>

        {/* Dynamic Place Search Bar */}
        <div className="relative w-full sm:w-80 z-50">
          <div className="flex items-center bg-white border-2 border-rose-300 px-4 py-2 shadow-2xl rounded-full">
            <span className="text-rose-600 mr-2 text-sm shrink-0">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search place in Kolkata..."
              className="bg-transparent text-slate-900 placeholder-slate-400 text-xs font-extrabold outline-none w-full border-none focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResultPin(null);
                  setShowSuggestions(false);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-black px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 bg-white border-2 border-rose-300 rounded-2xl shadow-2xl py-1 z-50 max-h-56 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] uppercase font-black text-rose-600 border-b border-rose-100 bg-rose-50">
                Kolkata Places & Landmarks
              </div>
              {suggestions.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleSelectPlace(item)}
                  className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-800 bg-white hover:bg-rose-500 hover:text-white flex items-center justify-between transition-colors border-b border-slate-100 last:border-0"
                >
                  <span className="flex items-center space-x-1.5">
                    <span>📍</span>
                    <span>{item.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Select</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <svg
        className="w-full h-full cursor-crosshair select-none"
        viewBox="0 0 800 500"
        onClick={handleSvgClick}
      >
        <defs>
          <radialGradient id="heatGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isElderlyMode ? '#334155' : '#1e293b'} strokeWidth="1" />
          </pattern>
        </defs>

        <rect width="800" height="500" fill={isElderlyMode ? '#020617' : '#0f172a'} />
        <rect width="800" height="500" fill="url(#grid)" />

        {/* Kolkata Major Roads (AJC Bose Rd & Park Street Arterial) */}
        <path d="M 120 440 L 700 80" fill="none" stroke="#334155" strokeWidth="14" strokeLinecap="round" />
        <path d="M 200 80 L 650 440" fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />

        {/* Streetlight indicators */}
        {[200, 300, 400, 500, 600].map((x, idx) => (
          <circle key={`light_${idx}`} cx={x} cy={380 - idx * 55} r="3.5" fill="#fbbf24" opacity="0.85" />
        ))}

        {/* Kolkata Landmark Labels */}
        <g transform={`translate(${parkStMetroCoords[0]}, ${parkStMetroCoords[1]})`}>
          <rect x="-55" y="-22" width="110" height="20" rx="6" fill="#090d16" opacity="1" stroke="#475569" strokeWidth="1.5" />
          <text x="0" y="-8" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">🚇 Park Street Metro</text>
        </g>

        <g transform={`translate(${rabindraSadanCoords[0]}, ${rabindraSadanCoords[1]})`}>
          <rect x="-55" y="6" width="110" height="20" rx="6" fill="#090d16" opacity="1" stroke="#475569" strokeWidth="1.5" />
          <text x="0" y="20" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">🎭 Rabindra Sadan</text>
        </g>

        <g transform={`translate(${victoriaCoords[0]}, ${victoriaCoords[1]})`}>
          <rect x="-60" y="-22" width="120" height="20" rx="6" fill="#090d16" opacity="1" stroke="#475569" strokeWidth="1.5" />
          <text x="0" y="-8" textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="bold">🏛️ Victoria Memorial</text>
        </g>

        {/* Crowdsourced Heatmap Layer */}
        {showHeatmap && heatmapPoints.map((pt, idx) => {
          const [x, y] = projectCoords(pt.lat, pt.lng);
          const radius = 35 + pt.intensity * 25;
          return (
            <g key={`heat_${idx}`}>
              <circle cx={x} cy={y} r={radius} fill="url(#heatGlow)" />
              <circle cx={x} cy={y} r="5" fill="#ef4444" stroke="#fef2f2" strokeWidth="1.5" />
              <text x={x + 8} y={y - 8} fill="#f87171" fontSize="10" fontWeight="bold">
                {pt.category.replace('_', ' ')}
              </text>
            </g>
          );
        })}

        {/* Candidate Routes Rendering */}
        {candidates.map((candidate) => {
          if (!candidate.geoJsonPolyline || candidate.geoJsonPolyline.length === 0) return null;
          const isSelected = candidate.id === selectedRouteId;
          const points = candidate.geoJsonPolyline.map(pt => projectCoords(pt[0], pt[1]));
          const pathD = points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`, '');

          let color = '#3b82f6';
          if (candidate.tag === 'safest') color = '#10b981';
          else if (candidate.tag === 'fastest') color = '#f59e0b';

          return (
            <g key={candidate.id} onClick={(e) => { e.stopPropagation(); onSelectRoute && onSelectRoute(candidate.id); }}>
              {isSelected && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={isElderlyMode ? "14" : "10"}
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                />
              )}

              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? (isElderlyMode ? "7" : "5") : "3"}
                strokeDasharray={candidate.tag === 'fastest' ? '6 4' : 'none'}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-300 hover:opacity-100 opacity-90"
              />

              {candidate.segments && candidate.segments.map((seg, sIdx) => {
                if (seg && seg.score < 50 && seg.start) {
                  const [sx, sy] = projectCoords(seg.start.lat, seg.start.lng);
                  return (
                    <circle key={`unlit_${candidate.id}_${sIdx}`} cx={sx} cy={sy} r="5" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
                  );
                }
                return null;
              })}
            </g>
          );
        })}

        {/* Origin & Destination Pin Markers */}
        {candidates.length > 0 && candidateFirstLast(candidates[0], projectCoords)}

        {/* Searched Location Pin Marker */}
        {searchResultPin && (
          <g transform={`translate(${projectCoords(searchResultPin.lat, searchResultPin.lng).join(',')})`}>
            <circle r="18" fill="#a855f7" opacity="0.35" className="animate-pulse" />
            <circle r="10" fill="#9333ea" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="-14" textAnchor="middle" fill="#f3e8ff" fontSize="10" fontWeight="extrabold">
              📍 {searchResultPin.name}
            </text>
          </g>
        )}

        {/* Live Tracking Position Marker */}
        {activeJourneyLocation && (
          <g transform={`translate(${projectCoords(activeJourneyLocation.lat, activeJourneyLocation.lng).join(',')})`}>
            <circle r="22" fill={isDeviated ? "#ef4444" : "#10b981"} opacity="0.3" className="animate-ping" />
            <circle r="12" fill={isDeviated ? "#dc2626" : "#059669"} stroke="#ffffff" strokeWidth="2.5" />
            <circle r="4" fill="#ffffff" />
          </g>
        )}
      </svg>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center bg-slate-950 border-2 border-slate-700 px-4 py-2.5 rounded-2xl text-xs shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-1 bg-emerald-500 rounded-full" />
            <span className="text-slate-200 font-bold">Safest Route</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-1 bg-amber-500 rounded-full" />
            <span className="text-slate-200 font-bold">Fastest Shortcut</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-200 font-bold">Unlit Spot</span>
          </div>
        </div>
        <span className="text-slate-400 text-[11px]">Click map anywhere to add report</span>
      </div>
    </div>
  );
};

function candidateFirstLast(cand: RouteCandidate, project: (lat: number, lng: number) => [number, number]) {
  if (!cand || !cand.geoJsonPolyline || cand.geoJsonPolyline.length === 0) return null;
  const first = cand.geoJsonPolyline[0];
  const last = cand.geoJsonPolyline[cand.geoJsonPolyline.length - 1];
  if (!first || !last) return null;
  const [ox, oy] = project(first[0], first[1]);
  const [dx, dy] = project(last[0], last[1]);

  return (
    <>
      <g transform={`translate(${ox},${oy})`}>
        <circle r="11" fill="#3b82f6" stroke="#ffffff" strokeWidth="2.5" />
        <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">Start</text>
      </g>
      <g transform={`translate(${dx},${dy})`}>
        <circle r="11" fill="#f43f5e" stroke="#ffffff" strokeWidth="2.5" />
        <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">End</text>
      </g>
    </>
  );
}
