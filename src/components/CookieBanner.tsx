'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasConsent = localStorage.getItem('bbu1_privacy_consent');
    if (!hasConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('bbu1_privacy_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('bbu1_privacy_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[110] p-6">
      <div className="max-w-xl mx-auto bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-3xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shrink-0">
             <ShieldCheck size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-black text-white uppercase italic tracking-tight text-lg mb-2">Privacy Protocols</h3>
            <p className="text-sm text-slate-400 font-light leading-relaxed">
              We utilize technical cookies to orchestrate your experience, analyze system telemetry, and ensure high-fidelity delivery of the OS. By initiating access, you acknowledge our data sovereignty standards.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
          <button
            onClick={handleDecline}
            className="flex-1 px-8 py-3 border border-white/10 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all text-[10px]"
          >
            Restrict
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-8 py-3 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all text-[10px] shadow-xl shadow-blue-600/20"
          >
            Authorize All
          </button>
        </div>
      </div>
    </div>
  );
}