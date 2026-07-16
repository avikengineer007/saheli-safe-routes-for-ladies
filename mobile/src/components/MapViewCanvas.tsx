import React, { useEffect, useRef } from 'react';
import { RouteCandidate, HeatmapPoint } from '../types';

interface MapViewCanvasProps {
  candidates: RouteCandidate[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  heatmapPoints: HeatmapPoint[];
  showHeatmap: boolean;
  userLocation?: { lat: number; lng: number };
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
  userLocation,
  activeJourneyLocation,
  isDeviated,
  isElderlyMode,
  onMapClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const Leaflet = (window as any).L;
      if (!Leaflet) return;

      const initialCenter = activeJourneyLocation || userLocation || { lat: 28.6315, lng: 77.2167 };
      
      const map = Leaflet.map(mapContainerRef.current, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: 13,
        zoomControl: true
      });

      // CartoDB Voyager OpenStreetMap Tiles (Ultra-clear high-contrast road map)
      Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      layersGroupRef.current = Leaflet.layerGroup().addTo(map);

      map.on('click', (e: any) => {
        if (e.latlng && onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      leafletMapRef.current = map;
    }

    return () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (_) {}
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update Layers & Polylines when candidate routes, selected route, or heatmap changes
  useEffect(() => {
    const map = leafletMapRef.current;
    const Leaflet = (window as any).L;
    if (!map || !Leaflet || !layersGroupRef.current) return;

    layersGroupRef.current.clearLayers();

    const bounds: any[] = [];

    // 1. Draw Candidate Route Polylines
    candidates.forEach((candidate) => {
      const isSelected = candidate.id === selectedRouteId;
      const poly = candidate.geoJsonPolyline;
      if (!poly || poly.length < 2) return;

      const latLngs = poly.map(pt => [pt[0], pt[1]]);
      latLngs.forEach(pt => bounds.push(pt));

      let color = '#3b82f6'; // Blue for balanced
      if (candidate.tag === 'safest') color = '#10b981'; // Emerald green
      else if (candidate.tag === 'fastest') color = '#f59e0b'; // Amber

      const line = Leaflet.polyline(latLngs, {
        color,
        weight: isSelected ? 7 : 4,
        opacity: isSelected ? 1.0 : 0.55,
        dashArray: candidate.tag === 'fastest' ? '8, 8' : undefined
      });

      line.on('click', () => {
        if (onSelectRoute) onSelectRoute(candidate.id);
      });

      layersGroupRef.current.addLayer(line);

      // Render start/end markers for selected route
      if (isSelected && latLngs.length > 0) {
        const startPt = latLngs[0];
        const endPt = latLngs[latLngs.length - 1];

        const startIcon = Leaflet.divIcon({
          className: 'custom-pin-start',
          html: `<div style="background-color:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:3px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);">A</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const endIcon = Leaflet.divIcon({
          className: 'custom-pin-end',
          html: `<div style="background-color:#dc2626;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:3px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);">B</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        layersGroupRef.current.addLayer(Leaflet.marker(startPt, { icon: startIcon }));
        layersGroupRef.current.addLayer(Leaflet.marker(endPt, { icon: endIcon }));
      }

      // Draw unlit segment markers
      if (candidate.segments) {
        candidate.segments.forEach(seg => {
          if (seg.score < 50 && seg.start) {
            const warningMarker = Leaflet.circleMarker([seg.start.lat, seg.start.lng], {
              radius: 6,
              fillColor: '#ef4444',
              color: '#7f1d1d',
              weight: 2,
              fillOpacity: 0.9
            });
            warningMarker.bindTooltip('⚠️ Unlit Street Segment (Dim Lighting)', { permanent: false });
            layersGroupRef.current.addLayer(warningMarker);
          }
        });
      }
    });

    // 2. Draw Heatmap Hazard Points
    if (showHeatmap && heatmapPoints.length > 0) {
      heatmapPoints.forEach(pt => {
        const catLabel = pt.category.replace('_', ' ').toUpperCase();
        const circle = Leaflet.circle([pt.lat, pt.lng], {
          radius: 120 + (pt.intensity || 0.8) * 100,
          color: '#ef4444',
          fillColor: '#dc2626',
          fillOpacity: 0.35,
          weight: 1.5
        });
        circle.bindPopup(`<div style="font-size:12px;font-weight:bold;color:#1e293b;">📍 ${catLabel}<br/><span style="font-size:10px;color:#64748b;">Reported ${pt.ageDays} day(s) ago</span></div>`);
        layersGroupRef.current.addLayer(circle);
      });
    }

    // 3. User Live GPS position marker
    const targetPos = activeJourneyLocation || userLocation;
    if (targetPos) {
      const userIcon = Leaflet.divIcon({
        className: 'custom-pin-user',
        html: `<div style="background-color:${isDeviated ? '#ef4444' : '#2563eb'};width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px ${isDeviated ? '#ef4444' : '#2563eb'};"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      layersGroupRef.current.addLayer(Leaflet.marker([targetPos.lat, targetPos.lng], { icon: userIcon }));
    }

    // Auto fit bounds
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [candidates, selectedRouteId, heatmapPoints, showHeatmap, userLocation, activeJourneyLocation, isDeviated, onSelectRoute]);

  const selectedCandidate = candidates.find(c => c.id === selectedRouteId) || candidates[0];

  return (
    <div className={`relative w-full h-[450px] rounded-3xl overflow-hidden shadow-2xl border ${
      isElderlyMode ? 'border-amber-400' : 'border-slate-800'
    }`}>
      {/* Real Interactive Leaflet OpenStreetMap Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Control Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-2xl text-xs text-white shadow-xl gap-2 pointer-events-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 font-bold text-emerald-400">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>Safest Route</span>
          </span>
          <span className="flex items-center space-x-1 font-bold text-amber-400">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Shortcut</span>
          </span>
          <span className="flex items-center space-x-1 font-bold text-rose-400">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span>Unlit Spot</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-300 font-semibold">
          {selectedCandidate ? `🗺️ ${selectedCandidate.name}` : '📍 OpenStreetMap Interactive Safety Engine • Tap map to report safety issue'}
        </span>
      </div>
    </div>
  );
};
