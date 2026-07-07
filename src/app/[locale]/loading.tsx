'use client';

import React, { useState, useEffect } from "react";

/**
 * --- BBU1 SOVEREIGN OS LOADING SYSTEM ---
 * VERSION: v1.1.0 INDUSTRIAL BATCH (REFINED SIZE)
 * JURISDICTION: Professional Enterprise Infrastructure
 * Placement: src/app/[locale]/loading.tsx
 */

export default function Loading() {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [opacity, setTaglineOpacity] = useState(1);

  // FULL TAGLINE REGISTRY PRESERVED
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

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineOpacity(0);
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % taglines.length);
        setTaglineOpacity(1);
      }, 500);
    }, 3500);

    return () => clearInterval(interval);
  }, [taglines.length]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col justify-center items-center overflow-hidden">
      <style jsx>{`
        .loader-container {
          position: relative;
          width: 120px; /* Reduced from 180px */
          height: 120px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .logo-img {
          width: 64px; /* Professional Enterprise Icon Size */
          height: 64px;
          object-fit: contain;
          z-index: 10;
          animation: breathe 2.4s infinite ease-in-out;
          user-select: none;
        }

        .signal-ring {
          position: absolute;
          width: 64px;
          height: 64px;
          border: 1.5px solid rgba(0, 0, 255, 0.35);
          border-radius: 50%;
          z-index: 1;
          animation: signalOut 2.4s infinite cubic-bezier(0.25, 0.1, 0.25, 1);
        }

        .delay-1 { animation-delay: 0.8s; }
        .delay-2 { animation-delay: 1.6s; }

        .loading-pulse {
          margin-top: 32px; /* Tighter margin */
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(0, 0, 255, 0.4);
          animation: textPulse 2.4s infinite ease-in-out;
        }

        .tagline-container {
          margin-top: 18px;
          min-height: 40px;
          max-width: 400px;
          padding: 0 40px;
          text-align: center;
        }

        .tagline-text {
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
          color: #0b6c89; 
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }

        @keyframes signalOut {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        @keyframes textPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* REFINED VISUAL NODES */}
      <div className="loader-container">
        <div className="signal-ring"></div>
        <div className="signal-ring delay-1"></div>
        <div className="signal-ring delay-2"></div>
        
        <img 
          src="/logo.png" 
          alt="BBU1 Logo" 
          className="logo-img"
        />
      </div>

      <p className="loading-pulse">System Booting</p>

      <div className="tagline-container">
        <p 
          className="tagline-text" 
          style={{ 
            opacity: opacity,
            transform: opacity === 1 ? 'translateY(0)' : 'translateY(4px)'
          }}
        >
          {taglines[taglineIndex]}
        </p>
      </div>

      {/* MINIMALIST FOOTER */}
      <div className="absolute bottom-12 flex flex-col items-center gap-3 opacity-20">
          <div className="h-[1px] w-8 bg-slate-400" />
          <span className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-900">
            Sovereign OS • BBU1 Global
          </span>
      </div>
    </div>
  );
}