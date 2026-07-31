'use client';

import React from 'react';
import Link from 'next/link';
import {
  Link2, X, Globe2, Smartphone, User, Leaf,
  ShieldCheck, MessageSquareText, DownloadCloud, Sparkles, Heart
} from 'lucide-react';
import FooterNewsletter from '@/components/FooterNewsletter';

export default function SiteFooter() {
  return (
    <footer className="relative bg-blue-600 text-white pt-24 pb-12 border-t-0 z-10 selection:bg-white/30">
      <div className="container mx-auto px-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">

          {/* 1. Branding + Contacts */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                BBU1 <span className="text-blue-100 font-light text-base ml-1 uppercase tracking-widest">Global</span>
              </h3>
            </div>

            <p className="text-sm text-blue-100 max-w-sm leading-relaxed font-medium">
              Accounting, CRM, inventory, HR, and AI insights — one platform for running your business.
            </p>

            <div className="space-y-5 pt-4">
              <a href="mailto:ceo@bbu1.com" className="flex items-center gap-4 text-sm text-blue-100 hover:text-white transition-all group">
                <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center group-hover:bg-red-50 transition-colors shadow-sm">
                  <User size={20} className="text-blue-600 group-hover:text-red-500 transition-colors" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">Founder & CEO</span>
                  <span className="text-white font-semibold">ceo@bbu1.com</span>
                </div>
              </a>

              <a href="https://wa.me/256703572503" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-sm text-blue-100 hover:text-white transition-all group">
                <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-sm">
                  <Smartphone size={20} className="text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">WhatsApp</span>
                  <span className="text-white font-semibold">+256 703 572 503</span>
                </div>
              </a>

              <div className="flex items-center gap-3 pt-4">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-blue-700 hover:bg-blue-700 hover:text-white transition-all">
                  <Link2 size={18} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-800 hover:bg-black hover:text-white transition-all">
                  <X size={18} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all">
                  <Globe2 size={18} />
                </a>
              </div>
            </div>
          </div>

          {/* 2. Platform */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em] mb-10">Platform</h4>
            <ul className="space-y-5 text-sm font-medium">
              <li><Link href="/features" className="text-blue-100 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/industries" className="text-blue-100 hover:text-white transition-colors">Industries</Link></li>
              <li>
                <Link href="/download" className="text-white font-bold flex items-center gap-2.5 hover:text-blue-100 transition-all group">
                  <DownloadCloud size={16} className="group-hover:scale-110 transition-transform" /> Download App
                </Link>
              </li>
              <li>
                <Link href="/aura-ai" className="text-white font-bold flex items-center gap-2.5 hover:text-blue-100 transition-all">
                  <Sparkles size={16} /> Aura AI
                </Link>
              </li>
              <li><Link href="/pricing" className="text-blue-100 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/blog" className="text-blue-100 hover:text-white transition-colors">Journal</Link></li>
            </ul>
          </div>

          {/* 3. Organization */}
          <div className="lg:col-span-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em] mb-10">Organization</h4>
            <ul className="space-y-5 text-sm font-medium">
              <li><a href="https://wa.me/256703572503" target="_blank" rel="noopener noreferrer" className="text-blue-100 hover:text-white transition-colors">Book a demo</a></li>
              <li><Link href="/help-centre" className="text-blue-100 hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/courses" className="text-blue-100 hover:text-white transition-colors">BBU1 Academy</Link></li>
              <li><Link href="/about" className="text-blue-100 hover:text-white transition-colors">About us</Link></li>
              <li><Link href="/careers" className="text-blue-100 hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>

          {/* 4. Support & Admin */}
          <div className="lg:col-span-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em] mb-10">Support</h4>
            <ul className="space-y-5 text-sm font-medium">
              <li>
                <a href="mailto:support@bbu1.com" className="text-blue-100 hover:text-white transition-all flex items-center gap-3 group">
                  <div className="p-1.5 bg-white rounded-md shadow-sm group-hover:bg-red-50 transition-colors">
                    <MessageSquareText size={14} className="text-blue-600 group-hover:text-red-500 transition-colors" />
                  </div>
                  Technical support
                </a>
              </li>
              <li>
                <a href="mailto:admin@bbu1.com" className="text-blue-100 hover:text-white transition-all flex items-center gap-3 group">
                  <div className="p-1.5 bg-white rounded-md shadow-sm group-hover:bg-emerald-50 transition-colors">
                    <ShieldCheck size={14} className="text-blue-600 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  Account & billing
                </a>
              </li>
              <li><Link href="/contact" className="text-blue-100 hover:text-white transition-colors">Contact us</Link></li>
              <li><Link href="/donate" className="flex items-center gap-2.5 text-white font-bold hover:text-blue-100 transition-colors"><Heart size={16} /> Giving back</Link></li>
              <li><Link href="/terms" className="text-blue-100 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-blue-100 hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <FooterNewsletter />

        {/* Bottom legal */}
        <div className="border-t border-blue-500/50 pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="space-y-1.5">
            <p className="text-blue-100 font-semibold text-sm">
              BBU1 is built and operated by{' '}
              <span className="text-white font-bold">Litonu Business Base Universe Ltd.</span>
            </p>
            <p className="text-[11px] text-blue-200/80">
              © {new Date().getFullYear()} All rights reserved. Registered in Uganda, No. 80034302367494.
            </p>
          </div>
          <p className="text-[11px] text-blue-200/80 flex items-center gap-1.5">
            Built in Kampala <Leaf className="h-3.5 w-3.5 text-green-300" /> for businesses everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}