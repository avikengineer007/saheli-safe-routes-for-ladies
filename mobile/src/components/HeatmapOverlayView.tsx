import React from 'react';
import { HeatmapPoint } from '../types';
import { Flame, Clock } from 'lucide-react';

interface HeatmapOverlayViewProps {
  points: HeatmapPoint[];
  isElderlyMode: boolean;
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
          {points.length} Active Hotspots in India
        </span>
      </div>

      <p className="text-xs text-slate-600 font-medium leading-relaxed">
        Spatial density heatmap rendering verified crowdsourced community reports across Indian sectors. Older reports decay automatically so real-time signals take priority.
      </p>

      {/* Grid of verified India signals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {points.map((pt, idx) => (
          <div key={idx} className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs">
            <div>
              <div className="font-extrabold text-slate-900 capitalize flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span>{pt.category.replace('_', ' ')}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold flex items-center space-x-1 mt-1">
                <Clock className="w-3 h-3 text-red-500" />
                <span>{pt.ageDays} days ago</span>
              </div>
            </div>

            <div className="text-right">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white shadow-sm">
                {(pt.intensity * 100).toFixed(0)}% Intensity
              </span>
              <div className="text-[10px] font-mono text-slate-500 mt-1 font-semibold">
                {pt.lat.toFixed(3)}, {pt.lng.toFixed(3)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
