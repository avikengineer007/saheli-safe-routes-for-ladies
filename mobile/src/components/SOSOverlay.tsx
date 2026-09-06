import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, PhoneCall, Volume2, VolumeX, X, Send, AlertOctagon, MessageCircle, Timer } from 'lucide-react';
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

  // Countdown guard: 3 second cancel window before SOS fully dispatches
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Start 3-second countdown when overlay opens
  useEffect(() => {
    if (!isOpen) {
      setCountdown(null);
      setConfirmed(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    // Reset and start
    setCountdown(3);
    setConfirmed(false);
  }, [isOpen]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setConfirmed(true);
      setCountdown(null);
      return;
    }
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [countdown]);

  const handleCancel = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
    setConfirmed(false);
    onClose();
  };

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
    `🚨 [SAHELI PAN-INDIA EMERGENCY SOS ALERT]\n\nUrgent assistance requested! I am in emergency.\n\n📍 Live Google Maps Coordinates: https://maps.google.com/?q=${currentLocation.lat.toFixed(5)},${currentLocation.lng.toFixed(5)}\n\nPlease reach out or dispatch help immediately!`
  );
  const whatsappUrl = cleanPhone10
    ? `https://wa.me/91${cleanPhone10}?text=${whatsappMessage}`
    : `https://wa.me/?text=${whatsappMessage}`;
  const smsUrl = cleanPhone10
    ? `sms:${cleanPhone10}?body=${whatsappMessage}`
    : `sms:?body=${whatsappMessage}`;

  const [sirenPlaying, setSirenPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    return () => {
      if (oscRef.current) { try { oscRef.current.stop(); } catch (e) {} }
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch (e) {} }
    };
  }, []);

  if (!isOpen) return null;

  const handleCallEmergency = (num: string) => {
    window.open(`tel:${num}`, '_self');
  };

  const toggleSiren = () => {
    if (sirenPlaying) {
      if (oscRef.current) { try { oscRef.current.stop(); } catch (e) {} oscRef.current = null; }
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

  // ── Countdown Screen ──────────────────────────────────────────
  if (countdown !== null && !confirmed) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-8 rounded-3xl bg-white border-4 border-red-500 shadow-2xl text-center space-y-6 animate-scale-in">
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="animate-ring-pulse w-36 h-36 rounded-full border-4 border-red-500 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-600 to-rose-600 flex flex-col items-center justify-center text-white shadow-2xl">
                <Timer className="w-8 h-8 mb-1 text-amber-300" />
                <span className="text-5xl font-black leading-none">{countdown}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-red-600 tracking-tight">SOS Sending in {countdown}s…</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Alerting emergency contacts with your live location. Tap cancel if this was accidental.
            </p>
          </div>

          <button
            onClick={handleCancel}
            aria-label="Cancel SOS emergency alert"
            className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg"
          >
            <X className="w-5 h-5" />
            <span>Cancel — This Was Accidental</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Full SOS Screen (confirmed) ───────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-6 rounded-3xl bg-white border-2 border-red-500 shadow-2xl relative space-y-5 text-slate-900 animate-scale-in">
        <button
          onClick={onClose}
          aria-label="Close SOS overlay"
          className="absolute top-4 right-4 p-2 rounded-full bg-rose-50 text-slate-500 hover:text-slate-900 transition-colors"
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
            <p className="text-xs font-semibold text-rose-700">Live India GPS Location Ready to Alert Emergency Contacts</p>
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
              aria-label="Send SOS via WhatsApp"
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-transform transform active:scale-95 text-center"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Send via WhatsApp</span>
            </a>

            <a
              href={smsUrl}
              aria-label="Send SOS via SMS"
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
            <span>Pan-India Emergency Helplines</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleCallEmergency('112')}
              aria-label="Call 112 National Emergency"
              className="py-3 px-2 rounded-xl bg-white hover:bg-rose-50 text-red-600 font-black uppercase tracking-wider text-xs flex flex-col items-center justify-center shadow-lg transition-transform transform active:scale-95 text-center"
            >
              <PhoneCall className="w-4 h-4 text-red-600 mb-1" />
              <span className="text-[11px]">112 National</span>
            </button>

            <button
              onClick={() => handleCallEmergency('1091')}
              aria-label="Call 1091 Women Helpline"
              className="py-3 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs flex flex-col items-center justify-center shadow-lg transition-transform transform active:scale-95 text-center"
            >
              <PhoneCall className="w-4 h-4 text-red-400 mb-1" />
              <span className="text-[11px]">1091 Women</span>
            </button>

            <button
              onClick={() => handleCallEmergency('181')}
              aria-label="Call 181 Distress Helpline"
              className="py-3 px-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black uppercase tracking-wider text-xs flex flex-col items-center justify-center shadow-lg transition-transform transform active:scale-95 text-center"
            >
              <PhoneCall className="w-4 h-4 text-slate-950 mb-1" />
              <span className="text-[11px]">181 Distress</span>
            </button>
          </div>

          <p className="text-[11px] text-rose-100 text-center font-medium italic">
            * Tap required on phone to complete call to prevent false dial escalation.
          </p>
        </div>

        {/* Audio Siren Alert */}
        <button
          onClick={toggleSiren}
          aria-label={sirenPlaying ? 'Stop alarm siren' : 'Sound alarm siren'}
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
