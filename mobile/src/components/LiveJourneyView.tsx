import React, { useState, useEffect } from 'react';
import { ActiveJourney } from '../types';
import { ShieldAlert, Navigation, Clock, Share2, CheckCircle2, AlertTriangle, Radio, PhoneCall } from 'lucide-react';
import { useElderlyMode } from '../context/ElderlyModeContext';

interface LiveJourneyViewProps {
  journey: ActiveJourney;
  onSendPing: (lat: number, lng: number) => void;
  onTriggerSOS: () => void;
  onCompleteJourney: () => void;
}

interface LiveJourneyViewProps {
  journey: ActiveJourney;
  onSendPing: (lat: number, lng: number) => void;
  onTriggerSOS: () => void;
  onCompleteJourney: () => void;
  onOpenFamilyContacts?: () => void;
}

export const LiveJourneyView: React.FC<LiveJourneyViewProps> = ({
  journey,
  onSendPing,
  onTriggerSOS,
  onCompleteJourney,
  onOpenFamilyContacts
}) => {
  const { caregiverPhone } = useElderlyMode();
  const [copiedLink, setCopiedLink] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [simStep, setSimStep] = useState(0);

  // Web Speech API Voice Announcement
  const speakAlert = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Announce start of live walking route
  useEffect(() => {
    speakAlert(`Live safe walk started for ${journey.routeName}. Stay on well lit main streets.`);
  }, [journey.id]);

  // Real device GPS Location Tracking
  useEffect(() => {
    if (!('geolocation' in navigator) || journey.status !== 'active') return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onSendPing(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('[SAHELI GPS Error]: Fallback to simulation:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [journey.status]);

  // Fallback simulator loop
  useEffect(() => {
    if (journey.status !== 'active') return;

    const interval = setInterval(() => {
      const poly = journey.polyline;
      if (poly.length === 0) return;

      setSimStep(prev => {
        const nextIdx = (prev + 1) % poly.length;
        const targetPt = poly[nextIdx];
        onSendPing(targetPt[0], targetPt[1]);
        return nextIdx;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [journey.status, journey.polyline]);

  const handleCopyLink = () => {
    const trackingUrl = `https://saheli-safe.app/track/${journey.id}`;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const trackingUrl = `https://saheli-safe.app/track/${journey.id}`;
    const message = encodeURIComponent(`[SAHELI SAFE WALK TRACKING] Hi, I am walking on safe route "${journey.routeName}". Follow my live location here: ${trackingUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const simulateOffRouteDeviate = () => {
    const curr = journey.currentLocation;
    onSendPing(curr.lat + 0.003, curr.lng + 0.003);
    speakAlert('Warning! You have strayed off your planned safe street route. Family contact notified.');
  };

  return (
    <div className="space-y-4">
      {/* Live Status HUD */}
      <div className={`p-6 rounded-3xl border shadow-xl transition-all ${
        journey.status === 'sos_triggered'
          ? 'bg-red-50 border-red-500 animate-pulse'
          : !journey.onRoute
          ? 'bg-rose-50 border-rose-400'
          : 'bg-white border-rose-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              journey.status === 'sos_triggered'
                ? 'bg-red-600 text-white animate-bounce'
                : 'bg-rose-100 text-red-600 border border-rose-300'
            }`}>
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-slate-900 text-lg uppercase tracking-tight">
                  {journey.routeName}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  journey.status === 'sos_triggered'
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {journey.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold flex items-center space-x-2 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Estimated Time: ~{journey.etaMinutes} minutes</span>
                <span>•</span>
                <span>Live Pan-India GPS Active</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 border border-emerald-300 transition-colors"
            >
              <span>💬 WhatsApp Share</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center space-x-1.5 border border-rose-200 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-red-600" />
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={onCompleteJourney}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-md transition-colors"
            >
              Arrived Safely
            </button>
          </div>
        </div>

        {/* Off Route Warning */}
        {journey.consecutiveOffRoutePings >= 2 && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-2xl flex items-center justify-between text-red-900 text-xs font-medium">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>
                <strong>Route Warning:</strong> You walked &gt;150m off your planned safe street ({journey.consecutiveOffRoutePings} updates). Trusted contact notified.
              </span>
            </div>
            <button
              onClick={() => onSendPing(journey.polyline[0][0], journey.polyline[0][1])}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-extrabold text-xs shadow-sm"
            >
              Re-align Route
            </button>
          </div>
        )}
      </div>

      {/* Contact & Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Trusted Contact Box */}
        <div className="p-5 rounded-3xl bg-white border border-rose-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Kolkata Emergency Family Link</span>
            </h3>
            {onOpenFamilyContacts && (
              <button
                type="button"
                onClick={onOpenFamilyContacts}
                className="text-[11px] font-extrabold text-red-600 hover:text-red-700 underline"
              >
                + Manage Family Slots
              </button>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs">
            <div>
              <div className="font-extrabold text-slate-900">Primary Family Emergency Contact</div>
              <div className="text-[11px] text-slate-500 font-medium">
                {caregiverPhone || (localStorage.getItem('saheli_family_contacts') && JSON.parse(localStorage.getItem('saheli_family_contacts') || '[]').length > 0)
                  ? (JSON.parse(localStorage.getItem('saheli_family_contacts') || '[]')[0]?.name ? `${JSON.parse(localStorage.getItem('saheli_family_contacts') || '[]')[0].name} (+91 ${JSON.parse(localStorage.getItem('saheli_family_contacts') || '[]')[0].phone})` : caregiverPhone)
                  : 'No contact set yet'}
              </div>
            </div>
            {onOpenFamilyContacts ? (
              <button
                type="button"
                onClick={onOpenFamilyContacts}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-sm"
              >
                + Add Contact
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live SMS Sync
              </span>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs">
            <div>
              <div className="font-extrabold text-slate-900">Kolkata Women's Helpline</div>
              <div className="text-[11px] text-slate-500 font-medium">Kolkata Police (1091 / 112)</div>
            </div>
            <a
              href="tel:1091"
              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-sm flex items-center space-x-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Call 1091</span>
            </a>
          </div>
        </div>

        {/* GPS Stream Demo Control */}
        <div className="p-5 rounded-3xl bg-white border border-rose-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
            <Radio className="w-4 h-4 text-red-600 animate-pulse" />
            <span>GPS Tracking Stream</span>
          </h3>

          <p className="text-xs text-slate-600 font-medium">
            Current coordinate: <strong className="text-slate-900 font-mono">{journey.currentLocation.lat.toFixed(5)}, {journey.currentLocation.lng.toFixed(5)}</strong>
          </p>

          <button
            onClick={simulateOffRouteDeviate}
            className="w-full py-2.5 rounded-xl bg-rose-100 border border-rose-300 hover:bg-rose-200 text-red-800 text-xs font-bold transition-colors"
          >
            Simulate 180m Off-Route Deviation
          </button>
        </div>
      </div>

      {/* Red & Pink Single-Tap Emergency SOS Launcher */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-2xl text-center space-y-4">
        <div className="flex justify-center">
          <button
            onClick={onTriggerSOS}
            className="w-32 h-32 rounded-full bg-white hover:bg-rose-50 text-red-600 font-black uppercase text-2xl tracking-wider shadow-2xl shadow-red-900/40 flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 border-4 border-rose-200"
          >
            <ShieldAlert className="w-9 h-9 mb-1 text-red-600 animate-pulse" />
            <span>SOS</span>
          </button>
        </div>

        <div>
          <h4 className="font-extrabold text-white text-base">One-Tap Emergency SOS Trigger</h4>
          <p className="text-xs text-rose-100 font-medium max-w-md mx-auto mt-0.5">
            Dispatches live tracking link to family contacts and launches 1-tap dialer for Kolkata Police Women's Helpline (1091 / 112).
          </p>
        </div>
      </div>
    </div>
  );
};
