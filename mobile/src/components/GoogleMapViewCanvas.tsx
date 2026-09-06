import React from 'react';
import { RouteCandidate, HeatmapPoint } from '../types';
import { MapViewCanvas } from './MapViewCanvas';

interface GoogleMapViewCanvasProps {
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

/**
 * GoogleMapViewCanvas delegates to MapViewCanvas (OpenStreetMap Leaflet Engine)
 * to guarantee 100% watermark-free, dark-mode map tiles.
 * (Prevents 'For development purposes only' Google watermark and 'API KEY REQUIRED' Carto watermark).
 */
export const GoogleMapViewCanvas: React.FC<GoogleMapViewCanvasProps> = (props) => {
  return <MapViewCanvas {...props} />;
};
