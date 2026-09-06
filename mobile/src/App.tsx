import React, { useState, useEffect, useCallback } from 'react';
import { ElderlyModeProvider, useElderlyMode } from './context/ElderlyModeContext';
import { Header } from './components/Header';
import { GoogleMapViewCanvas } from './components/GoogleMapViewCanvas';
import { RoutePlannerView } from './components/RoutePlannerView';
import { LiveJourneyView } from './components/LiveJourneyView';
import { SOSOverlay } from './components/SOSOverlay';
import { IncidentReportModal } from './components/IncidentReportModal';
import { HeatmapOverlayView } from './components/HeatmapOverlayView';
import { LandingPageView } from './components/LandingPageView';
import { ElderlyModeView } from './components/ElderlyModeView';
import { FamilyContactsModal } from './components/FamilyContactsModal';
import { BottomNavBar } from './components/BottomNavBar';
import { WalkFeedbackModal } from './components/WalkFeedbackModal';
import { ApiClient } from './services/apiClient';
import { getSmartLocalDestination } from './services/locationUtils';
import { RouteCandidate, ActiveJourney, HeatmapPoint, AppTab } from './types';
import { AlertCircle, PlusCircle } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isElderlyMode } = useElderlyMode();

  const [activeTab, setActiveTab] = useState<AppTab>('plan');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);

  // Family Contacts state
  const [familyModalOpen, setFamilyModalOpen] = useState(false);

  // Router candidate states
  const [candidates, setCandidates] = useState<RouteCandidate[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route_india_main');
  const [disclaimerNotice, setDisclaimerNotice] = useState<string>('');

  // Live journey state
  const [activeJourney, setActiveJourney] = useState<ActiveJourney | null>(null);

  // Heatmap points
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);

  // User real live GPS location (Defaults to Barrackpore Station Hub Platform 1)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 22.76034,
    lng: 88.37110
  });
  const [gpsAcquired, setGpsAcquired] = useState(false);

  // Overlay state
  const [sosOpen, setSosOpen] = useState(false);
  const [sosContactPhone, setSosContactPhone] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportPinLocation, setReportPinLocation] = useState<{ lat: number; lng: number }>({
    lat: 22.76034,
    lng: 88.37110
  });
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [lastCompletedJourney, setLastCompletedJourney] = useState<{ id: string; name: string } | null>(null);

  // Offline SOS Queue automatic flusher
  useEffect(() => {
    ApiClient.flushOfflineQueue();
    const handleOnline = () => {
      console.log('[SAHELI] Connectivity restored — flushing offline SOS queue');
      ApiClient.flushOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    const interval = setInterval(() => {
      ApiClient.flushOfflineQueue();
    }, 20000);
    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  // Fetch real-time live browser/device GPS location immediately with multi-provider IP fallback
  useEffect(() => {
    let active = true;

    const fetchIpFallbackLocation = async () => {
      // 1. Try ipwho.is (Primary Fast & Unblocked IP Tracer)
      try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
          const data = await res.json();
          if (data && data.latitude && data.longitude && active) {
            const ipLoc = { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
            const placeLabel = data.city ? `${data.city}, ${data.region || 'India'}` : 'My Current Location';
            console.log('[SAHELI IP TRACE] Live location acquired via IP:', placeLabel, ipLoc);
            setUserLocation(ipLoc);
            setReportPinLocation(ipLoc);
            setGpsAcquired(true);
            const smartDest = getSmartLocalDestination(ipLoc, placeLabel);
            handleCalculateRoutes(placeLabel, smartDest.name, 25, ipLoc, smartDest.coords);
            return;
          }
        }
      } catch (_) {}

      // 2. Try ip-api.com as secondary backup (HTTPS to avoid mixed content on Vercel)
      try {
        const res = await fetch('https://ip-api.com/json/');
        if (res.ok) {
          const data = await res.json();
          if (data && data.lat && data.lon && active) {
            const ipLoc = { lat: parseFloat(data.lat), lng: parseFloat(data.lon) };
            const placeLabel = data.city ? `${data.city}, ${data.regionName || 'India'}` : 'My Current Location';
            console.log('[SAHELI IP TRACE] Live location acquired via Backup IP API:', placeLabel, ipLoc);
            setUserLocation(ipLoc);
            setReportPinLocation(ipLoc);
            setGpsAcquired(true);
            const smartDest = getSmartLocalDestination(ipLoc, placeLabel);
            handleCalculateRoutes(placeLabel, smartDest.name, 25, ipLoc, smartDest.coords);
            return;
          }
        }
      } catch (_) {}

      // 3. Try ipapi.co as tertiary backup
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data && data.latitude && data.longitude && active) {
            const ipLoc = { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
            const placeLabel = data.city ? `${data.city}, ${data.region || 'India'}` : 'My Current Location';
            setUserLocation(ipLoc);
            setReportPinLocation(ipLoc);
            setGpsAcquired(true);
            const smartDest = getSmartLocalDestination(ipLoc, placeLabel);
            handleCalculateRoutes(placeLabel, smartDest.name, 25, ipLoc, smartDest.coords);
            return;
          }
        }
      } catch (_) {}
    };

    const handleSuccess = (position: GeolocationPosition) => {
      if (!active) return;
      const newLoc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      setUserLocation(newLoc);
      setReportPinLocation(newLoc);
      setGpsAcquired(true);
      const smartDest = getSmartLocalDestination(newLoc, 'My Current Location');
      handleCalculateRoutes('My Current Location', smartDest.name, 25, newLoc, smartDest.coords);
    };

    if ('geolocation' in navigator) {
      // First try with High Accuracy (GPS hardware chip / mobile device)
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (error) => {
          console.warn('[SAHELI GPS] High accuracy failed, retrying low accuracy:', error.message);
          // Retry with Low Accuracy
          navigator.geolocation.getCurrentPosition(
            handleSuccess,
            (err2) => {
              console.warn('[SAHELI GPS] Low accuracy failed, using IP geolocation fallback:', err2.message);
              fetchIpFallbackLocation();
            },
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!active) return;
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLoc);
          setGpsAcquired(true);
          setReportPinLocation(newLoc);
        },
        (error) => {
          console.warn('[SAHELI GPS] watchPosition error:', error.message);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5000 }
      );

      return () => {
        active = false;
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      fetchIpFallbackLocation();
    }
  }, []);

  // Initial heatmap load on mount
  useEffect(() => {
    loadHeatmapData();
    if (!gpsAcquired) {
      const smartDest = getSmartLocalDestination(userLocation);
      handleCalculateRoutes('My Current Location', smartDest.name, 25, userLocation, smartDest.coords);
    }
  }, []);

  const loadHeatmapData = async () => {
    const pts = await ApiClient.fetchHeatmap();
    setHeatmapPoints(pts);
  };

  const handleCalculateRoutes = useCallback(async (
    originName: string,
    destName: string,
    budget: number,
    originCoords?: { lat: number; lng: number },
    destCoords?: { lat: number; lng: number }
  ) => {
    const origin = originCoords ? { ...originCoords, name: originName } : originName;
    const destination = destCoords ? { ...destCoords, name: destName } : destName;
    setIsCalculatingRoutes(true);
    try {
      const res = await ApiClient.fetchSafeRoutes(origin, destination, budget);
      setCandidates(res.routes);
      setDisclaimerNotice(res.summaryNotice);
      if (res.routes.length > 0) {
        const rec = res.routes.find(r => r.isRecommended) || res.routes[0];
        setSelectedRouteId(rec.id);
      }
    } finally {
      setIsCalculatingRoutes(false);
    }
  }, []);

  const handleStartJourney = useCallback(async (route: RouteCandidate) => {
    const startRes = await ApiClient.startJourney('user_india_1', route);
    const newJourney: ActiveJourney = {
      id: startRes.journeyId,
      routeId: route.id,
      routeName: route.name,
      polyline: route.geoJsonPolyline,
      currentLocation: { lat: route.geoJsonPolyline[0][0], lng: route.geoJsonPolyline[0][1] },
      startedAt: new Date(),
      etaMinutes: route.durationMinutes,
      status: 'active',
      onRoute: true,
      consecutiveOffRoutePings: 0,
      contactAlertLogs: []
    };
    setActiveJourney(newJourney);
    setActiveTab('live');
  }, []);

  const handleSendPing = useCallback(async (lat: number, lng: number) => {
    if (!activeJourney) return;
    const pingRes = await ApiClient.sendPing(activeJourney.id, lat, lng);
    setActiveJourney(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentLocation: { lat, lng },
        onRoute: pingRes.onRoute,
        consecutiveOffRoutePings: pingRes.onRoute ? 0 : prev.consecutiveOffRoutePings + 1
      };
    });
  }, [activeJourney]);

  const handleTriggerSOS = async () => {
    const loc = activeJourney
      ? activeJourney.currentLocation
      : userLocation;

    // Resolve the primary family contact from localStorage
    let primaryPhone = '';
    try {
      const saved = localStorage.getItem('saheli_family_contacts');
      if (saved) {
        const contacts: Array<{ phone: string; isPrimary: boolean; autoSmsAlert: boolean }> = JSON.parse(saved);
        const primary = contacts.find(c => c.isPrimary && c.autoSmsAlert) || contacts[0];
        if (primary) primaryPhone = primary.phone;
      }
    } catch (_) {}

    setSosContactPhone(primaryPhone);

    // Auto-launch WhatsApp immediately on user click gesture (synchronously to bypass popup block)
    const rawDigits = primaryPhone.replace(/[^0-9]/g, '');
    const cleanPhone10 = rawDigits.slice(-10);
    const whatsappMsg = encodeURIComponent(
      `🚨 [SAHELI PAN-INDIA EMERGENCY SOS ALERT]\n\nUrgent assistance requested! I am in emergency.\n\n📍 Live Google Maps Coordinates: https://maps.google.com/?q=${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}\n\nPlease reach out or dispatch help immediately!`
    );
    const waUrl = cleanPhone10
      ? `https://wa.me/91${cleanPhone10}?text=${whatsappMsg}`
      : `https://wa.me/?text=${whatsappMsg}`;

    try {
      window.open(waUrl, '_blank');
    } catch (e) {
      console.warn('Auto launch WhatsApp error:', e);
    }

    const journeyId = activeJourney ? activeJourney.id : `jny_adhoc_${Date.now()}`;
    ApiClient.triggerSOS(journeyId, loc, primaryPhone || undefined);
    if (activeJourney) {
      setActiveJourney(prev => prev ? { ...prev, status: 'sos_triggered' } : null);
    }

    setSosOpen(true);
  };

  const handleCompleteJourney = useCallback(() => {
    if (activeJourney) {
      setLastCompletedJourney({ id: activeJourney.id, name: activeJourney.routeName });
      setFeedbackModalOpen(true);
    }
    setActiveJourney(null);
    setActiveTab('plan');
  }, [activeJourney]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setReportPinLocation({ lat, lng });
    setReportModalOpen(true);
  }, []);

  const handleSubmitReport = useCallback(async (data: { category: any; description: string; lat: number; lng: number }) => {
    const result = await ApiClient.submitIncidentReport(data);
    loadHeatmapData();
    return result;
  }, []);

  return (
    <div className="min-h-screen bg-rose-50/50 text-slate-900 font-sans">
      <Header
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-24 space-y-6">
        {/* Main Content Sections */}
        {isElderlyMode ? (
          <ElderlyModeView
            onStartSimpleJourney={() => {
              if (candidates.length > 0) {
                handleStartJourney(candidates[0]);
              }
            }}
            onTriggerSOS={handleTriggerSOS}
          />
        ) : (
          <>
            {(activeTab === 'home' || activeTab === 'plan' || activeTab === 'live' || activeTab === 'heatmap') && (
              <>
                {/* Real Google Maps Container for Route Planning & Live Tracking */}
                <GoogleMapViewCanvas
                  candidates={candidates}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={setSelectedRouteId}
                  heatmapPoints={heatmapPoints}
                  showHeatmap={showHeatmap}
                  userLocation={userLocation}
                  activeJourneyLocation={activeJourney ? activeJourney.currentLocation : undefined}
                  isDeviated={activeJourney ? activeJourney.consecutiveOffRoutePings >= 2 : false}
                  isElderlyMode={isElderlyMode}
                  onMapClick={handleMapClick}
                />

                {/* Quick Incident Report Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-rose-200 shadow-sm text-xs gap-3">
                  <div className="flex items-center space-x-2 text-slate-600 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Spotted dark streetlamps or an unsafe corner in India? Click any map spot to add a report.</span>
                  </div>
                  <button
                    onClick={() => setReportModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold flex items-center space-x-1.5 shadow-md transition-colors shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Safety Incident</span>
                  </button>
                </div>
              </>
            )}

            {(activeTab === 'home' || activeTab === 'plan') && (
              <RoutePlannerView
                candidates={candidates}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
                onCalculateRoutes={handleCalculateRoutes}
                onStartJourney={handleStartJourney}
                isElderlyMode={false}
                disclaimerNotice={disclaimerNotice}
                userLocation={userLocation}
                isLoading={isCalculatingRoutes}
              />
            )}

            {(activeTab === 'home' || activeTab === 'contacts') && (
              <LandingPageView
                onNavigateToPlan={() => setActiveTab('plan')}
                onNavigateToLive={() => setActiveTab('live')}
                onNavigateToHeatmap={() => setActiveTab('heatmap')}
                onTriggerSOS={handleTriggerSOS}
                onOpenFamilyContacts={() => setFamilyModalOpen(true)}
              />
            )}

            {activeTab === 'live' && (
              activeJourney ? (
                <LiveJourneyView
                  journey={activeJourney}
                  onSendPing={handleSendPing}
                  onTriggerSOS={handleTriggerSOS}
                  onCompleteJourney={handleCompleteJourney}
                  onOpenFamilyContacts={() => setFamilyModalOpen(true)}
                />
              ) : (
                <div className="p-8 rounded-3xl bg-white border border-rose-200 shadow-xl text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-600">No active safe walk in progress.</p>
                  <button
                    onClick={() => setActiveTab('plan')}
                    className="px-6 py-3 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-md"
                  >
                    Find & Start Pan-India Safe Walk
                  </button>
                </div>
              )
            )}

            {activeTab === 'heatmap' && (
              <HeatmapOverlayView points={heatmapPoints} isElderlyMode={false} />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <SOSOverlay
        isOpen={sosOpen}
        onClose={() => setSosOpen(false)}
        emergencyNumber="1091"
        contactPhone={sosContactPhone}
        currentLocation={activeJourney ? activeJourney.currentLocation : userLocation}
      />

      <IncidentReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        pinLocation={reportPinLocation}
        onSubmitReport={handleSubmitReport}
      />

      <FamilyContactsModal
        isOpen={familyModalOpen}
        onClose={() => setFamilyModalOpen(false)}
      />

      <WalkFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        journeyId={lastCompletedJourney?.id || 'jny_completed'}
        routeName={lastCompletedJourney?.name || 'Kolkata Safe Walk'}
      />

      {/* Native Mobile App Dock Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerSOS={handleTriggerSOS}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ElderlyModeProvider>
      <MainAppContent />
    </ElderlyModeProvider>
  );
};

export default App;
