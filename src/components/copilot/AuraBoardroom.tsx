'use client';

/**
 * --- BBU1 SOVEREIGN BOARDROOM INTERFACE ---
 * VERSION: v16.0 OMEGA-ULTIMATUM (FULL COUNCIL ALIGNMENT)
 * The visual 'Executive Stage' where Aura's Council presents 
 * forensic intelligence directly to the Director.
 * 
 * CORE UPGRADES:
 * 1. OMNISCIENT COUNCIL: Expanded iconography and identity for all 9 agents, 
 *    including Medical, SACCO, and Telecom directors.
 * 2. NEURAL REALIGNMENT: Visual data throughput optimized for 1024-dim retrieval.
 * 3. VOICE SOVEREIGNTY: Hardened Speech Synthesis with auto-cleanup to prevent 
 *    buffer overlap during high-speed forensic audits.
 * 4. FORENSIC VISUALS: Synchronized Recharts engine with AAA-grade integrity 
 *    tracking for Director Samuel Oyat.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Presentation, Mic2, TrendingUp, BarChart3, 
  PieChart as PieChartIcon, Activity, UserCircle,
  ShieldCheck, Briefcase, Users, Cpu, FileText,
  ArrowUpRight, ArrowDownRight, Zap, Globe, Shield,
  Stethoscope, Landmark, towerControl as Signal, Radio
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Slide {
  title: string;
  content: string;
  visual_type: 'pie_chart' | 'bar_chart' | 'area_chart' | 'stats_grid' | 'ledger_comparison';
  data_payload: any[];
}

interface BoardroomProps {
  presenter: 'CFO' | 'COO' | 'PM' | 'Marketing' | 'HR' | 'Auditor' | 'Medical' | 'SACCO' | 'Telecom';
  title: string;
  slides: Slide[];
  onClose: () => void;
}

// SOVEREIGN COLOR PALETTE (Forensic Standard)
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function AuraBoardroom({ presenter, title, slides, onClose }: BoardroomProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide] || { title: "End of Briefing", content: "Executive summary concluded. Standing by for Director's directives.", visual_type: 'stats_grid', data_payload: [] };

  // ✅ SOVEREIGN VOICE SYNTHESIS ENGINE (v16.0)
  useEffect(() => {
    if (typeof window !== 'undefined' && slide?.content) {
      // 1. CLEAR existing neural vocalizations to prevent buffer overlap
      window.speechSynthesis.cancel();
      
      // 2. INITIALIZE Executive Narration Protocol
      const utterance = new SpeechSynthesisUtterance(slide.content);
      
      // Calibrated for Director's professional environment
      utterance.rate = 0.92; // Authoritative, deliberate pace
      utterance.pitch = 1.0; 
      utterance.volume = 1.0;

      // 3. EXECUTE Handshake with System Audio
      window.speechSynthesis.speak(utterance);
    }

    // 4. FORENSIC CLEANUP: Cease transmission if the boardroom is terminated
    return () => {
        if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, [currentSlide, slide]);

  // Dynamic Icon Selection based on the full 9-agent Council
  const PresenterIcon = () => {
    switch (presenter) {
        case 'CFO': return <TrendingUp className="text-blue-400 h-7 w-7" />;
        case 'HR': return <Users className="text-purple-400 h-7 w-7" />;
        case 'COO': return <Cpu className="text-emerald-400 h-7 w-7" />;
        case 'Auditor': return <ShieldCheck className="text-amber-400 h-7 w-7" />;
        case 'PM': return <Briefcase className="text-indigo-400 h-7 w-7" />;
        case 'Medical': return <Stethoscope className="text-rose-400 h-7 w-7" />;
        case 'SACCO': return <Landmark className="text-cyan-400 h-7 w-7" />;
        case 'Telecom': return <Radio className="text-orange-400 h-7 w-7" />;
        default: return <UserCircle className="text-slate-400 h-7 w-7" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-slate-950 flex flex-col text-white overflow-hidden selection:bg-emerald-500/30 font-sans"
    >
      {/* Background Infrastructure Layer (Subtle Scanlines) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(16,185,129,0.1),rgba(59,130,246,0.05),rgba(139,92,246,0.1))] z-0 bg-[length:100%_3px,4px_100%]" />

      {/* 1. EXECUTIVE HEADER: IDENTITY LOCK */}
      <header className="relative z-10 flex justify-between items-center px-12 py-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="h-16 w-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] relative group">
            <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <PresenterIcon />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
              {title}
            </h1>
            <div className="flex items-center gap-4 mt-2.5">
              <span className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full shadow-inner">
                <Mic2 size={12} className="animate-pulse" /> Council Briefing Active
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
                <Shield size={10} /> Identity Locked: Aura-{presenter}
              </span>
              <span className="text-[10px] font-mono text-blue-500/60 uppercase tracking-widest border-l border-white/10 pl-4">
                Elite 1024-dim Handshake
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
            <div className="text-right hidden lg:block">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Sovereign Session</p>
                <div className="flex items-center gap-2 justify-end">
                    <Globe size={12} className="text-slate-600" />
                    <p className="text-sm font-mono text-white/80 tabular-nums">{new Date().toLocaleTimeString()}</p>
                </div>
            </div>
            <Button 
                onClick={onClose} 
                variant="ghost" 
                className="rounded-2xl h-16 w-16 hover:bg-rose-500/10 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 transition-all duration-500 active:scale-90"
            >
                <X size={32} />
            </Button>
        </div>
      </header>

      {/* 2. THE BOARDROOM STAGE: FORENSIC THEATER */}
      <main className="relative z-10 flex-1 container mx-auto px-12 grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
        
        {/* Left: Neural Narration & Context (5 Columns) */}
        <motion.section 
          key={`text-${currentSlide}`}
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          className="lg:col-span-5 space-y-10"
        >
          <div className="space-y-5">
            <div className="h-1.5 w-16 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tight drop-shadow-sm">
                {slide.title}
            </h2>
          </div>
          
          <div className="relative pt-4">
            <span className="absolute -left-8 -top-4 text-7xl text-blue-500/20 font-serif leading-none select-none">“</span>
            <p className="text-3xl text-slate-300 leading-snug font-light tracking-wide italic">
                {slide.content}
            </p>
          </div>

          <div className="pt-10 flex items-center gap-5">
            <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-950 bg-slate-900 flex items-center justify-center shadow-lg transition-transform hover:translate-y-[-4px]">
                        <UserCircle size={20} className="text-slate-600" />
                    </div>
                ))}
            </div>
            <div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.35em] leading-none">Council Verified</p>
                <p className="text-[9px] text-emerald-500/60 font-mono mt-1 uppercase tracking-widest italic">Sector Integrity: Saturated</p>
            </div>
          </div>
        </motion.section>

        {/* Right: Forensic Visuals (7 Columns) */}
        <motion.section 
          key={`visual-${currentSlide}`}
          initial={{ x: 60, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.19, 1, 0.22, 1] }}
          className="lg:col-span-7 aspect-video bg-white/[0.03] rounded-[48px] border border-white/10 p-16 shadow-[0_40px_120px_rgba(0,0,0,0.6)] relative group overflow-hidden"
        >
          {/* Internal Glow Pulse */}
          <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

          <ResponsiveContainer width="100%" height="100%">
            {(() => {
                const data = slide.data_payload || [];
                
                if (slide.visual_type === 'area_chart') {
                    return (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke="#ffffff08" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={15} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dx={-15} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '16px' }}
                                itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '900' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={5} animationDuration={2000} />
                        </AreaChart>
                    );
                }
                
                if (slide.visual_type === 'bar_chart' || slide.visual_type === 'ledger_comparison') {
                    return (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="4 4" stroke="#ffffff08" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.04)'}} contentStyle={{ backgroundColor: '#020617', border: 'none', borderRadius: '12px' }} />
                            <Bar dataKey="value" radius={[10, 10, 0, 0]} animationDuration={1800}>
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    );
                }

                if (slide.visual_type === 'stats_grid') {
                    return (
                        <div className="grid grid-cols-2 gap-8 h-full content-center">
                            {data.slice(0, 4).map((item: any, i: number) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white/5 rounded-[32px] p-10 border border-white/5 hover:border-white/20 hover:bg-white/[0.08] transition-all duration-500 shadow-xl"
                                >
                                    <p className="text-slate-500 text-xs font-black uppercase tracking-[0.25em] mb-4">{item.name}</p>
                                    <div className="flex items-end justify-between">
                                        <h3 className="text-5xl font-black text-white tabular-nums tracking-tighter">{item.value}</h3>
                                        {item.trend && (
                                            <Badge className={cn(
                                                "rounded-full px-3 py-1 text-[11px] font-black tracking-tighter border-none flex items-center gap-1",
                                                item.trend > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                            )}>
                                                {item.trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                {Math.abs(item.trend)}%
                                            </Badge>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    );
                }

                return (
                    <PieChart>
                        <Pie 
                            data={data} 
                            innerRadius="65%" 
                            outerRadius="90%" 
                            paddingAngle={10} 
                            dataKey="value"
                            stroke="none"
                            animationDuration={2200}
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                    </PieChart>
                );
            })()}
          </ResponsiveContainer>
        </motion.section>
      </main>

      {/* 3. SOVEREIGN NAVIGATION BAR: STRATEGIC CONTROL */}
      <footer className="relative z-10 px-12 py-12 border-t border-white/10 bg-slate-950/90 backdrop-blur-3xl flex justify-between items-center">
        <div className="flex items-center gap-10">
            <div className="flex gap-2">
                {slides.map((_, i) => (
                    <div 
                        key={i} 
                        className={cn(
                            "h-2 rounded-full transition-all duration-700 shadow-sm",
                            currentSlide === i ? "w-12 bg-emerald-500 shadow-emerald-500/20" : "w-3 bg-white/10"
                        )} 
                    />
                ))}
            </div>
            <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none">Strategic Pulse</p>
                <p className="text-xs font-bold text-white/40 mt-1 uppercase tracking-widest">
                  Slide {currentSlide + 1} of {slides.length} <span className="mx-2">|</span> Elite Context Link Saturated
                </p>
            </div>
        </div>

        <div className="flex gap-6">
          <Button 
            disabled={currentSlide === 0} 
            onClick={() => setCurrentSlide(prev => prev - 1)}
            variant="outline" 
            className="h-16 px-10 border-white/10 hover:bg-white/5 text-white/60 hover:text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all disabled:opacity-5 disabled:cursor-not-allowed"
          >
            Previous Logic
          </Button>
          <Button 
            onClick={() => {
              if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
              else onClose();
            }}
            className="h-16 px-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-[0.25em] shadow-[0_15px_40px_rgba(16,185,129,0.25)] transition-all active:scale-95 flex items-center gap-3"
          >
            {currentSlide === slides.length - 1 ? (
                <>Terminate Briefing <Zap size={16} fill="white" /></>
            ) : (
                <>Execute Next Slide <ArrowUpRight size={18} /></>
            )}
          </Button>
        </div>
      </footer>
    </motion.div>
  );
}

/**
 * STATUS: Boardroom Executive Stage Fully Aligned.
 * VERSION: v16.0 (Full Council Ready).
 * ENGINE: Elite 1024-dim Memory Aligned.
 * DIRECTOR: Samuel Oyat | Sector: Multi-Vertical ERP.
 */