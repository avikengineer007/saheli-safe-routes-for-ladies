import React from 'react';
import { HeatmapPoint, getCategoryRadiusMeters } from '../types';
import { Flame, Clock, Target } from 'lucide-react';

interface HeatmapOverlayViewProps {
  points: HeatmapPoint[];
  isElderlyMode?: boolean;
}

export const HeatmapOverlayView: React.FC<HeatmapOverlayViewProps> = ({ points }) => {
  return (
    <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xl space-y-4 text-slate-900">
      <div className="flex items-center justify-between border-b border-rose-100 pb-3">
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-red-600 animate-pulse" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            Pan-India Community Safety Map Signals
          </h3>
        </div>
        <span className="text-xs font-bold text-red-600 bg-rose-100 px-3 py-1 rounded-full border border-rose-300">
          {points.length} Active Hotspots
        </span>
      </div>

      <p className="text-xs text-slate-600 font-medium leading-relaxed">
        Spatial hazard density map. Each reported spot specifies affected zone range (10m for poor lighting, 100m for unsafe area, 150m for harassment).
      </p>

      {/* Grid of verified India signals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {points.map((pt, idx) => {
          const radiusMeters = pt.radiusMeters || getCategoryRadiusMeters(pt.category);
          return (
            <div key={idx} className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold text-slate-900 capitalize flex items-center space-x-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${pt.category === 'poor_lighting' ? 'bg-amber-500' : pt.category === 'unsafe_area' ? 'bg-orange-500' : 'bg-red-600'}`} />
                  <span>{pt.category.replace('_', ' ')}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold flex items-center space-x-2 mt-1">
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

              <div className="text-right">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-sm">
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
    </div>
  );
};
