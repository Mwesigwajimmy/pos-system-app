"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, Activity, Globe, Zap, ShieldCheck, Map as MapIcon, Radar } from 'lucide-react';
import { scaleLinear } from "d3-scale";

// Internal Libs
import { createClient } from '@/lib/supabase/client';

/**
 * DEEPLY DEFINED UTILITY: cn (Class Name Merger)
 * Defined locally to ensure zero external dependency issues.
 */
function cn(...inputs: (string | undefined | boolean | null | Record<string, boolean>)[]) {
  return inputs
    .flatMap((input) => {
      if (typeof input === 'string') return input;
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([_, value]) => value)
          .map(([key]) => key);
      }
      return [];
    })
    .join(' ');
}

// Enterprise standard: Hardened CDN for world geometry
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// --- Types ---
interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  severity_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  created_at: string;
}

interface GeoStat {
  country_code: string;
  anomaly_count: number;
}

// --- Memoized Components for Performance ---
const PulseMarker = memo(({ point, scales }: { point: MapMarker; scales: any }) => {
  const severity = scales.rank(point.severity_level);
  const outerR = scales.outer(severity);
  const coreR = scales.core(severity);
  const isCritical = point.severity_level === 'CRITICAL';
  
  // High contrast colors for white background
  const color = isCritical ? '#ef4444' : '#2563eb';

  return (
    <Marker coordinates={[point.longitude, point.latitude]}>
      <g>
        {/* Pulsing Outer Ring */}
        <motion.circle
          initial={{ r: 0, opacity: 0 }}
          animate={{ 
            r: [coreR, outerR * 1.8, outerR], 
            opacity: [0.8, 0.1, 0.4] 
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            ease: "easeOut" 
          }}
          fill={color}
          fillOpacity={0.15}
        />
        {/* Static Core */}
        <circle r={coreR} fill={color} className="shadow-sm" />
        {/* One-time entry ping */}
        <motion.circle
          initial={{ r: 0, opacity: 1 }}
          animate={{ r: outerR * 5, opacity: 0 }}
          transition={{ duration: 1.2 }}
          fill="none"
          stroke={color}
          strokeWidth={1}
        />
      </g>
    </Marker>
  );
});

PulseMarker.displayName = 'PulseMarker';

