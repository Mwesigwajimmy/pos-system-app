import React from 'react';
import type { Metadata } from "next";
import { Heart, Target, Globe, Users, LayoutGrid } from 'lucide-react';
import BackNavbar from '@/components/BackNavbar';

export const metadata: Metadata = {
    title: "About",
    description:
        "BBU1 is one system for running a business: accounting, sales, stock, staff and reporting in a single place.",
};

const VALUES = [
    { icon: Target, title: "Focus", desc: "We would rather do a few things well than everything at once." },
    { icon: Users, title: "Community", desc: "We build alongside the businesses using this, not at a distance from them." },
    { icon: Globe, title: "Reach", desc: "Built for businesses across Africa, useful anywhere." },
    { icon: Heart, title: "Straight talk", desc: "We tell you what the product does and what it does not do." },
];

const COMMITMENTS = [
    {
        num: "01",
        title: "We grow when you grow",
        desc: "We are not a vendor you hear from once a year. If your business does not work on this, neither do we.",
    },
    {
        num: "02",
        title: "Built to be depended on",
        desc: "Encrypted connections, daily backups and a system designed to keep working as you add branches.",
    },
    {
        num: "03",
        title: "Your data stays yours",
        desc: "Custom fields, custom workflows and an API, so you can export or integrate whenever you want.",
    },
    {
        num: "04",
        title: "Clear pricing",
        desc: "No hidden fees and no surprise upgrades. What is on the page is what you pay.",
    },
];

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-500/20">
            <BackNavbar backHref="/" backLabel="Home" />

            <main className="flex-grow pb-24 pt-20">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6">

                    <header className="pt-8">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                            <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-600">About</span>
                        </div>

                        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                            Who we are
                        </h1>

                        <div className="mt-10 grid items-start gap-6 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <p className="max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                                    BBU1 is one system for running a business. Accounting, sales, stock, staff and
                                    reporting in a single place, instead of five tools that do not talk to each other.
                                </p>
                                <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
                                    We started it because we kept meeting the same problem. Businesses were paying for
                                    good software that would not connect, then spending hours every week reconciling
                                    the gaps by hand. We wanted something solid enough to run a business on, wherever
                                    that business is.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:col-span-4">
                                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                    Founder
                                </p>
                                <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                                    Mwesigwa Jimmy
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Building the software layer that African businesses can run their operations on.
                                </p>
                            </div>
                        </div>
                    </header>

                    <section className="mt-20 grid gap-10 md:mt-28 md:grid-cols-2 md:gap-16">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                Mission
                            </p>
                            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                                Fewer tools, less friction
                            </h2>
                            <p className="mt-4 text-base leading-relaxed text-slate-600">
                                Help a business go from one shop to several without the hidden cost of stitching
                                systems together, so the time goes into the business rather than into reconciling
                                three different spreadsheets.
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                Vision
                            </p>
                            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                                The same tools, everywhere
                            </h2>
                            <p className="mt-4 text-base leading-relaxed text-slate-600">
                                A shop in a small town should have the same quality of software as a large firm in a
                                capital city. Built for African markets first, and useful anywhere.
                            </p>
                        </div>
                    </section>

                    <section className="mt-20 md:mt-28">
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                            What we care about
                        </h2>

                        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                            {VALUES.map((value, i) => {
                                const Icon = value.icon;
                                return (
                                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                            {Icon ? <Icon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                                        </div>
                                        <h3 className="text-base font-semibold tracking-tight text-slate-900">
                                            {value.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{value.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="mt-20 md:mt-28">
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                            What you can expect from us
                        </h2>

                        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                            {COMMITMENTS.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6"
                                >
                                    <span className="text-sm font-semibold tabular-nums text-slate-300">
                                        {item.num}
                                    </span>
                                    <div>
                                        <h3 className="text-base font-semibold leading-snug tracking-tight text-slate-900">
                                            {item.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 sm:px-10 sm:py-14 md:mt-28">
                        <div className="max-w-3xl">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                Giving back
                            </p>
                            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                                One percent of profits
                            </h2>
                            <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-600">
                                <p>
                                    Since August 2024 we have committed one percent of annual profits to SOS
                                    Children&apos;s Villages, supporting children and families in the communities we
                                    work in.
                                </p>
                                <p>
                                    We are part of the businesses we serve, and those businesses are part of the
                                    places they operate in. This is how we hold up our end of that.
                                </p>
                            </div>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}