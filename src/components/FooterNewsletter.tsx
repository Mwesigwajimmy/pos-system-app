'use client';

import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function FooterNewsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Enter a valid email.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');

    try {
      // ── BACKEND HOOK ──────────────────────────────────────────────────────
      // Same table as the popup
 
      // ─────────────────────────────────────────────────────────────────────
      const supabase = createClient();
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: email.toLowerCase().trim(), source: 'footer' });

      if (error && error.code !== '23505') throw error;
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Try again.');
    }
  };

  return (
    <div className="border-t border-blue-500/30 py-10 mb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left: copy */}
        <div className="space-y-1 max-w-sm">
          <p className="text-white font-bold text-base">Stay in the loop.</p>
          <p className="text-blue-100/70 text-sm leading-relaxed">
            Product updates, exclusive offers, and enterprise growth insights delivered to your inbox.
          </p>
        </div>

        {/* Right: form */}
        {status === 'success' ? (
          <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            You&apos;re subscribed — Welcome to the inner circle.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 min-w-0 sm:w-64">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                placeholder="name@company.com"
                className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 focus:bg-white/15 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-60 font-bold rounded-xl px-5 py-3 text-sm transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
            >
              {status === 'loading' ? 'Subscribing…' : <><span>Subscribe</span><ArrowRight className="h-4 w-4" /></>}
            </button>
            {errorMsg && (
              <p className="text-red-400 text-xs mt-1 sm:absolute sm:bottom-0 sm:translate-y-full">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
