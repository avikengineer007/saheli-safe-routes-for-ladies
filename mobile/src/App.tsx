import React, { useState, useEffect } from 'react';
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
import { ApiClient } from './services/apiClient';
import { RouteCandidate, ActiveJourney, HeatmapPoint } from './types';
import { AlertCircle, PlusCircle } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isElderlyMode } = useElderlyMode();

  const [activeTab, setActiveTab] = useState<'home' | 'plan' | 'live' | 'heatmap' | 'contacts'>('home');
  const [showHeatmap, setShowHeatmap] = useState(true);

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

  // User real live GPS location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 28.6315,
    lng: 77.2167
  });

  // Overlay state
  const [sosOpen, setSosOpen] = useState(false);
  const [sosContactPhone, setSosContactPhone] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportPinLocation, setReportPinLocation] = useState<{ lat: number; lng: number }>({
    lat: 28.6315,
    lng: 77.2167
  });

  // Fetch real-time live browser GPS location
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLoc);
          setReportPinLocation(prev => (prev.lat === 22.5530 || prev.lat === 22.5552 || prev.lat === 28.6315) ? newLoc : prev);
        },
        (error) => {
          console.warn('[SAHELI GPS] Browser location access fallback to default:', error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Initial heatmap data load on mount
  useEffect(() => {
    loadHeatmapData();
  }, []);

  const loadHeatmapData = async () => {
    const pts = await ApiClient.fetchHeatmap();
    setHeatmapPoints(pts);
  };

  const handleCalculateRoutes = async (originName: string, destName: string, budget: number) => {
    const res = await ApiClient.fetchSafeRoutes(
      originName,
      destName,
      budget
    );
    setCandidates(res.routes);
    setDisclaimerNotice(res.summaryNotice);
    if (res.routes.length > 0) {
      const rec = res.routes.find(r => r.isRecommended) || res.routes[0];
      setSelectedRouteId(rec.id);
    }
  };

  const handleStartJourney = async (route: RouteCandidate) => {
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
  };

  const handleSendPing = async (lat: number, lng: number) => {
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
  };

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

    if (activeJourney) {
      ApiClient.triggerSOS(activeJourney.id, loc, primaryPhone || undefined);
      setActiveJourney(prev => prev ? { ...prev, status: 'sos_triggered' } : null);
    }

    setSosOpen(true);
  };

  const handleCompleteJourney = () => {
    setActiveJourney(null);
    setActiveTab('plan');
  };

  const handleMapClick = (lat: number, lng: number) => {
    setReportPinLocation({ lat, lng });
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (data: { category: any; description: string; lat: number; lng: number }) => {
    const result = await ApiClient.submitIncidentReport(data);
    loadHeatmapData();
    return result;
  };

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
            {(activeTab === 'home' || activeTab === 'contacts') && (
              <LandingPageView
                onNavigateToPlan={() => setActiveTab('plan')}
                onNavigateToLive={() => setActiveTab('live')}
                onNavigateToHeatmap={() => setActiveTab('heatmap')}
                onTriggerSOS={handleTriggerSOS}
                onOpenFamilyContacts={() => setFamilyModalOpen(true)}
              />
            )}

            {(activeTab === 'plan' || activeTab === 'live' || activeTab === 'heatmap') && (
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

            {activeTab === 'plan' && (
              <RoutePlannerView
                candidates={candidates}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
                onCalculateRoutes={handleCalculateRoutes}
                onStartJourney={handleStartJourney}
                isElderlyMode={false}
                disclaimerNotice={disclaimerNotice}
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