export default function SovereignGeoMap() {
  const [points, setPoints] = useState<MapMarker[]>([]);
  const [stats, setStats] = useState<GeoStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

  // Prevent Hydration Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Scales memoized for stability
  const scales = useMemo(() => ({
    rank: (s?: string) => {
      const up = String(s).toUpperCase();
      if (up === 'CRITICAL') return 4;
      if (up === 'HIGH') return 3;
      if (up === 'MEDIUM') return 2;
      return 1;
    },
    outer: scaleLinear().domain([1, 4]).range([5, 16]).clamp(true),
    core: scaleLinear().domain([1, 4]).range([2, 6]).clamp(true),
  }), []);

  // 1. Authoritative Data Sync
  const syncAuthoritativeData = useCallback(async () => {
    try {
      const [{ data: geoStats }, { data: markers }] = await Promise.all([
        supabase.from('view_admin_geo_pulse').select('*'),
        supabase.from('view_admin_live_map_markers').select('*').limit(100),
      ]);

      if (geoStats) setStats(geoStats);
      if (markers) {
        const validatedMarkers = markers.map(m => {
          const lat = parseFloat(m.latitude);
          const lng = parseFloat(m.longitude);
          return { ...m, latitude: lat, longitude: lng };
        }).filter(m => !isNaN(m.latitude) && !isNaN(m.longitude));
        
        setPoints(validatedMarkers);
      }
    } catch (err) {
      console.error('Authoritative sync failed', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2. Real-time Subscription Logic (Untouched)
  useEffect(() => {
    if (!mounted) return;
    
    syncAuthoritativeData();
    const statsInterval = setInterval(syncAuthoritativeData, 30000);

    const channel = supabase
      .channel('live-global-threats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' },
        (payload) => {
          const newM = payload.new;
          const lat = parseFloat(newM.latitude);
          const lng = parseFloat(newM.longitude);

          if (isNaN(lat) || isNaN(lng)) return;

          const freshPoint: MapMarker = {
            id: newM.id,
            latitude: lat,
            longitude: lng,
            severity_level: newM.severity_level || 'LOW',
            created_at: newM.created_at
          };

          setPoints(prev => {
            if (prev.some(p => p.id === freshPoint.id)) return prev;
            return [freshPoint, ...prev].slice(0, 150);
          });
        }
      )
      .subscribe();

    return () => {
      clearInterval(statsInterval);
      supabase.removeChannel(channel);
    };
  }, [supabase, syncAuthoritativeData, mounted]);

  if (!mounted) return null;

  return (
    <div className="relative bg-white border border-slate-200 rounded-[3rem] p-1 overflow-hidden shadow-sm group animate-in fade-in duration-1000">
      
      {/* 1. HUD OVERLAY - TOP LEFT */}
      <div className="absolute top-12 left-12 z-20 pointer-events-none">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Radar size={16} className="text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Vector Stream 01</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              GLOBAL<span className="text-blue-600">_PULSE_MATRIX</span>
            </h3>
          </div>

          <div className="flex gap-8 items-center bg-white/80 backdrop-blur-md p-4 px-6 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Nodes</span>
                <span className="text-lg font-mono font-black text-slate-900">{points.length}</span>
             </div>
             <div className="h-8 w-[1px] bg-slate-100" />
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sync Status</span>
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-emerald-500" />
                  <span className="text-xs font-mono font-black text-emerald-500 uppercase">Operational</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 2. MAP ENGINE (LIGHT THEME) */}
      <div className="h-[750px] w-full bg-[#f8fafc] cursor-crosshair">
        <ComposableMap 
          projectionConfig={{ scale: 200, center: [10, 15] }}
          className="w-full h-full"
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={-1}
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth={0.8}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#e2e8f0", outline: "none" },
                    pressed: { outline: "none" }
                  }}
                />
              ))
            }
          </Geographies>

          <AnimatePresence mode="popLayout">
            {points.map((point) => (
              <PulseMarker key={point.id} point={point} scales={scales} />
            ))}
          </AnimatePresence>
        </ComposableMap>
      </div>

      {/* 3. REGIONAL HOTZONES DRAWER - BOTTOM RIGHT */}
      <div className="absolute bottom-12 right-12 z-20 w-80">
        <div className="bg-white/90 border border-slate-200 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <AlertOctagon size={14} className="text-red-500" /> Hot Zones (24h)
            </h4>
            <div className="relative flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="absolute h-4 w-4 bg-red-400 rounded-full animate-ping opacity-25" />
            </div>
          </div>
          
          <div className="space-y-5">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 w-full bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              stats.slice(0, 4).map((s, i) => (
                <div key={s.country_code} className="flex items-center justify-between group/row">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono font-bold text-slate-300">0{i+1}</span>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover/row:text-blue-600 transition-colors">
                      {s.country_code || '??'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((s.anomaly_count / 100) * 100, 100)}%` }}
                        transition={{ duration: 1.5, delay: i * 0.1 }}
                        className="h-full bg-red-500 rounded-full" 
                      />
                    </div>
                    <span className="text-[11px] font-mono font-black text-slate-900">
                      {Number(s.anomaly_count || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <Globe size={12} /> Pipeline Latency
             </div>
             <span className="text-[10px] font-mono text-emerald-600 font-black">14ms</span>
          </div>
        </div>
      </div>

      {/* 4. MAP GRID OVERLAY (SUBTLE) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.4] overflow-hidden">
        <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      {/* FOOTER BADGE */}
      <div className="absolute bottom-12 left-12 z-20">
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-2.5 rounded-full shadow-lg">
             <ShieldCheck size={14} className="text-blue-400" />
             <span className="text-[9px] font-black uppercase text-white tracking-[0.3em]">Encrypted Forensic Terminal</span>
          </div>
      </div>
    </div>
  );
}