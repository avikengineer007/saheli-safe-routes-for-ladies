import React, { useEffect, useRef, useState } from 'react';
import { RouteCandidate, HeatmapPoint } from '../types';
import { MapViewCanvas } from './MapViewCanvas';

declare const google: any;
declare global {
  interface Window {
    google: any;
  }
}

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

export const GoogleMapViewCanvas: React.FC<GoogleMapViewCanvasProps> = (props) => {
  const {
    candidates,
    selectedRouteId,
    onSelectRoute,
    heatmapPoints,
    showHeatmap,
    userLocation,
    activeJourneyLocation,
    isDeviated,
    onMapClick
  } = props;

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const directionsRenderersRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const activeUserMarkerRef = useRef<any>(null);

  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [routeStatus, setRouteStatus] = useState<string>('');

  // Check if window.google.maps is available and catch auth failure
  useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.warn('[SAHELI] Google Maps API key invalid or unbilled. Falling back to built-in MapViewCanvas.');
      setMapsLoaded(false);
    };

    const checkGoogleMaps = () => {
      if ((window as any).googleMapsFailed) {
        setMapsLoaded(false);
        return;
      }
      if (window.google && window.google.maps && window.google.maps.DirectionsService) {
        setMapsLoaded(true);
      }
    };

    checkGoogleMaps();
    const interval = setInterval(checkGoogleMaps, 300);
    return () => clearInterval(interval);
  }, []);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;

    if (!googleMapInstance.current) {
      const initialCenter = userLocation || activeJourneyLocation || { lat: 28.6315, lng: 77.2167 };
      googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: 14,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] }
        ]
      });

      // Map Click Event for incident reporting
      googleMapInstance.current.addListener('click', (e: any) => {
        if (e.latLng && onMapClick) {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });
    }
  }, [mapsLoaded, onMapClick]);

  // Render routes using DirectionsService + DirectionsRenderer (official Google road-snapped routing)
  useEffect(() => {
    if (!googleMapInstance.current || !mapsLoaded) return;

    // Clear previous direction polylines
    directionsRenderersRef.current.forEach(r => r && r.setMap && r.setMap(null));
    directionsRenderersRef.current = [];

    // Clear markers
    markersRef.current.forEach(m => m && m.setMap && m.setMap(null));
    markersRef.current = [];

    if (candidates.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    const routeColors: Record<string, string> = {
      safest: '#10b981',   // Emerald green
      fastest: '#f59e0b',  // Amber
      balanced: '#3b82f6'  // Blue
    };

    candidates.forEach((candidate) => {
      const isSelected = candidate.id === selectedRouteId;
      const poly = candidate.geoJsonPolyline;

      if (!poly || poly.length < 2) return;

      const path = poly.map((pt: [number, number]) => ({ lat: pt[0], lng: pt[1] }));
      path.forEach(pt => bounds.extend(pt));

      const color = routeColors[candidate.tag] || (isSelected ? '#10b981' : '#3b82f6');

      const polyline = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: isSelected ? 1.0 : 0.4,
        strokeWeight: isSelected ? 7 : 4,
        zIndex: isSelected ? 10 : 2,
        map: googleMapInstance.current
      });

      polyline.addListener('click', () => {
        if (onSelectRoute) onSelectRoute(candidate.id);
      });

      directionsRenderersRef.current.push(polyline);

      // Add Start (Origin) and End (Destination) Markers for the selected route
      if (isSelected) {
        const startPt = path[0];
        const endPt = path[path.length - 1];

        const startMarker = new window.google.maps.Marker({
          position: startPt,
          map: googleMapInstance.current,
          title: 'Start Location',
          label: { text: 'A', color: '#ffffff', fontWeight: 'bold' },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        const endMarker = new window.google.maps.Marker({
          position: endPt,
          map: googleMapInstance.current,
          title: 'Destination',
          label: { text: 'B', color: '#ffffff', fontWeight: 'bold' },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        markersRef.current.push(startMarker, endMarker);
      }
    });

    const selectedRoute = candidates.find(c => c.id === selectedRouteId) || candidates[0];
    if (selectedRoute) {
      setRouteStatus(`✅ Active street route: ${selectedRoute.name} (${selectedRoute.durationMinutes} min walk)`);
    }

    if (!bounds.isEmpty()) {
      googleMapInstance.current.fitBounds(bounds, { top: 70, bottom: 70, left: 40, right: 40 });
    }

    // Safety heatmap markers
    if (showHeatmap && heatmapPoints.length > 0) {
      heatmapPoints.forEach((pt) => {
        const marker = new window.google.maps.Marker({
          position: { lat: pt.lat, lng: pt.lng },
          map: googleMapInstance.current,
          title: pt.category.replace('_', ' '),
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#dc2626',
            fillOpacity: 0.9,
            strokeColor: '#fee2e2',
            strokeWeight: 2
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="color:#000;font-size:12px;font-weight:bold;">📍 ${pt.category.replace('_', ' ')}<br/><span style="font-size:10px;color:#666;">Reported ${pt.ageDays} days ago</span></div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMapInstance.current, marker);
        });

        markersRef.current.push(marker);
      });
    }
  }, [candidates, selectedRouteId, heatmapPoints, showHeatmap, mapsLoaded, onSelectRoute]);

  // Update Live User GPS Position Marker
  useEffect(() => {
    if (!googleMapInstance.current || !mapsLoaded) return;

    const targetPos = activeJourneyLocation || userLocation;

    if (targetPos) {
      if (activeUserMarkerRef.current) {
        activeUserMarkerRef.current.setPosition(targetPos);
      } else {
        activeUserMarkerRef.current = new window.google.maps.Marker({
          position: targetPos,
          map: googleMapInstance.current,
          title: 'Your Live GPS Location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: isDeviated ? '#ef4444' : '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });
      }

      if (candidates.length === 0) {
        googleMapInstance.current.setCenter(targetPos);
      }
    }
  }, [userLocation, activeJourneyLocation, isDeviated, candidates.length, mapsLoaded]);

  if (!mapsLoaded) {
    return <MapViewCanvas {...props} />;
  }

  return (
    <div className="relative w-full h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 font-bold z-10">
        {routeStatus || '📍 Google Maps Active • Tap map to report safety issue'}
      </div>
    </div>
  );
};
