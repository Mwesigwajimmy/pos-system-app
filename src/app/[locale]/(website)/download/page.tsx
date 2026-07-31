'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import BackNavbar from '@/components/BackNavbar';
import {
    Download,
    Smartphone,
    Check,
    Share,
    Plus,
    MoreVertical,
    ShieldCheck,
    WifiOff,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const FEATURES = [
    { icon: WifiOff, title: 'Works offline', desc: 'Keep selling when the network drops. Everything syncs when it returns.' },
    { icon: Smartphone, title: 'Opens like an app', desc: 'Its own icon on your home screen, no browser bars in the way.' },
    { icon: ShieldCheck, title: 'Always current', desc: 'Updates arrive on their own. Nothing to reinstall.' },
];

export default function DownloadPage() {
    const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [platform, setPlatform] = useState<Platform>('unknown');
    const [dismissedMessage, setDismissedMessage] = useState(false);

    useEffect(() => {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
        const isIOS =
            /iPad|iPhone|iPod/.test(ua) ||
            (typeof navigator !== 'undefined' &&
                navigator.platform === 'MacIntel' &&
                (navigator as any).maxTouchPoints > 1);

        if (isIOS) setPlatform('ios');
        else if (/Android/i.test(ua)) setPlatform('android');
        else setPlatform('desktop');

        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        setIsInstalled(standalone);

        const handlePrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as InstallPromptEvent);
        };

        const handleInstalled = () => {
            setIsInstalled(true);
            setInstallPrompt(null);
            setIsInstalling(false);
        };

        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', handleInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handlePrompt);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;

        setIsInstalling(true);
        setDismissedMessage(false);

        try {
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;

            if (outcome === 'accepted') {
                setIsInstalled(true);
            } else {
                setDismissedMessage(true);
            }
        } catch (error) {
            setDismissedMessage(true);
        } finally {
            setInstallPrompt(null);
            setIsInstalling(false);
        }
    };

    const canInstallNow = !!installPrompt && !isInstalled;

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 selection:bg-blue-500/20">
            <BackNavbar backHref="/" backLabel="Home" />

            <main className="flex-grow pb-24 pt-20">
                <div className="container mx-auto max-w-3xl px-4 sm:px-6">

                    <header className="pt-8 text-center">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                            <Download className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-600">Install</span>
                        </div>

                        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                            Put BBU1 on your device
                        </h1>

                        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                            Install it once and it opens like any other app, with or without a connection.
                        </p>
                    </header>

                    <section className="mt-10">
                        {isInstalled ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
                                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                    <Check className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                                    Already installed
                                </h2>
                                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
                                    You are running the installed app. Look for the BBU1 icon on your home screen
                                    or desktop next time.
                                </p>
                                <Button
                                    className="mt-6 h-11 rounded-xl bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
                                    asChild
                                >
                                    <Link href="/">Go to the app</Link>
                                </Button>
                            </div>
                        ) : canInstallNow ? (
                            <div className="rounded-2xl border-2 border-slate-900 bg-white px-6 py-10 text-center">
                                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                                    <Download className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                                    Ready to install
                                </h2>
                                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
                                    Your browser can install BBU1 right now. It takes a few seconds.
                                </p>
                                <Button
                                    onClick={handleInstall}
                                    disabled={isInstalling}
                                    className="mt-6 h-12 rounded-xl bg-slate-900 px-8 text-sm font-medium text-white hover:bg-slate-800"
                                >
                                    {isInstalling ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    Install BBU1
                                </Button>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8">
                                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                                    {platform === 'ios'
                                        ? 'Install on iPhone or iPad'
                                        : 'Install from your browser'}
                                </h2>

                                {platform === 'ios' ? (
                                    <ol className="mt-5 space-y-4">
                                        <li className="flex gap-3 text-sm leading-relaxed text-slate-600">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-600">
                                                1
                                            </span>
                                            <span className="pt-0.5">Open bbu1.com in Safari. Chrome on iPhone cannot install apps.</span>
                                        </li>
                                        <li className="flex gap-3 text-sm leading-relaxed text-slate-600">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-600">
                                                2
                                            </span>
                                            <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                Tap the Share button
                                                <Share className="h-4 w-4 text-slate-400" />
                                                at the bottom of the screen.
                                            </span>
                                        </li>
                                        <li className="flex gap-3 text-sm leading-relaxed text-slate-600">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-600">
                                                3
                                            </span>
                                            <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                Scroll down and tap Add to Home Screen
                                                <Plus className="h-4 w-4 text-slate-400" />
                                            </span>
                                        </li>
                                    </ol>
                                ) : (
                                    <ol className="mt-5 space-y-4">
                                        <li className="flex gap-3 text-sm leading-relaxed text-slate-600">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-600">
                                                1
                                            </span>
                                            <span className="pt-0.5">Open bbu1.com in Chrome, Edge or Samsung Internet.</span>
                                        </li>
                                        <li className="flex gap-3 text-sm leading-relaxed text-slate-600">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-600">
                                                2
                                            </span>
                                            <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                Open the browser menu
                                                <MoreVertical className="h-4 w-4 text-slate-400" />
                                                or look for the install icon in the address bar.
                                            </span>
                                        </li>
                                        <li className="flex gap-3 text-sm leading-relaxed text-slate-600">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-600">
                                                3
                                            </span>
                                            <span className="pt-0.5">
                                                Choose Install app, or Add to Home screen on Android.
                                            </span>
                                        </li>
                                    </ol>
                                )}

                                {platform !== 'ios' ? (
                                    <p className="mt-6 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-500">
                                        If your browser supports one-tap install, a button appears here
                                        automatically. Firefox and some in-app browsers do not support it.
                                    </p>
                                ) : null}
                            </div>
                        )}

                        {dismissedMessage ? (
                            <p className="mt-4 text-center text-sm text-slate-500">
                                Installation was cancelled. Reload this page if you want to try again.
                            </p>
                        ) : null}
                    </section>

                    <section className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
                        {FEATURES.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                        {Icon ? <Icon className="h-4 w-4" /> : null}
                                    </div>
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.desc}</p>
                                </div>
                            );
                        })}
                    </section>

                    <section className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 sm:flex-row">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">
                                    Published by Litonu Business Base Universe Ltd
                                </p>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Installed straight from bbu1.com. No app store needed.
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="h-11 w-full shrink-0 rounded-xl border-slate-200 px-6 text-sm font-medium sm:w-auto"
                            asChild
                        >
                            <Link href="/">Back to home</Link>
                        </Button>
                    </section>

                </div>
            </main>
        </div>
    );
}