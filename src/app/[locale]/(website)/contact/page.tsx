import React from 'react';
import type { Metadata } from "next";
import { Mail, MessageSquare, MapPin, Check, LayoutGrid } from "lucide-react";
import BackNavbar from '@/components/BackNavbar';
import LeadForm from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with BBU1 about sales, partnerships, support or press.",
};

const TOPICS = [
  { slug: "sales", label: "Sales" },
  { slug: "partnership", label: "Partnership" },
  { slug: "support", label: "Support" },
  { slug: "press", label: "Press" },
];

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: "info@bbu1.com",
    href: "mailto:info@bbu1.com",
  },
  {
    icon: MessageSquare,
    label: "WhatsApp",
    value: "+256 703 572 503",
    href: "https://wa.me/256703572503",
    external: true,
  },
  {
    icon: MapPin,
    label: "Based in",
    value: "Kampala, Uganda. Remote team.",
  },
];

type PageProps = {
  searchParams: Promise<{ topic?: string }>;
};

export default async function ContactPage({ searchParams }: PageProps) {
  const { topic } = await searchParams;
  const selectedTopic = TOPICS.find(t => t.slug === topic);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-500/20">
      <BackNavbar backHref="/" backLabel="Home" />

      <main className="flex-grow pb-24 pt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">

          <header className="max-w-3xl pt-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Contact</span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Talk to us
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              Tell us what you are trying to do and we will point you to the right person. We reply
              during working hours, Monday to Saturday.
            </p>
          </header>

          <div className="mt-14 grid items-start gap-6 lg:grid-cols-12 md:mt-20">

            <div className="space-y-5 lg:col-span-5">
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {CHANNELS.map((channel) => {
                  const Icon = channel.icon;
                  const content = (
                    <div className="flex items-start gap-4 px-6 py-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                          {channel.label}
                        </p>
                        <p className="mt-1 text-base text-slate-900">{channel.value}</p>
                      </div>
                    </div>
                  );

                  if (!channel.href) {
                    return <div key={channel.label}>{content}</div>;
                  }

                  return (
                    <a
                      key={channel.label}
                      href={channel.href}
                      target={channel.external ? "_blank" : undefined}
                      rel={channel.external ? "noopener noreferrer" : undefined}
                      className="block transition-colors hover:bg-slate-50"
                    >
                      {content}
                    </a>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
                <p className="text-sm leading-relaxed text-slate-600">
                  What you send here reaches our team only. We do not pass your details to anyone
                  else, and you can ask us to delete them at any time.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Send a message
                </h2>

                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    What is this about
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {TOPICS.map((t) => {
                      const isSelected = selectedTopic?.slug === t.slug;
                      return (
                        <a
                          key={t.slug}
                          href={`?topic=${t.slug}#form`}
                          className={
                            isSelected
                              ? "inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900"
                              : "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-slate-300"
                          }
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                          {t.label}
                        </a>
                      );
                    })}
                  </div>
                </div>

                <div id="form" className="mt-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <LeadForm
                    intent={selectedTopic ? `CONTACT_${selectedTopic.slug.toUpperCase()}` : "CONTACT"}
                    ctaText="Send message"
                  />
                </div>
              </div>
            </div>
          </div>

          <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center sm:px-12 sm:py-16 md:mt-28">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Want a walkthrough of your operations?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              We will sit down with you, look at how your business runs today, and show you what
              BBU1 would change.
            </p>
            <a
              href="mailto:ceo@bbu1.com"
              className="mt-8 inline-flex h-12 items-center rounded-xl bg-slate-900 px-8 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Email the founder
            </a>
          </section>

        </div>
      </main>
    </div>
  );
}