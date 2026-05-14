'use client';

/**
 * --- BBU1 SOVEREIGN BOARDROOM INTERFACE ---
 * The visual 'Executive Stage' where Aura's Council (CFO, COO, HR, PM) 
 * presents forensic intelligence to the Director.
 * 
 * Features: High-Density Recharts, Executive Voice Synthesis, 
 * Multi-Agent Identity, and Forensic KPI Grids.
 * 
 * Integrity Grade: OMEGA-ULTIMATUM.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Presentation, Mic2, TrendingUp, BarChart3, 
  PieChart as PieChartIcon, Activity, UserCircle,
  ShieldCheck, Briefcase, Users, Cpu, FileText,
  ArrowUpRight, ArrowDownRight, Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';

interface Slide {
  title: string;
  content: string;
  visual_type: 'pie_chart' | 'bar_chart' | 'area_chart' | 'stats_grid' | 'ledger_comparison';
  data_payload: any[];
}

interface BoardroomProps {
  presenter: 'CFO' | 'COO' | 'PM' | 'Marketing' | 'HR' | 'Auditor';
  title: string;
  slides: Slide[];
  onClose: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AuraBoardroom({ presenter, title, slides, onClose }: BoardroomProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide] || { title: "End of Briefing", content: "", visual_type: 'stats_grid', data_payload: [] };

  // ✅ SOVEREIGN VOICE SYNTHESIS ENGINE
  useEffect(() => {
    if (typeof window !== 'undefined' && slide?.content) {
      // 1. CANCEL existing speech to prevent overlap
      window.speechSynthesis.cancel();
      
      // 2. INITIALIZE Executive Narration
      const utterance = new SpeechSynthesisUtterance(slide.content);
      utterance.rate = 0.92; // Deliberate, professional pace
      utterance.pitch = 1.05; // Slightly higher for clarity
      utterance.volume = 1.0;

      // 3. EXECUTE Handshake
      window.speechSynthesis.speak(utterance);
    }

    // 4. FORENSIC CLEANUP: Stop Aura from talking if the Director closes the boardroom
    return () => {
        if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, [currentSlide, slide]);

  // Dynamic Icon Selection based on Executive Agent Role
  const PresenterIcon = () => {
    switch (presenter) {
        case 'CFO': return <TrendingUp className="text-blue-400" />;
        case 'HR': return <Users className="text-purple-400" />;
        case 'COO': return <Cpu className="text-emerald-400" />;
        case 'Auditor': return <ShieldCheck className="text-amber-400" />;
        case 'PM': return <Briefcase className="text-indigo-400" />;
        default: return <UserCircle className="text-slate-400" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-slate-950 flex flex-col text-white overflow-hidden selection:bg-blue-500/30"
    >
      {/* Background Infrastructure Layer (Subtle Scanlines) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%]" />

      {/* 1. EXECUTIVE HEADER */}
      <header className="relative z-10 flex justify-between items-center px-12 py-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
            <PresenterIcon />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">
              {title}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/10 px-2 py-0.5 rounded">
                <Mic2 size={10} className="animate-pulse" /> Live Narration 
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                Agent Identity: Aura-{presenter}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sovereign Session</p>
                <p className="text-xs font-mono text-white/60">{new Date().toLocaleTimeString()}</p>
            </div>
            <Button onClick={onClose} variant="ghost" className="rounded-xl h-14 w-14 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all">
                <X size={28} />
            </Button>
        </div>
      </header>

      {/* 2. THE BOARDROOM STAGE */}
      <main className="relative z-10 flex-1 container mx-auto px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left: Narration & Context (5 Columns) */}
        <motion.section 
          key={`text-${currentSlide}`}
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 space-y-8"
        >
          <div className="space-y-4">
            <div className="h-1 w-12 bg-blue-600 rounded-full" />
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
                {slide.title}
            </h2>
          </div>
          
          <div className="relative">
            <span className="absolute -left-6 top-0 text-4xl text-blue-500/30 font-serif">“</span>
            <p className="text-2xl text-slate-300 leading-relaxed font-light font-sans tracking-wide">
                {slide.content}
            </p>
          </div>

          <div className="pt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center">
                        <UserCircle size={14} className="text-slate-500" />
                    </div>
                ))}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Verified by Executive Council</p>
          </div>
        </motion.section>

        {/* Right: Forensic Visuals (7 Columns) */}
        <motion.section 
          key={`visual-${currentSlide}`}
          initial={{ x: 40, opacity: 0, scale: 0.98 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="lg:col-span-7 aspect-video bg-white/[0.02] rounded-[40px] border border-white/5 p-12 shadow-[0_30px_100px_rgba(0,0,0,0.4)] relative group"
        >
          {/* Subtle Glow */}
          <div className="absolute -inset-4 bg-blue-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

          <ResponsiveContainer width="100%" height="100%">
            {(() => {
                const data = slide.data_payload;
                
                if (slide.visual_type === 'area_chart') {
                    return (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} />
                        </AreaChart>
                    );
                }
                
                if (slide.visual_type === 'bar_chart' || slide.visual_type === 'ledger_comparison') {
                    return (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{ backgroundColor: '#020617', border: 'none' }} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    );
                }

                if (slide.visual_type === 'stats_grid') {
                    return (
                        <div className="grid grid-cols-2 gap-6 h-full content-center">
                            {data.slice(0, 4).map((item: any, i: number) => (
                                <div key={i} className="bg-white/5 rounded-3xl p-8 border border-white/5 hover:border-white/10 transition-colors">
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">{item.name}</p>
                                    <div className="flex items-end gap-3">
                                        <h3 className="text-4xl font-black text-white">{item.value}</h3>
                                        {item.trend && (
                                            <span className={`flex items-center text-xs font-bold mb-1 ${item.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {item.trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                {Math.abs(item.trend)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                return (
                    <PieChart>
                        <Pie 
                            data={data} 
                            innerRadius="60%" 
                            outerRadius="85%" 
                            paddingAngle={8} 
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" />
                    </PieChart>
                );
            })()}
          </ResponsiveContainer>
        </motion.section>
      </main>

      {/* 3. SOVEREIGN NAVIGATION BAR */}
      <footer className="relative z-10 px-12 py-10 border-t border-white/5 bg-slate-950/80 backdrop-blur-xl flex justify-between items-center">
        <div className="flex items-center gap-6">
            <div className="flex gap-1.5">
                {slides.map((_, i) => (
                    <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-10 bg-blue-500' : 'w-2 bg-white/10'}`} 
                    />
                ))}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                Strategic Slide {currentSlide + 1} <span className="mx-2 text-white/10">|</span> Total Capacity: {slides.length} Units
            </p>
        </div>

        <div className="flex gap-4">
          <Button 
            disabled={currentSlide === 0} 
            onClick={() => setCurrentSlide(prev => prev - 1)}
            variant="outline" 
            className="h-14 px-8 border-white/10 hover:bg-white/5 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-20"
          >
            Previous Logic
          </Button>
          <Button 
            onClick={() => {
              if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
              else onClose();
            }}
            className="h-14 px-10 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.15em] shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all active:scale-95"
          >
            {currentSlide === slides.length - 1 ? 'Terminate Briefing' : 'Execute Next Slide'}
          </Button>
        </div>
      </footer>
    </motion.div>
  );
}

/**
 * STATUS: Boardroom Interface Synchronized.
 * VERSION: v10.8 (Omega Ready)
 * JURISDICTION: Global Dashboard Overlay.
 */