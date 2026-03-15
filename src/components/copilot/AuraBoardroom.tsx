'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Presentation, Mic2, TrendingUp, BarChart3, 
  PieChart as PieChartIcon, Activity, UserCircle 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { Button } from '@/components/ui/button';

interface Slide {
  title: string;
  content: string;
  visual_type: 'pie_chart' | 'bar_chart' | 'area_chart' | 'stats_grid';
  data_payload: any[];
}

interface BoardroomProps {
  presenter: 'CFO' | 'COO' | 'PM' | 'Marketing';
  title: string;
  slides: Slide[];
  onClose: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AuraBoardroom({ presenter, title, slides, onClose }: BoardroomProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];

  // ✅ VOICE SYNTHESIS: Aura speaks the content of each slide
  useEffect(() => {
    if (typeof window !== 'undefined' && slide?.content) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(slide.content);
      utterance.rate = 0.95; // Executive pace
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [currentSlide, slide]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col p-8 text-white"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
            <Presentation className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">{title}</h1>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Mic2 size={12} className="animate-pulse" /> Presenting: Aura-{presenter}
            </p>
          </div>
        </div>
        <Button onClick={onClose} variant="ghost" className="rounded-full h-12 w-12 hover:bg-white/10">
          <X size={24} />
        </Button>
      </div>

      {/* Slide Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 flex-1 items-center">
        {/* Left: Narration Text */}
        <motion.div 
          key={`text-${currentSlide}`}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-6"
        >
          <h2 className="text-4xl font-black text-white leading-tight">{slide.title}</h2>
          <p className="text-xl text-slate-300 leading-relaxed font-light italic">
            "{slide.content}"
          </p>
        </motion.div>

        {/* Right: Visual Data */}
        <motion.div 
          key={`visual-${currentSlide}`}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-white/5 rounded-3xl p-8 border border-white/10 h-[500px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            {slide.visual_type === 'area_chart' ? (
              <AreaChart data={slide.data_payload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b98130" strokeWidth={3} />
              </AreaChart>
            ) : slide.visual_type === 'bar_chart' ? (
              <BarChart data={slide.data_payload}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <PieChart>
                <Pie data={slide.data_payload} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                  {slide.data_payload.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            )}
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Slide Navigation */}
      <div className="mt-12 flex justify-between items-center border-t border-white/10 pt-8">
        <p className="text-slate-500 font-mono text-xs">Slide {currentSlide + 1} of {slides.length}</p>
        <div className="flex gap-4">
          <Button 
            disabled={currentSlide === 0} 
            onClick={() => setCurrentSlide(prev => prev - 1)}
            variant="outline" className="border-white/10 hover:bg-white/5"
          >Previous</Button>
          <Button 
            onClick={() => {
              if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
              else onClose();
            }}
            className="bg-emerald-600 hover:bg-emerald-500 px-8"
          >{currentSlide === slides.length - 1 ? 'End Briefing' : 'Next Slide'}</Button>
        </div>
      </div>
    </motion.div>
  );
}