'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    DownloadCloud, 
    Smartphone, 
    Monitor, 
    ShieldCheck, 
    CheckCircle2, 
    Chrome, 
    Apple, 
    Laptop,
    Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function DownloadPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] py-20 px-4">
            <div className="max-w-4xl mx-auto space-y-12">
                
                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 font-bold text-xs uppercase tracking-widest"
                    >
                        <Rocket size={14} /> Official Application
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                        Install BBU1 on your device
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Experience the full power of the BBU1 Business OS with our desktop and mobile application. Works offline, syncs automatically.
                    </p>
                </div>

                {/* Installation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Android / Windows / Chrome */}
                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                        <CardHeader className="bg-white border-b border-slate-50 p-8">
                            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4">
                                <Chrome size={24} />
                            </div>
                            <CardTitle className="text-xl font-bold">Android & Desktop</CardTitle>
                            <CardDescription>Install directly via your browser</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <ul className="space-y-4 text-sm text-slate-600">
                                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" /> <span>Open <b>bbu1.com</b> in Chrome or Edge</span></li>
                                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" /> <span>Tap the three dots (⋮) or the install icon in the URL bar</span></li>
                                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" /> <span>Select <b>"Install App"</b> or <b>"Add to Home Screen"</b></span></li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* iOS / iPhone / Mac */}
                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                        <CardHeader className="bg-white border-b border-slate-50 p-8">
                            <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white mb-4">
                                <Apple size={24} />
                            </div>
                            <CardTitle className="text-xl font-bold">iOS & Safari</CardTitle>
                            <CardDescription>Optimized for iPhone and iPad</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <ul className="space-y-4 text-sm text-slate-600">
                                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" /> <span>Open <b>bbu1.com</b> in Safari</span></li>
                                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" /> <span>Tap the <b>Share</b> button (square with arrow)</span></li>
                                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" /> <span>Scroll down and tap <b>"Add to Home Screen"</b></span></li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Trust Footer */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">Secure Enterprise Build</p>
                            <p className="text-sm text-slate-500">Verified by LITONU BUSINESS BASE UNIVERSE LTD</p>
                        </div>
                    </div>
                    <Button variant="default" className="bg-blue-600 hover:bg-blue-700 font-bold px-8 h-11" onClick={() => window.location.href = '/'}>
                        Return to Homepage
                    </Button>
                </div>
            </div>
        </div>
    );
}