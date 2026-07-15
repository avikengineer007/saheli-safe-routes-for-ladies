import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Phone, ArrowRight, X, CheckCircle2, User, KeyRound, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; phone: string; email: string }) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [authMode, setAuthMode] = useState<'otp' | 'password' | 'signup'>('otp');
  const [phone, setPhone] = useState('9876543210');
  const [email, setEmail] = useState('ananya@example.com');
  const [password, setPassword] = useState('••••••••');
  const [name, setName] = useState('Ananya Sen');
  const [otpCode, setOtpCode] = useState('123456');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setSuccessMessage('OTP code (123456) sent to +91 ' + phone);
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 800);
  };

  const handleVerifyAndLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        name: name || 'SAHELI Sister',
        phone: '+91 ' + phone,
        email: email || `${phone}@saheli-safe.app`
      });
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-2xl relative space-y-6 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-rose-50 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Welcome to SAHELI
            </h2>
            <p className="text-xs text-slate-500 font-medium">Safe Routes & Family Protection Account</p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-rose-100/70 p-1 rounded-2xl border border-rose-200 text-xs font-extrabold">
          <button
            onClick={() => { setAuthMode('otp'); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              authMode === 'otp' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📱 Phone OTP
          </button>
          <button
            onClick={() => setAuthMode('password')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              authMode === 'password' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✉️ Password
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              authMode === 'signup' ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✨ Sign Up
          </button>
        </div>

        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold text-center flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Phone OTP Login Form */}
        {authMode === 'otp' && (
          <form onSubmit={otpSent ? handleVerifyAndLogin : handleSendOtp} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mobile Phone Number (+91)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-rose-200 bg-rose-50/40 text-slate-900 font-bold text-sm outline-none focus:border-red-600 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Enter 6-Digit OTP</span>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-[11px] text-red-600 hover:underline font-extrabold"
                  >
                    Resend Code
                  </button>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Enter 123456"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-rose-200 bg-white text-slate-900 font-mono font-extrabold text-base tracking-widest outline-none focus:border-red-600 transition-all shadow-inner"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-wider bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-lg shadow-red-500/25 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.01]"
            >
              <span>{loading ? 'Processing...' : (otpSent ? 'Verify OTP & Login' : 'Send Emergency OTP')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Email & Password Login Form */}
        {authMode === 'password' && (
          <form onSubmit={handleVerifyAndLogin} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-rose-200 bg-rose-50/40 text-slate-900 font-bold text-xs outline-none focus:border-red-600 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Account Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-rose-200 bg-rose-50/40 text-slate-900 font-bold text-xs outline-none focus:border-red-600 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-wider bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-lg shadow-red-500/25 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.01]"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to SAHELI'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* New Member Registration / Sign Up */}
        {authMode === 'signup' && (
          <form onSubmit={handleVerifyAndLogin} className="space-y-4">
            <div>
              <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ananya Sen"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/40 text-slate-900 font-bold text-xs outline-none focus:border-red-600 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mobile Number (+91)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="9876543210"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/40 text-slate-900 font-bold text-xs outline-none focus:border-red-600 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-slate-600 font-medium space-y-1">
              <div className="font-extrabold text-rose-900 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-red-600" />
                <span>Trusted Verification Benefits:</span>
              </div>
              <p>Accounts aged ≥7 days get immediate 100% verified status for crowdsourced community map reports.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-wider bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-lg shadow-red-500/25 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.01]"
            >
              <span>{loading ? 'Creating Account...' : 'Create Protected Member Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <p className="text-[11px] text-slate-400 text-center font-medium">
          By signing in, you enable end-to-end safe navigation and family tracking guard.
        </p>
      </div>
    </div>
  );
};
