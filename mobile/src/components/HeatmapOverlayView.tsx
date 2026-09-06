import React from 'react';
import { HeatmapPoint, getCategoryRadiusMeters } from '../types';
import { Flame, Clock, Target, MapPin } from 'lucide-react';

interface HeatmapOverlayViewProps {
  points: HeatmapPoint[];
  isElderlyMode?: boolean;
}

const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  poor_lighting:  { icon: '💡', label: 'Dark / Unlit Street',    color: 'bg-amber-100 text-amber-900 border-amber-300' },
  harassment:     { icon: '⚠️', label: 'Harassment Zone',        color: 'bg-red-100 text-red-900 border-red-300' },
  unsafe_area:    { icon: '🚨', label: 'Isolated / Unsafe Area',  color: 'bg-orange-100 text-orange-900 border-orange-300' },
  other:          { icon: '📍', label: 'Safety Concern',          color: 'bg-rose-100 text-rose-900 border-rose-300' },
};

export const HeatmapOverlayView: React.FC<HeatmapOverlayViewProps> = ({ points, isElderlyMode }) => {
  const textSize = isElderlyMode ? 'text-base' : 'text-xs';

  return (
    <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xl space-y-4 text-slate-900 animate-fade-slide-up">
      <div className="flex items-center justify-between border-b border-rose-100 pb-3">
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-red-600 animate-pulse" />
          <h3 className={`font-extrabold text-slate-900 ${isElderlyMode ? 'text-2xl' : 'text-lg'}`}>
            Pan-India Community Safety Map Signals
          </h3>
        </div>
        <span className={`font-bold text-red-600 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 ${textSize}`}>
          {points.length} Active Hotspot{points.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className={`text-slate-600 font-medium leading-relaxed ${textSize}`}>
        Spatial hazard density map. Affected zones: 10m for unlit streets, 100m for unsafe areas, 150m for harassment hotspots.
      </p>

      {/* Empty state */}
      {points.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-4xl shadow-inner">
            🛡️
          </div>
          <div>
            <h4 className="font-black text-emerald-700 text-lg">All Clear — No Active Reports</h4>
            <p className="text-sm text-slate-500 font-medium mt-1 max-w-xs">
              No safety incidents have been reported in this area. Tap any location on the map to anonymously report an unsafe spot.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
            <MapPin className="w-3.5 h-3.5" />
            <span>Tap the map to add a safety report</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {points.map((pt, idx) => {
            const radiusMeters = pt.radiusMeters || getCategoryRadiusMeters(pt.category);
            const meta = CATEGORY_META[pt.category] || CATEGORY_META.other;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border flex items-center justify-between animate-scale-in ${meta.color}`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div>
                  <div className={`font-extrabold capitalize flex items-center space-x-1.5 ${textSize}`}>
                    <span className="text-base">{meta.icon}</span>
                    <span>{meta.label}</span>
                  </div>
                  <div className={`text-slate-600 font-semibold flex items-center space-x-2 mt-1 ${textSize}`}>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-red-500" />
                      <span>{pt.ageDays}d ago</span>
                    </span>
                    <span className="flex items-center space-x-1 text-red-700 font-extrabold bg-red-100 px-1.5 py-0.5 rounded">
                      <Target className="w-3 h-3 text-red-600" />
                      <span>{radiusMeters}m zone</span>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-sm block">
                    {(pt.intensity * 100).toFixed(0)}%
                  </span>
                  <div className="text-[10px] font-mono text-slate-500 mt-1 font-semibold">
                    {pt.lat.toFixed(3)}, {pt.lng.toFixed(3)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
