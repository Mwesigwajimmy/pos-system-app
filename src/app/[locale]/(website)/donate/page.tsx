import React from 'react';
import type { Metadata } from "next";
import {
  Heart, TrendingUp, Users, Globe, Check, ArrowRight, LayoutGrid
} from "lucide-react";
import BackNavbar from '@/components/BackNavbar';
import { Button } from "@/components/ui/button";
import LeadForm from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "Support the mission",
  description:
    "Support the development of business infrastructure that makes enterprise software available to businesses everywhere.",
};

const DONATION_PLANS = [
  {
    slug: "supporter",
    name: "Supporter",
    amount: "10",
    icon: Heart,
    description: "Support the core work",
    benefits: [
      "Named in the annual report",
      "Product and engineering updates",
      "Newsletter access",
    ],
  },
  {
    slug: "advocate",
    name: "Advocate",
    amount: "50",
    icon: TrendingUp,
    featured: true,
    description: "Back the roadmap",
    benefits: [
      "Everything in Supporter",
      "Advocate badge on your account",
      "Access to the bimonthly webinar",
      "Early access to new features",
    ],
  },
  {
    slug: "partner",
    name: "Partner",
    amount: "100",
    icon: Users,
    description: "Partner on delivery",
    benefits: [
      "Everything in Advocate",
      "Listing in the partner directory",
      "Co-branding for your local market",
      "Quarterly review call",
    ],
  },
  {
    slug: "founders-circle",
    name: "Founders Circle",
    amount: "500",
    icon: Globe,
    description: "Shape the direction",
    benefits: [
      "Everything in Partner",
      "Founders Circle hub access",
      "Invitation to the annual summit",
      "Direct line to the leadership team",
      "Impact report for your organisation",
    ],
  },
];

const FAQS = [
  {
    q: "How are funds used?",
    a: "Allocation is published in our annual report. The focus is open-source research, translation work for regional languages, and infrastructure for businesses in areas with poor connectivity.",
  },
  {
    q: "Can I give using mobile money?",
    a: "Yes. We accept the major mobile money services alongside cards and bank transfer.",
  },
  {
    q: "Is the Founders Circle an advisory role?",
    a: "It gives you a direct channel to our engineering leads to discuss the long-term roadmap. It is not a governance or board position.",
  },
];

type PageProps = {
  searchParams: Promise<{ tier?: string }>;
};

export default async function DonatePage({ searchParams }: PageProps) {
  const { tier } = await searchParams;
  const selectedPlan = DONATION_PLANS.find(p => p.slug === tier);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-500/20">
      <BackNavbar backHref="/" backLabel="Home" />

      <main className="flex-grow pb-24 pt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">

          <header className="max-w-4xl pt-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Heart className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Support the mission</span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Fuel the mission
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
              We are building infrastructure that puts enterprise-grade software within reach of
              ordinary businesses. Your support goes directly into that work.
            </p>
          </header>

          <section className="mt-16 md:mt-24">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              Ways to give
            </h2>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {DONATION_PLANS.map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan?.slug === plan.slug;

                return (
                  <div
                    key={plan.slug}
                    className={
                      isSelected || plan.featured
                        ? "flex h-full flex-col rounded-2xl border-2 border-slate-900 bg-white p-6 sm:p-7"
                        : "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 sm:p-7"
                    }
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      {Icon ? <Icon className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-semibold tracking-tight text-slate-900">
                        ${plan.amount}
                      </span>
                      <span className="text-xs text-slate-400">one time</span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-900">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{plan.description}</p>

                    <ul className="mt-6 flex-1 space-y-3">
                      {plan.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          {benefit}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={
                        isSelected || plan.featured
                          ? "mt-7 h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
                          : "mt-7 h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 hover:bg-slate-50"
                      }
                      asChild
                    >
                      <a href={`?tier=${plan.slug}#give`}>
                        {isSelected ? "Selected" : "Choose this"}
                      </a>
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            id="give"
            className="mx-auto mt-20 max-w-3xl scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 sm:px-10 sm:py-16 md:mt-28"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Send your details
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                Fill this in and we will come back to you with the payment options available in your
                country.
              </p>

              {selectedPlan ? (
                <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2">
                  <Check className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-sm text-slate-700">
                    {selectedPlan.name} · ${selectedPlan.amount}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <LeadForm
                intent={selectedPlan ? `DONATION_INQUIRY_${selectedPlan.slug.toUpperCase()}` : "DONATION_INQUIRY"}
                ctaText="Send"
              />
            </div>
          </section>

          <section className="mx-auto mt-20 max-w-3xl md:mt-28">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              Questions
            </h2>
            <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {FAQS.map((faq, i) => (
                <details key={i} className="group px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-slate-900">
                    {faq.q}
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center sm:px-12 sm:py-16 md:mt-28">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Build the base
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Every contribution goes into the foundation other businesses build on.
            </p>
            <Button
              className="mt-8 h-12 rounded-xl bg-slate-900 px-8 text-sm font-medium text-white hover:bg-slate-800"
              asChild
            >
              <a href="#give">Support the mission</a>
            </Button>
          </section>

        </div>
      </main>
    </div>
  );
}