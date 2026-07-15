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

  // Check if window.google.maps is available
  useEffect(() => {
    const checkGoogleMaps = () => {
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

    // Clear previous direction renderers
    directionsRenderersRef.current.forEach(r => r.setMap(null));
    directionsRenderersRef.current = [];

    // Clear markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    if (candidates.length === 0) return;

    const ds = new window.google.maps.DirectionsService();
    const bounds = new window.google.maps.LatLngBounds();

    // For each candidate route, derive origin+dest from polyline endpoints and call DirectionsService
    const routeColors: Record<string, string> = {
      safest: '#10b981',   // Emerald green
      fastest: '#f59e0b',  // Amber
      balanced: '#3b82f6'  // Blue
    };

    let completedCount = 0;
    const total = candidates.length;

    candidates.forEach((candidate, idx) => {
      const isSelected = candidate.id === selectedRouteId;
      const poly = candidate.geoJsonPolyline;

      if (poly.length < 2) {
        completedCount++;
        return;
      }

      // Use first and last points of polyline as origin/destination
      const originPt = poly[0];
      const destPt = poly[poly.length - 1];

      const originLatLng = new window.google.maps.LatLng(originPt[0], originPt[1]);
      const destLatLng = new window.google.maps.LatLng(destPt[0], destPt[1]);

      // Try DirectionsService with the actual lat/lng coords — this will snap to real roads
      ds.route(
        {
          origin: originLatLng,
          destination: destLatLng,
          travelMode: window.google.maps.TravelMode.WALKING,
        },
        (result: any, status: any) => {
          completedCount++;

          if (status === 'OK' && result) {
            const color = routeColors[candidate.tag] || '#3b82f6';

            const renderer = new window.google.maps.DirectionsRenderer({
              map: googleMapInstance.current,
              directions: result,
              routeIndex: 0,
              suppressMarkers: !isSelected, // Only show A/B markers on selected route
              polylineOptions: {
                strokeColor: color,
                strokeOpacity: isSelected ? 1.0 : 0.4,
                strokeWeight: isSelected ? 7 : 4,
                geodesic: true
              }
            });

            renderer.addListener('click', () => {
              if (onSelectRoute) onSelectRoute(candidate.id);
            });

            directionsRenderersRef.current.push(renderer);

            // Extend bounds with this route's legs
            if (result.routes && result.routes[0] && result.routes[0].bounds) {
              bounds.union(result.routes[0].bounds);
            }

            if (isSelected) {
              setRouteStatus(`✅ Google Maps walking route loaded`);
            }
          } else {
            // Fallback: draw existing polyline from OSRM if Google Directions fails
            if (poly.length >= 2) {
              const path = poly.map((pt: [number, number]) => ({ lat: pt[0], lng: pt[1] }));
              const color = routeColors[candidate.tag] || '#3b82f6';
              const pl = new window.google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: isSelected ? 0.9 : 0.35,
                strokeWeight: isSelected ? 6 : 3,
                map: googleMapInstance.current
              });
              directionsRenderersRef.current.push(pl as any);
              path.forEach((pt: { lat: number; lng: number }) => bounds.extend(pt));
            }
            if (isSelected) {
              setRouteStatus(`🗺️ OpenStreetMap walking route loaded`);
            }
          }

          // Fit map once all routes are done
          if (completedCount === total && !bounds.isEmpty()) {
            googleMapInstance.current.fitBounds(bounds, { top: 80, bottom: 80, left: 40, right: 40 });
          }
        }
      );
    });

    // Safety heatmap markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

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
