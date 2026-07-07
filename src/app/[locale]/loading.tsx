'use client';

import React, { useState, useEffect } from "react";

/**
 * --- BBU1 SOVEREIGN OS LOADING SYSTEM ---
 * VERSION: v1.0.0 INDUSTRIAL BATCH
 * Logic: Client-side state rotation for system tips + Forensic signal animations.
 * Placement: src/app/[locale]/loading.tsx
 */

export default function Loading() {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [opacity, setTaglineOpacity] = useState(1);

  // LONG & COMPLETE TAGLINE REGISTRY
  const taglines = [
    "Preparing your all-in-one business OS...",
    "Unifying accounting, CRM, HR and inventory in one place.",
    "Aura AI is warming up to watch your cash flow 24/7.",
    "Tip: Aura can flag anomalies before they become problems.",
    "Bank-level encryption keeps every transaction locked down.",
    "Your data stays safe with row-level, multi-tenant security.",
    "Tip: BBU1 keeps working even when the internet doesn't.",
    "Offline mode syncs automatically the moment you're back online.",
    "From a single shop to a global enterprise, BBU1 scales with you.",
    "Tip: Ask Aura 'What were my best sellers last week?'",
    "Multi-currency accounting for businesses without borders.",
    "Automated invoicing means you get paid faster.",
    "Tip: Set reorder points and never run out of stock again.",
    "Real-time dashboards turn your data into decisions.",
    "One login. Every department. Zero spreadsheets.",
    "Tip: Aura automates up to 90% of your bookkeeping.",
    "Payroll, leave, and recruitment, all handled in one HR suite.",
    "Tip: Build custom workflows without writing a line of code.",
    "Track every shilling, dollar, or euro across every branch.",
    "Tip: Barcode scanning speeds up receiving and dispatch.",
    "Your sales pipeline, support tickets, and campaigns, unified.",
    "Tip: Generate a full Profit & Loss statement in one click.",
    "Compliance built in, from GDPR to local tax authorities.",
    "Tip: Role-based access keeps sensitive data need-to-know.",
    "Point of Sale that keeps selling, even offline.",
    "Tip: Reconcile bank transactions automatically, no spreadsheets.",
    "Manufacturing, retail, healthcare, or NGOs, BBU1 fits your industry.",
    "Tip: Track batches and serial numbers for full traceability.",
    "Aura predicts revenue trends before they happen.",
    "Tip: Client portals keep your customers in the loop.",
    "Almost there, your business command center is loading...",
    "Good things take a moment, great insights are worth the wait."
  ];

  // Logic: Forensic Tagline Rotation Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setTaglineOpacity(0);
      
      // Wait for fade, then switch text and fade in
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % taglines.length);
        setTaglineOpacity(1);
      }, 500);
    }, 3500);

    return () => clearInterval(interval);
  }, [taglines.length]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col justify-center items-center overflow-hidden">
      {/* INJECTED INDUSTRIAL CSS ANIMATIONS */}
      <style jsx>{`
        .loader-container {
          position: relative;
          width: 180px;
          height: 180px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .logo-img {
          width: 100px;
          height: 100px;
          object-fit: contain;
          z-index: 10;
          animation: breathe 2.4s infinite ease-in-out;
          user-select: none;
        }

        .signal-ring {
          position: absolute;
          width: 100px;
          height: 100px;
          border: 2px solid rgba(0, 0, 255, 0.4); /* NIM Brand Blue */
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(0, 0, 255, 0.2);
          z-index: 1;
          animation: signalOut 2.4s infinite cubic-bezier(0.25, 0.1, 0.25, 1);
        }

        .delay-1 { animation-delay: 0.8s; }
        .delay-2 { animation-delay: 1.6s; }

        .loading-pulse {
          margin-top: 50px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.6em;
          text-transform: uppercase;
          color: rgba(0, 0, 255, 0.4);
          animation: textPulse 2.4s infinite ease-in-out;
        }

        .tagline-container {
          margin-top: 24px;
          min-height: 40px;
          max-width: 450px;
          padding: 0 30px;
          text-align: center;
        }

        .tagline-text {
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.6;
          color: #0b6c89; /* Forensic Blue-Grey */
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        @keyframes breathe {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.1); }
        }

        @keyframes signalOut {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }

        @keyframes textPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* VISUAL NODES */}
      <div className="loader-container">
        <div className="signal-ring"></div>
        <div className="signal-ring delay-1"></div>
        <div className="signal-ring delay-2"></div>
        
        {/* LOGO: Points to /public/logo.png as verified in your audit */}
        <img 
          src="/logo.png" 
          alt="NIM BBU1 Logo" 
          className="logo-img"
        />
      </div>

      <p className="loading-pulse">System Booting</p>

      <div className="tagline-container">
        <p 
          className="tagline-text" 
          style={{ 
            opacity: opacity,
            transform: opacity === 1 ? 'translateY(0)' : 'translateY(5px)'
          }}
        >
          {taglines[taglineIndex]}
        </p>
      </div>

      {/* FOOTER METADATA */}
      <div className="absolute bottom-10 flex flex-col items-center gap-2 opacity-20">
          <div className="h-1 w-12 bg-slate-400 rounded-full" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-900">
            Sovereign OS Manufacturing Node
          </span>
      </div>
    </div>
  );
}