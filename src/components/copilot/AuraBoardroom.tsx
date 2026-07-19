'use client';

/**
 * --- BBU1 SOVEREIGN BOARDROOM INTERFACE ---
 * The visual 'Executive Stage' where Aura's Council presents
 * forensic intelligence directly to the Director.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Presentation, Mic2, TrendingUp, BarChart3,
  PieChart as PieChartIcon, Activity, UserCircle,
  ShieldCheck, Briefcase, Users, Cpu, FileText,
  ArrowUpRight, ArrowDownRight, ArrowLeft, Zap, Globe, Shield,
  Stethoscope, Landmark, TowerControl as Signal, Radio
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
  Legend
} from 'recharts';
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function AuraBoardroom({ presenter, title, slides, onClose }: BoardroomProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide] || { title: "End of Briefing", content: "Executive summary concluded. Standing by for Director's directives.", visual_type: 'stats_grid', data_payload: [] };

  useEffect(() => {
    if (typeof window !== 'undefined' && slide?.content) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(slide.content);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
    return () => {
        if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, [currentSlide, slide]);

  const PresenterIcon = () => {
    switch (presenter) {
        case 'CFO': return <TrendingUp className="text-blue-400 h-5 w-5 sm:h-7 sm:w-7" />;
        case 'HR': return <Users className="text-purple-400 h-5 w-5 sm:h-7 sm:w-7" />;
        case 'COO': return <Cpu className="text-emerald-400 h-5 w-5 sm:h-7 sm:w-7" />;
        case 'Auditor': return <ShieldCheck className="text-amber-400 h-5 w-5 sm:h-7 sm:w-7" />;
        case 'PM': return <Briefcase className="text-indigo-400 h-5 w-5 sm:h-7 sm:w-7" />;
        case 'Medical': return <Stethoscope className="text-rose-400 h-5 w-5 sm:h-7 sm:w-7" />;
        case 'SACCO': return <Landmark className="text-cyan-400 h-5 w-5 sm:h-7 sm:w-7" />;
        case 'Telecom': return <Radio className="text-orange-400 h-5 w-5 sm:h-7 sm:w-7" />;
        default: return <UserCircle className="text-slate-400 h-5 w-5 sm:h-7 sm:w-7" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-slate-950 flex flex-col text-white overflow-hidden selection:bg-emerald-500/30 font-sans"
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(16,185,129,0.1),rgba(59,130,246,0.05),rgba(139,92,246,0.1))] z-0 bg-[length:100%_3px,4px_100%]" />

      {/* 1. EXECUTIVE HEADER: IDENTITY LOCK */}
      <header className="relative z-10 flex justify-between items-center px-4 sm:px-8 lg:px-12 py-4 sm:py-6 lg:py-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl shrink-0">
        <div className="flex items-center gap-3 sm:gap-5 lg:gap-8 min-w-0">
          <div className="h-10 w-10 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-2xl sm:rounded-3xl bg-white/5 flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] relative group shrink-0">
            <div className="absolute inset-0 bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <PresenterIcon />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl lg:text-4xl font-black uppercase tracking-tighter text-white leading-none truncate">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2.5">
              <span className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] bg-emerald-500/10 border border-emerald-500/20 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-inner">
                <Mic2 size={11} className="animate-pulse" /> Council Briefing Active
              </span>
              <span className="hidden sm:flex text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] items-center gap-2">
                <Shield size={10} /> Identity Locked: Aura-{presenter}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <div className="text-right hidden xl:block">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Sovereign Session</p>
                <div className="flex items-center gap-2 justify-end">
                    <Globe size={12} className="text-slate-600" />
                    <p className="text-sm font-mono text-white/80 tabular-nums">{new Date().toLocaleTimeString()}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close boardroom"
                className="flex items-center justify-center rounded-xl sm:rounded-2xl h-10 w-10 sm:h-14 sm:w-14 lg:h-16 lg:w-16 text-white/70 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all duration-300 active:scale-90"
            >
                <X size={22} className="sm:hidden" />
                <X size={32} className="hidden sm:block" />
            </button>
        </div>
      </header>

      {/* 2. THE BOARDROOM STAGE: FORENSIC THEATER */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto container mx-auto px-4 sm:px-8 lg:px-12 py-6 lg:py-0 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20 lg:items-center">

        {/* Left: Neural Narration & Context (5 Columns) */}
        <motion.section
          key={`text-${currentSlide}`}
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          className="lg:col-span-5 space-y-5 sm:space-y-8 lg:space-y-10"
        >
          <div className="space-y-3 sm:space-y-5">
            <div className="h-1.5 w-12 sm:w-16 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white leading-[1.1] lg:leading-[1.05] tracking-tight drop-shadow-sm">
                {slide.title}
            </h2>
          </div>

          <div className="relative pt-2 sm:pt-4">
            <span className="absolute -left-4 sm:-left-8 -top-2 sm:-top-4 text-4xl sm:text-7xl text-blue-500/20 font-serif leading-none select-none">&ldquo;</span>
            <p className="text-base sm:text-xl lg:text-3xl text-slate-300 leading-snug font-light tracking-wide italic">
                {slide.content}
            </p>
          </div>

          <div className="pt-4 sm:pt-10 flex items-center gap-4 sm:gap-5">
            <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                    <div key={i} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-slate-950 bg-slate-900 flex items-center justify-center shadow-lg transition-transform hover:translate-y-[-4px]">
                        <UserCircle size={16} className="text-slate-600 sm:hidden" />
                        <UserCircle size={20} className="text-slate-600 hidden sm:block" />
                    </div>
                ))}
            </div>
            <div>
                <p className="text-[9px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] sm:tracking-[0.35em] leading-none">Council Verified</p>
                <p className="text-[8px] sm:text-[9px] text-emerald-500/60 font-mono mt-1 uppercase tracking-widest italic">Sector Integrity: Saturated</p>
            </div>
          </div>
        </motion.section>

        {/* Right: Forensic Visuals (7 Columns) */}
        <motion.section
          key={`visual-${currentSlide}`}
          initial={{ x: 60, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.19, 1, 0.22, 1] }}
          className="lg:col-span-7 aspect-video bg-white/[0.03] rounded-2xl sm:rounded-[32px] lg:rounded-[48px] border border-white/10 p-4 sm:p-8 lg:p-16 shadow-[0_40px_120px_rgba(0,0,0,0.6)] relative group overflow-hidden"
        >
          <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

          {slide.visual_type === 'stats_grid' ? (
            <div className="relative h-full grid grid-cols-2 gap-3 sm:gap-8 content-center">
                {(slide.data_payload || []).slice(0, 4).map((item: any, i: number) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/5 rounded-2xl sm:rounded-[32px] p-4 sm:p-10 border border-white/5 hover:border-white/20 hover:bg-white/[0.08] transition-all duration-500 shadow-xl"
                    >
                        <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] mb-2 sm:mb-4 truncate">{item.name}</p>
                        <div className="flex flex-col gap-2 sm:gap-3">
                            <h3 className="text-lg sm:text-2xl lg:text-4xl font-black text-white tabular-nums tracking-tight leading-none break-words">{item.value}</h3>
                            {item.trend !== undefined && item.trend !== null && (
                                <Badge className={cn(
                                    "self-start rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-black tracking-tighter border-none flex items-center gap-1",
                                    item.trend > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                )}>
                                    {item.trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {Math.abs(item.trend)}%
                                </Badge>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
          ) : (
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
          )}
        </motion.section>
      </main>

      {/* 3. SOVEREIGN NAVIGATION BAR: STRATEGIC CONTROL */}
      <footer className="relative z-10 px-4 sm:px-8 lg:px-12 py-4 sm:py-8 lg:py-12 border-t border-white/10 bg-slate-950/90 backdrop-blur-3xl flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 shrink-0">
        <div className="flex items-center gap-4 sm:gap-10 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex gap-2">
                {slides.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-2 rounded-full transition-all duration-700 shadow-sm",
                            currentSlide === i ? "w-8 sm:w-12 bg-emerald-500 shadow-emerald-500/20" : "w-2.5 sm:w-3 bg-white/10"
                        )}
                    />
                ))}
            </div>
            <div className="flex flex-col">
                <p className="hidden sm:block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none">Strategic Pulse</p>
                <p className="text-[10px] sm:text-xs font-bold text-white/40 sm:mt-1 uppercase tracking-widest">
                  Slide {currentSlide + 1} of {slides.length}
                </p>
            </div>
        </div>

        <div className="flex gap-3 sm:gap-6 w-full sm:w-auto">
          <button
            type="button"
            disabled={currentSlide === 0}
            onClick={() => setCurrentSlide(prev => prev - 1)}
            className="flex-1 sm:flex-none h-11 sm:h-14 lg:h-16 px-5 sm:px-8 lg:px-10 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white/80 hover:text-white rounded-2xl sm:rounded-3xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft size={16} /> Previous
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
              else onClose();
            }}
            className="flex-1 sm:flex-none h-11 sm:h-14 lg:h-16 px-5 sm:px-8 lg:px-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl sm:rounded-3xl font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] shadow-[0_15px_40px_rgba(16,185,129,0.35)] transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs"
          >
            {currentSlide === slides.length - 1 ? (
                <>Terminate <Zap size={16} fill="white" /></>
            ) : (
                <>Next Slide <ArrowUpRight size={18} /></>
            )}
          </button>
        </div>
      </footer>
    </motion.div>
  );
}
