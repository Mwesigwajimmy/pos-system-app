'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

type BackNavbarProps = {
  backHref?: string;
  backLabel?: string;
};

export default function BackNavbar({ backHref = '/', backLabel = 'Home' }: BackNavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 z-40 w-full transition-all duration-300 bg-white/90 backdrop-blur-md',
        scrolled ? 'border-b border-slate-200/70 shadow-sm' : 'border-b border-slate-100/60'
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between max-w-7xl">
        {/* Back button — icon only */}
        <Link
          href={backHref}
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors text-slate-600 hover:text-blue-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
        </Link>

        {/* Center logo — icon only */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <Rocket className="h-6 w-6 text-blue-600" />
        </Link>

        {/* Right: Book a Demo */}
        <a
          href="https://wa.me/256703572503"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors text-slate-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900"
        >
          Book a Demo
        </a>
      </div>
    </header>
  );
}
