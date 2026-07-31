import React from 'react';
import type { Metadata } from "next";
import {
  Globe, Users, TrendingUp, Code, Wrench,
  MapPin, Clock, ArrowRight, LayoutGrid, GraduationCap, Layers
} from "lucide-react";
import BackNavbar from '@/components/BackNavbar';

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the team building BBU1. We are hiring across engineering, product and operations. Fully remote.",
};

const VALUES = [
  { icon: Globe, title: "Fully remote", desc: "Work from wherever you are. We care about what you ship." },
  { icon: Users, title: "Small team", desc: "Few people, real ownership. Your work is visible from day one." },
  { icon: GraduationCap, title: "You will learn", desc: "You will touch parts of the system well outside your title." },
  { icon: Layers, title: "Real users", desc: "Shops, clinics and pharmacies run their day on what we build." },
];

const JOB_CATEGORIES = [
  {
    title: "Engineering",
    icon: Code,
    roles: [
      {
        title: "Backend Developer",
        description: "Build the APIs and database logic behind the platform. Strong SQL and Postgres experience matters more than any particular language.",
      },
      {
        title: "Frontend Developer",
        description: "Build the screens people use all day. React, TypeScript and Tailwind, with real care for how a form behaves on a cheap phone.",
      },
      {
        title: "DevOps Engineer",
        description: "Own deployment, monitoring and backups. Keep the platform up for businesses that cannot afford downtime.",
      },
      {
        title: "QA Engineer",
        description: "Test the money paths. Accounting, stock and dispensing all have to be right every time, and we need someone who thinks that way.",
      },
    ],
  },
  {
    title: "Product and growth",
    icon: TrendingUp,
    roles: [
      {
        title: "Product Manager",
        description: "Sit with the businesses using BBU1, work out what they actually need, and turn that into a roadmap the team can build.",
      },
      {
        title: "Sales Manager",
        description: "Take the product to businesses across the region. You will do demos, handle objections and close.",
      },
      {
        title: "Marketing Manager",
        description: "Explain what we do in plain language. Content, positioning and the material the sales team uses.",
      },
    ],
  },
  {
    title: "Operations and support",
    icon: Wrench,
    roles: [
      {
        title: "Support Specialist",
        description: "Answer the people using the product. You will be the first to know when something is wrong, and the reason customers stay.",
      },
      {
        title: "Technical Writer",
        description: "Write the guides and help articles. Make a complicated system understandable to someone running a shop.",
      },
    ],
  },
];

const VOLUNTEER_ROLES = [
  { title: "Backend contributor", desc: "Pick up scoped issues on the open parts of the codebase." },
  { title: "Design contributor", desc: "Improve the screens people spend the most time in." },
  { title: "Documentation", desc: "Write and edit guides for features you have used yourself." },
  { title: "Beta testing", desc: "Try new modules before release and report what breaks." },
  { title: "Translation", desc: "Translate the interface into Luganda, Swahili or another local language." },
  { title: "Community", desc: "Answer questions and help new users find their way around." },
];

const HIRING_STEPS = [
  { step: "1", title: "Send an email", desc: "Tell us what you have built. A link beats a long CV." },
  { step: "2", title: "A conversation", desc: "Half an hour on what you have done and what you want to do." },
  { step: "3", title: "A paid task", desc: "A small real piece of work, paid at your rate." },
  { step: "4", title: "Offer", desc: "We come back with terms within a week." },
];

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-500/20">
      <BackNavbar backHref="/" backLabel="Home" />

      <main className="flex-grow pb-24 pt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">

          <header className="max-w-3xl pt-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Careers</span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Come and build this with us
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              We are building one system that a business can actually run on: accounts, stock, sales,
              a clinic, a pharmacy. Every role is fully remote.
            </p>
          </header>

          <section className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, i) => {
              const Icon = value.icon;
              return (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-900">{value.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{value.desc}</p>
                </div>
              );
            })}
          </section>

          <section className="mt-20 md:mt-28">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              Open roles
            </h2>

            <div className="mt-8 space-y-12">
              {JOB_CATEGORIES.map((category, idx) => {
                const Icon = category.icon;
                return (
                  <div key={idx}>
                    <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                      {Icon ? (
                        <Icon className="h-4 w-4 text-slate-400" />
                      ) : (
                        <LayoutGrid className="h-4 w-4 text-slate-400" />
                      )}
                      <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                        {category.title}
                      </h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {category.roles.map((role, rIdx) => (
                        <div
                          key={rIdx}
                          className="flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <h4 className="text-lg font-semibold tracking-tight text-slate-900">
                              {role.title}
                            </h4>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                Remote
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                Full time
                              </span>
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                              {role.description}
                            </p>
                          </div>

                          <a
                            href={`mailto:careers@bbu1.com?subject=${encodeURIComponent(`Application: ${role.title}`)}`}
                            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                          >
                            Apply
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-20 md:mt-28">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              How hiring works
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              Four steps, usually inside three weeks. We tell you where you stand at every stage.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {HIRING_STEPS.map((item) => (
                <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20 md:mt-28">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              Volunteer and contribute
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              Unpaid, flexible, and useful if you want experience on a system real businesses depend
              on. We give references and credit contributors publicly.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {VOLUNTEER_ROLES.map((vol, i) => (
                <div key={i} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-base font-semibold tracking-tight text-slate-900">
                    {vol.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{vol.desc}</p>
                  <a
                    href={`mailto:careers@bbu1.com?subject=${encodeURIComponent(`Volunteer: ${vol.title}`)}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900"
                  >
                    Get in touch
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center sm:px-12 sm:py-16 md:mt-28">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Nothing here fits you?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Send us what you have built and what you would want to work on. We read everything.
            </p>
            <a
              href="mailto:careers@bbu1.com"
              className="mt-8 inline-flex h-12 items-center rounded-xl bg-slate-900 px-8 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Email us
            </a>
          </section>

        </div>
      </main>
    </div>
  );
}