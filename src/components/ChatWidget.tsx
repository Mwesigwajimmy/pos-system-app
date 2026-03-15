'use client';

import React, { useState } from 'react';
import { MessageCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 p-5 bg-blue-600 text-white rounded-full shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition-all transform hover:scale-110 z-[100] border border-blue-400/20"
        aria-label="Open Aura AI"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-28 right-8 w-96 max-w-[calc(100vw-40px)] bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-3xl p-8 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="mb-6 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none text-left">Aura Assistant</h3>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-left">The Neural Core Interface</p>
          </div>

          <div className="space-y-4 mb-8 text-sm text-slate-400 font-light leading-relaxed text-left">
            <p>Welcome to the Business Base Universe. I am Aura. I can assist with:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-2"><div className="h-1 w-1 bg-blue-600 rounded-full" /> Architecture & Feature Queries</li>
              <li className="flex items-center gap-2"><div className="h-1 w-1 bg-blue-600 rounded-full" /> Enterprise Investment Tiers</li>
              <li className="flex items-center gap-2"><div className="h-1 w-1 bg-blue-600 rounded-full" /> Multi-Market Integration</li>
            </ul>
          </div>

          <Link
            href="/contact"
            className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all text-xs"
            onClick={() => setIsOpen(false)}
          >
            Strategic Inquiry <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="text-[10px] text-slate-600 mt-6 text-center font-bold uppercase tracking-widest">Sovereign Data Protection Active</p>
        </div>
      )}
    </>
  );
}