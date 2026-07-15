import React from 'react';
import { ShieldCheck, Navigation, PhoneCall, Radio, AlertTriangle, Eye, Sparkles, HeartHandshake, ShieldAlert, ArrowRight, CheckCircle2, UserCheck, Flame } from 'lucide-react';

interface LandingPageViewProps {
  onNavigateToPlan: () => void;
  onNavigateToLive: () => void;
  onNavigateToHeatmap: () => void;
  onTriggerSOS: () => void;
  onOpenFamilyContacts?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onNavigateToPlan,
  onNavigateToLive,
  onNavigateToHeatmap,
  onTriggerSOS,
  onOpenFamilyContacts
}) => {
  const EMERGENCY_CONTACTS = [
    {
      title: "Kolkata Police Women Helpline",
      number: "1091",
      altNumber: "033-2214-5000",
      description: "24x7 Dedicated Kolkata Police helpline for women & girls in distress.",
      badge: "24/7 Priority Toll-Free",
      color: "from-red-600 to-rose-600",
      isPrimary: true
    },
    {
      title: "National Emergency Response System",
      number: "112",
      altNumber: "Unified Emergency",
      description: "Single emergency response for Police, Fire, and Medical assistance.",
      badge: "National Emergency",
      color: "from-rose-600 to-red-700",
      isPrimary: true
    },
    {
      title: "Kolkata Police Control Room",
      number: "100",
      altNumber: "033-2214-3230",
      description: "Direct control desk for quick Kolkata Police team dispatch.",
      badge: "Kolkata Police Desk",
      color: "from-slate-800 to-slate-900",
      isPrimary: false
    },
    {
      title: "Senior Citizen Safety Helpline",
      number: "14567",
      altNumber: "1800-180-1253",
      description: "Elderly safety support, emergency medical transport & companion care.",
      badge: "Elderly Care",
      color: "from-amber-600 to-amber-700",
      isPrimary: false
    },
    {
      title: "Childline India (Young Sisters & Girls)",
      number: "1098",
      altNumber: "Free Helpline",
      description: "24/7 protection & assistance for children and teenage girls.",
      badge: "Youth & Children",
      color: "from-pink-600 to-rose-600",
      isPrimary: false
    },
    {
      title: "Emergency Medical & Ambulance",
      number: "102",
      altNumber: "108 Ambulance",
      description: "Immediate emergency medical response and hospital transport dispatch.",
      badge: "Medical Response",
      color: "from-emerald-600 to-teal-700",
      isPrimary: false
    },
    {
      title: "Cyber Crime Helpline",
      number: "1930",
      altNumber: "Online Harassment",
      description: "Reporting cyber stalking, online harassment, and digital blackmail.",
      badge: "Cyber Safety",
      color: "from-purple-600 to-indigo-700",
      isPrimary: false
    },
    {
      title: "State Disaster Management Cell",
      number: "1070",
      altNumber: "033-2214-3526",
      description: "Emergency support during extreme weather, flooding, and urban crisis.",
      badge: "Disaster Cell",
      color: "from-cyan-600 to-blue-700",
      isPrimary: false
    }
  ];

  return (
    <div className="space-y-10 py-2">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white p-6 md:p-10 border border-rose-900/40 shadow-2xl space-y-6">
        {/* Background glow effects */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AI Safety Navigation & Emergency Guard for Sisters & Elders</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Walk Safely Anywhere in Kolkata with <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-200">SAHELI</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-2xl">
            SAHELI computes real-time safe walking routes prioritised by street lighting, foot traffic, and open crime data. Features live off-route deviation detection, AI incident classification, and 1-tap emergency helplines.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={onNavigateToPlan}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-red-600/30 flex items-center justify-center space-x-2 transition-all transform hover:scale-102"
            >
              <Navigation className="w-5 h-5 text-white" />
              <span>Find Safe Route Now</span>
            </button>

            <button
              onClick={onTriggerSOS}
              className="px-6 py-4 rounded-2xl bg-red-700/80 hover:bg-red-600 border border-red-500/50 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition-all"
            >
              <ShieldAlert className="w-5 h-5 text-amber-300 animate-pulse" />
              <span>One-Tap SOS Alert</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 pt-6 border-t border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-2xl font-black text-rose-400">100%</div>
            <div className="text-xs font-bold text-slate-200">Streetlight Optimization</div>
            <div className="text-[11px] text-slate-400 font-medium">1.8x night penalty on unlit alleys</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-2xl font-black text-emerald-400">&lt;150m</div>
            <div className="text-xs font-bold text-slate-200">Deviation Shield</div>
            <div className="text-[11px] text-slate-400 font-medium">Alerts family on consecutive drift</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-2xl font-black text-amber-400">24/7</div>
            <div className="text-xs font-bold text-slate-200">Helpline Integration</div>
            <div className="text-[11px] text-slate-400 font-medium">1091 & 112 Kolkata Police Desk</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-2xl font-black text-purple-400">Claude AI</div>
            <div className="text-xs font-bold text-slate-200">Incident Triage</div>
            <div className="text-[11px] text-slate-400 font-medium">Natural language report severity</div>
          </div>
        </div>
      </section>

      {/* Emergency Safety Contacts Directory Section */}
      <section className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rose-100 pb-4 gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-500/20">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Verified Emergency Safety Contacts & Helplines
              </h2>
              <p className="text-xs text-slate-500 font-medium">Tap any number for instant 1-tap emergency dialing</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenFamilyContacts && (
              <button
                onClick={onOpenFamilyContacts}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-extrabold text-xs shadow-md shadow-red-500/20 flex items-center space-x-1.5 transition-all transform hover:scale-105"
              >
                <span>➕ Family Contacts Slot</span>
              </button>
            )}

            <span className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
              Kolkata & All-India Directory
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {EMERGENCY_CONTACTS.map((contact, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                contact.isPrimary
                  ? 'bg-gradient-to-br from-rose-50 to-red-50 border-red-300 shadow-md ring-1 ring-red-200'
                  : 'bg-white border-slate-200 hover:border-rose-200 shadow-sm'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    contact.isPrimary
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {contact.badge}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{contact.altNumber}</span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                  {contact.title}
                </h3>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {contact.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <a
                  href={`tel:${contact.number}`}
                  className={`w-full py-3 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center space-x-2 shadow-md transition-all transform hover:scale-[1.02] active:scale-95 text-white bg-gradient-to-r ${contact.color}`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call {contact.number}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture Capabilities Grid */}
      <section className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xl space-y-6">
        <div className="border-b border-rose-100 pb-3">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-red-600" />
            <span>Built-In Safety Modules & Technology</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Designed specifically to protect sisters, friends, and elder family members</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <Navigation className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-sm">Deterministic Safety Router</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Prioritizes well-lit, high-traffic commercial boulevards over dark side lanes using algorithmic scoring.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-sm">Live Off-Route Deviation Shield</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Monitors spatial coordinate offset and dispatches SMS alerts to family contacts if a user strays &gt;150m.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-sm">Decaying Community Heatmap</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Plots crowdsourced unlit lamp & safety signals on a 14-day exponential decay cycle.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="p-8 rounded-3xl bg-gradient-to-r from-red-600 via-rose-500 to-rose-600 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-xl font-black tracking-tight">Ready for a Safe Walk in Kolkata?</h3>
          <p className="text-xs text-rose-100 font-medium">Select your origin and destination to view turn-by-turn safe navigation guidance.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={onNavigateToPlan}
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-rose-50 text-red-600 font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center space-x-1.5 transition-all transform hover:scale-105"
          >
            <span>Plan Route</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToHeatmap}
            className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center space-x-1.5 transition-all"
          >
            <Eye className="w-4 h-4 text-rose-400" />
            <span>Safety Heatmap</span>
          </button>
        </div>
      </section>
    </div>
  );
};
