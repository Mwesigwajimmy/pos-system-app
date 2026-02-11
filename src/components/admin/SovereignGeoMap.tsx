"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from '@/lib/supabase/client';
import { AlertOctagon, Activity, Globe, Zap, ShieldCheck } from 'lucide-react';
import { scaleLinear } from "d3-scale";
import { cn } from '@/lib/utils';

// Enterprise standard: Use local GeoJSON if possible, or a hardened CDN.
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
  
  const color = isCritical ? '#ef4444' : '#3b82f6';

  return (
    <Marker coordinates={[point.longitude, point.latitude]}>
      <g>
        {/* Pulsing Outer Ring */}
        <motion.circle
          initial={{ r: 0, opacity: 0 }}
          animate={{ 
            r: [coreR, outerR * 1.5, outerR], 
            opacity: [1, 0.2, 0.5] 
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeOut" 
          }}
          fill={color}
          fillOpacity={0.15}
        />
        {/* Static Core */}
        <circle r={coreR} fill={color} className="shadow-lg" />
        {/* One-time entry ping */}
        <motion.circle
          initial={{ r: 0, opacity: 1 }}
          animate={{ r: outerR * 4, opacity: 0 }}
          transition={{ duration: 1 }}
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

  // Prevent Hydration Mismatch (standard for maps/charts)
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Scales memoized to prevent recalculation on every pulse
  const scales = useMemo(() => ({
    rank: (s?: string) => {
      const up = String(s).toUpperCase();
      if (up === 'CRITICAL') return 4;
      if (up === 'HIGH') return 3;
      if (up === 'MEDIUM') return 2;
      return 1;
    },
    outer: scaleLinear().domain([1, 4]).range([4, 14]).clamp(true),
    core: scaleLinear().domain([1, 4]).range([1.5, 5]).clamp(true),
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
        // Validation: Ensure coordinates are valid numbers before letting them into state
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

  // 2. Real-time Subscription Logic
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
          
          // CRITICAL FIX: Convert and validate numeric coordinates immediately
          const lat = parseFloat(newM.latitude);
          const lng = parseFloat(newM.longitude);

          // If coordinates are null or NaN, exit now to prevent marker crash
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
    <div className="relative bg-[#020617] border border-white/5 rounded-[3rem] p-1 overflow-hidden shadow-2xl group">
      
      {/* HUD OVERLAY - TOP */}
      <div className="absolute top-10 left-10 z-20 pointer-events-none">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-blue-500 fill-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/80">Vector Stream 01</span>
            </div>
            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
              GLOBAL<span className="text-blue-600">_THREAT_MATRIX</span>
            </h3>
          </div>

          <div className="flex gap-6 items-center">
             <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Active Nodes</span>
                <span className="text-sm font-mono font-bold text-white">{points.length}</span>
             </div>
             <div className="h-6 w-[1px] bg-white/10" />
             <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">System Load</span>
                <div className="flex items-center gap-2">
                  <Activity size={10} className="text-emerald-500" />
                  <span className="text-xs font-mono font-bold text-emerald-500 uppercase">Nominal</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* MAP ENGINE */}
      <div className="h-[700px] w-full bg-[#020617] cursor-crosshair">
        <ComposableMap 
          projectionConfig={{ scale: 190, center: [10, 10] }}
          className="w-full h-full"
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={-1}
                  fill="#0f172a"
                  stroke="#1e293b"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none", transition: 'all 250ms' },
                    hover: { fill: "#1e293b", outline: "none" },
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

      {/* REGIONAL HOTZONES DRAWER */}
      <div className="absolute bottom-10 right-10 z-20 w-72">
        <div className="bg-black/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <AlertOctagon size={12} className="text-red-500" /> Hot Zones (24h)
            </h4>
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              stats.slice(0, 4).map((s, i) => (
                <div key={s.country_code} className="flex items-center justify-between group/row">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-600">0{i+1}</span>
                    <span className="text-xs font-black text-white uppercase tracking-tight group-hover/row:text-blue-400 transition-colors">
                      {s.country_code || '??'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((s.anomaly_count / 100) * 100, 100)}%` }}
                        className="h-full bg-red-500" 
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-red-500">
                      {Number(s.anomaly_count || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                <Globe size={10} /> Live Latency
             </div>
             <span className="text-[9px] font-mono text-emerald-500 font-bold">14ms</span>
          </div>
        </div>
      </div>

      {/* MAP GRID OVERLAY (Visual only) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
    </div>
  );
}