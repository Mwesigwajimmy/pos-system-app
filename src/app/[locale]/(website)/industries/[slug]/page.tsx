import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { industries } from '@/lib/data/industries';
import { Check, AlertTriangle, ArrowRight, LayoutGrid } from 'lucide-react';
import BackNavbar from '@/components/BackNavbar';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return industries.map((industry: any) => ({ slug: industry.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const industry = industries.find((i: any) => i.slug === slug);

  if (!industry) return { title: 'Industry not found' };

  return {
    title: industry.name,
    description: industry.description || industry.longDescription,
  };
}

export default async function IndustryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const industry: any = industries.find((i: any) => i.slug === slug);
  if (!industry) notFound();

  const Icon = industry.icon;
  const challenges: string[] = Array.isArray(industry.challenges) ? industry.challenges : [];
  const solutions: string[] = Array.isArray(industry.solutions) ? industry.solutions : [];
  const keyFeatures: string[] = Array.isArray(industry.keyFeatures) ? industry.keyFeatures : [];
  const others = industries.filter((i: any) => i.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-500/20">
      <BackNavbar backHref="/industries" backLabel="Industries" />

      <main className="pb-24 pt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">

          <header className="max-w-4xl pt-8">
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              {Icon ? <Icon className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {industry.name}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
              {industry.longDescription || industry.description}
            </p>
          </header>

          <div className="mt-14 grid items-start gap-5 lg:grid-cols-2 md:mt-20">

            {challenges.length > 0 ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  Common challenges
                </h2>
                <ul className="mt-6 space-y-4">
                  {challenges.map((c, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {solutions.length > 0 ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
                <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                  <Check className="h-4 w-4 shrink-0 text-slate-900" />
                  How BBU1 helps
                </h2>
                <ul className="mt-6 space-y-4">
                  {solutions.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-900 sm:text-base">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

          </div>

          {keyFeatures.length > 0 ? (
            <section className="mt-14 md:mt-20">
              <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                What you get
              </h2>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {keyFeatures.map((f, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center sm:px-12 sm:py-16 md:mt-28">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              See it for your business
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Book a demo and we will walk through how BBU1 fits a {industry.name.toLowerCase()} business
              like yours.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-8 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Book a demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          {others.length > 0 ? (
            <section className="mt-20">
              <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                Other industries
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                {others.map((ind: any) => {
                  const OtherIcon = ind.icon;
                  return (
                    <Link
                      href={`/industries/${ind.slug}`}
                      key={ind.slug}
                      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300"
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                        {OtherIcon ? <OtherIcon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                      </div>
                      <h3 className="text-base font-semibold tracking-tight text-slate-900">
                        {ind.name}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                        {ind.description}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                        View solution
                        <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-900" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

        </div>
      </main>
    </div>
  );
}