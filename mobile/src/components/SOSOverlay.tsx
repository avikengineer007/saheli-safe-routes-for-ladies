import React, { useState } from 'react';
import { ShieldAlert, PhoneCall, Volume2, VolumeX, X, Send, AlertOctagon, MessageCircle } from 'lucide-react';
import { useElderlyMode } from '../context/ElderlyModeContext';

interface SOSOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  emergencyNumber: string;
  contactPhone?: string;
  currentLocation: { lat: number; lng: number };
}

export const SOSOverlay: React.FC<SOSOverlayProps> = ({
  isOpen,
  onClose,
  emergencyNumber = '1091',
  contactPhone,
  currentLocation
}) => {
  const { caregiverPhone } = useElderlyMode();
  // Resolve the phone to display: prop takes priority, then context, then localStorage fallback
  const resolvedPhone = React.useMemo(() => {
    if (contactPhone) return `+91 ${contactPhone}`;
    if (caregiverPhone) return `+91 ${caregiverPhone}`;
    try {
      const saved = localStorage.getItem('saheli_family_contacts');
      if (saved) {
        const contacts: Array<{ phone: string; isPrimary: boolean }> = JSON.parse(saved);
        const primary = contacts.find(c => c.isPrimary) || contacts[0];
        if (primary) return `+91 ${primary.phone}`;
      }
    } catch (_) {}
    return 'No contact saved — add one in Family Contacts';
  }, [contactPhone, caregiverPhone]);

  const rawDigits = (contactPhone || caregiverPhone || '').replace(/[^0-9]/g, '');
  const cleanPhone10 = rawDigits.slice(-10);

  const whatsappMessage = encodeURIComponent(
    `🚨 [SAHELI EMERGENCY SOS ALERT]\n\nUrgent assistance requested! I am in emergency at Kolkata.\n\n📍 Live Google Maps Coordinates: https://maps.google.com/?q=${currentLocation.lat.toFixed(5)},${currentLocation.lng.toFixed(5)}\n\nPlease reach out or dispatch help immediately!`
  );

  const whatsappUrl = cleanPhone10
    ? `https://wa.me/91${cleanPhone10}?text=${whatsappMessage}`
    : `https://wa.me/?text=${whatsappMessage}`;

  const smsUrl = cleanPhone10
    ? `sms:${cleanPhone10}?body=${whatsappMessage}`
    : `sms:?body=${whatsappMessage}`;

  const [sirenPlaying, setSirenPlaying] = useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const oscRef = React.useRef<OscillatorNode | null>(null);

  React.useEffect(() => {
    return () => {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch (e) {}
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleCallEmergency = (num: string) => {
    window.open(`tel:${num}`, '_self');
  };

  const toggleSiren = () => {
    if (sirenPlaying) {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch (e) {}
        oscRef.current = null;
      }
      setSirenPlaying(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, ctx.currentTime);
        
        // Siren sweep effect
        let now = ctx.currentTime;
        for (let i = 0; i < 30; i++) {
          osc.frequency.linearRampToValueAtTime(1200, now + i * 0.8 + 0.4);
          osc.frequency.linearRampToValueAtTime(600, now + i * 0.8 + 0.8);
        }

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        oscRef.current = osc;
        setSirenPlaying(true);
      } catch (err) {
        console.warn('Web Audio API siren error:', err);
        setSirenPlaying(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-6 rounded-3xl bg-white border-2 border-red-500 shadow-2xl relative space-y-5 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-rose-50 text-slate-500 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>

        {/* SOS Banner Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/40 animate-bounce">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase text-red-600 tracking-tight">
              EMERGENCY SOS TRIGGERED
            </h2>
            <p className="text-xs font-semibold text-rose-700">Live Kolkata GPS Location Ready to Alert Family</p>
          </div>
        </div>

        {/* Dispatch Details */}
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-700 font-semibold">
            <span>Current Geo-Coordinates:</span>
            <strong className="font-mono text-slate-900">{currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}</strong>
          </div>

          <div className="flex items-center justify-between text-slate-700 font-semibold">
            <span>Primary Contact Target:</span>
            <strong className="text-slate-900 font-bold">{resolvedPhone}</strong>
          </div>

          {/* 1-Click WhatsApp & Device SMS Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-transform transform active:scale-95 text-center"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Send via WhatsApp</span>
            </a>

            <a
              href={smsUrl}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-transform transform active:scale-95 text-center"
            >
              <Send className="w-4 h-4" />
              <span>Open Phone SMS</span>
            </a>
          </div>
        </div>

        {/* Emergency Call Action Switch */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-rose-100">
            <AlertOctagon className="w-4 h-4 text-amber-300" />
            <span>Kolkata Emergency Service Quick Dial</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleCallEmergency('1091')}
              className="py-3.5 px-4 rounded-xl bg-white hover:bg-rose-50 text-red-600 font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-lg transition-transform transform active:scale-95"
            >
              <PhoneCall className="w-4 h-4 text-red-600" />
              <span>Women Helpline (1091)</span>
            </button>

            <button
              onClick={() => handleCallEmergency('112')}
              className="py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-lg transition-transform transform active:scale-95"
            >
              <PhoneCall className="w-4 h-4 text-red-500" />
              <span>Police Emergency (112)</span>
            </button>
          </div>
          
          <p className="text-[11px] text-rose-100 text-center font-medium italic">
            * Tap required on phone to complete call to prevent false dial escalation.
          </p>
        </div>

        {/* Audio Siren Alert */}
        <button
          onClick={toggleSiren}
          className={`w-full py-3 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
            sirenPlaying
              ? 'bg-red-600 text-white border-red-600 animate-pulse shadow-lg'
              : 'bg-rose-50 border-rose-200 text-slate-700 hover:bg-rose-100'
          }`}
        >
          {sirenPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-red-600" />}
          <span>{sirenPlaying ? 'Stop Alarm Siren' : 'Sound Loud Alarm Siren'}</span>
        </button>
      </div>
    </div>
  );
};
