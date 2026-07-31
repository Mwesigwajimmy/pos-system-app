import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { industries } from '@/lib/data/industries';
import BackNavbar from '@/components/BackNavbar';
import { ArrowRight, LayoutGrid } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Industries',
  description:
    'BBU1 adapts to the way your industry works, with modules built around your workflows and compliance needs.',
};

export default function IndustriesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-500/20">
      <BackNavbar backHref="/" backLabel="Home" />

      <main className="flex-grow pb-24 pt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">

          <header className="max-w-3xl pt-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Industries</span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Built for how your industry actually works
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              Every business has its own workflows and compliance needs. BBU1 adapts to yours, with
              modules built around the way your industry actually operates.
            </p>
          </header>

          {industries.length === 0 ? (
            <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <p className="text-sm text-slate-500">Industry pages are being prepared.</p>
              <Link
                href="/contact"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Talk to us
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {industries.map((ind: any) => {
                const Icon = ind.icon;
                return (
                  <Link
                    href={`/industries/${ind.slug}`}
                    key={ind.slug}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 sm:p-7"
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                      {Icon ? <Icon className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                    </div>

                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                      {ind.name}
                    </h2>

                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                      {ind.description}
                    </p>

                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      View solution
                      <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-900" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center sm:px-12 sm:py-16 md:mt-28">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Do not see your industry?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              We build custom fields and workflows for businesses outside our standard list. Tell us
              how you operate and we will map it out with you.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-8 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Get in touch
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

        </div>
      </main>
    </div>
  );
}