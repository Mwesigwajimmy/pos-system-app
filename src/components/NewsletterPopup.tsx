'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, Sparkles, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'bbu1_newsletter_popup';

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return; // Already subscribed or dismissed
    const timer = setTimeout(() => setVisible(true), 9000); // show at 9s
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');

    try {
      // ── BACKEND HOOK ──────────────────────────────────────────────────────

      // ─────────────────────────────────────────────────────────────────────
      const supabase = createClient();
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: email.toLowerCase().trim(), source: 'popup' });

      if (error && error.code !== '23505') throw error; // 23505 = duplicate, still treat as success
      setStatus('success');
      localStorage.setItem(STORAGE_KEY, 'subscribed');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[900]"
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-6 sm:inset-auto sm:bottom-8 sm:right-8 sm:w-[420px] z-[901] rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Glass gradient background */}
            <div className="relative bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] border border-white/10 p-8">
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.35),transparent)] pointer-events-none" />

              {/* Close button */}
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white/70" />
              </button>

              {/* Icon badge */}
              <div className="relative flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl">
                  <Rocket className="h-5 w-5 text-blue-400" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                  <Sparkles className="h-3 w-3" /> Insider Access
                </span>
              </div>

              {status !== 'success' ? (
                <div className="relative space-y-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-white leading-tight">
                      Stay ahead of every business shift.
                    </h3>
                    <p className="text-sm text-blue-100/80 mt-2 leading-relaxed">
                      Get early access to product drops, exclusive launch offers, and
                      growth playbooks used by leading enterprises straight to your inbox.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400/70" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                        placeholder="your@company.com"
                        className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 focus:bg-white/15 transition-all"
                      />
                    </div>
                    {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm transition-all shadow-lg shadow-blue-900/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {status === 'loading' ? 'Subscribing...' : 'Get Insider Access →'}
                    </button>
                  </form>

                  <p className="text-[11px] text-blue-200/50 text-center">No spam. Unsubscribe anytime. Free forever.</p>
                </div>
              ) : (
                <div className="relative text-center space-y-3 py-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto">
                    <Sparkles className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">You&apos;re in.</h3>
                  <p className="text-sm text-blue-100/70">
                    Welcome to the inner circle. Watch your inbox — something good is coming.
                  </p>
                  <button onClick={() => setVisible(false)} className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors">
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
