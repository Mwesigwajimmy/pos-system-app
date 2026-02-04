"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from '@/lib/supabase/client';
import { AlertOctagon, Activity, Globe } from 'lucide-react';
import { scaleLinear } from "d3-scale";

// URL to the world map topology
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function SovereignGeoMap() {
  const [points, setPoints] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Map severity text -> numeric scale for sizing/color mapping
  const severityRank = (s?: string) => {
    if (!s) return 0;
    const up = String(s).toUpperCase();
    switch (up) {
      case "CRITICAL":
        return 4;
      case "HIGH":
        return 3;
      case "MEDIUM":
        return 2;
      case "LOW":
        return 1;
      default:
        return 0;
    }
  };

  // d3 scales for outer pulse radius and core radius
  const outerRadiusScale = useMemo(
    () => scaleLinear().domain([0, 4]).range([4, 18]).clamp(true),
    []
  );
  const coreRadiusScale = useMemo(
    () => scaleLinear().domain([0, 4]).range([1, 6]).clamp(true),
    []
  );

  const loadMapData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: geoStats, error: geoErr }, { data: markers, error: markersErr }] = await Promise.all([
        supabase.from('view_admin_geo_pulse').select('*'),
        supabase.from('view_admin_live_map_markers').select('*'),
      ]);
      if (geoErr) {
        console.error('geoStats error', geoErr);
      } else if (geoStats) {
        setStats(geoStats);
      }
      if (markersErr) {
        console.error('markers error', markersErr);
      } else if (markers) {
        setPoints(markers);
      }
    } catch (err) {
      console.error('Failed to load map data', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    // Initial load
    loadMapData();

    // Real-time subscription to map pulses (new telemetry)
    const channel = supabase
      .channel('public:map_pulse')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' },
        (payload) => {
          // Prepend a lightweight marker quickly for immediate UX, then refresh full markers asynchronously
          try {
            const newMarker = payload.new;
            if (mounted && newMarker && newMarker.latitude && newMarker.longitude) {
              // Keep lat/lon numeric and ensure id exists
              const marker = {
                id: newMarker.id ?? `tmp-${Date.now()}`,
                latitude: newMarker.latitude,
                longitude: newMarker.longitude,
                severity_level: newMarker.severity_level ?? 'LOW',
                created_at: newMarker.created_at ?? new Date().toISOString(),
              };
              setPoints(prev => {
                const next = [marker, ...prev];
                return next.slice(0, 200); // keep size reasonable
              });
            }
          } finally {
            // in the background refresh authoritative sets (non-blocking)
            loadMapData().catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        if (typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        } else if (supabase.removeChannel) {
          supabase.removeChannel(channel);
        }
      } catch (e) {
        // swallow cleanup errors
      }
    };
  }, [supabase, loadMapData]);

  const renderMarker = (point: any) => {
    const lat = parseFloat(point.latitude as any) || 0;
    const lon = parseFloat(point.longitude as any) || 0;
    const severity = severityRank(point.severity_level);
    const outerR = outerRadiusScale(severity);
    const coreR = coreRadiusScale(severity);
    const isCritical = String(point.severity_level ?? '').toUpperCase() === 'CRITICAL';
    const outerColor = isCritical ? '#ef4444' : '#3b82f6';
    const coreColor = isCritical ? '#ef4444' : '#3b82f6';

    return (
      <Marker key={point.id ?? `${lat}-${lon}-${Math.random()}`} coordinates={[lon, lat]}>
        <motion.g
          initial={{ scale: 0.6, opacity: 0.2 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Outer pulsating ring (use motion.circle for smooth animation) */}
          <motion.circle
            r={outerR}
            fill={outerColor}
            fillOpacity={0.22}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatType: 'loop' }}
          />
          {/* Core node */}
          <circle r={coreR} fill={coreColor} />
        </motion.g>
      </Marker>
    );
  };

  return (
    <div className="relative bg-slate-900/20 border border-white/5 rounded-[3rem] p-8 overflow-hidden backdrop-blur-3xl shadow-2xl">
      {/* MAP HEADER */}
      <div className="absolute top-10 left-10 z-10 space-y-2">
        <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
          <Globe className="text-blue-500 animate-spin-slow" /> Global Threat Matrix
        </h3>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full shadow-[0_0_10px_#2563eb]" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Normal Traffic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-ping shadow-[0_0_10px_#ef4444]" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Active Anomaly</span>
          </div>

          {/* Use Activity and AlertOctagon imports to enrich the legend */}
          <div className="flex items-center gap-2 ml-3 text-[10px] text-slate-400">
            <Activity size={12} /> Live activity
          </div>
          <div className="flex items-center gap-2 ml-1 text-[10px] text-red-400">
            <AlertOctagon size={12} /> Critical events
          </div>
        </div>
      </div>

      {/* THE MAP ENGINE */}
      <div className="h-[600px] w-full">
        <ComposableMap projectionConfig={{ scale: 200 }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#0f172a"
                  stroke="#1e293b"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#1e293b", outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          <AnimatePresence>
            {points.map((point) => renderMarker(point))}
          </AnimatePresence>
        </ComposableMap>
      </div>

      {/* MAP FOOTER: TOP ANOMALY REGIONS */}
      <div className="absolute bottom-10 right-10 z-10 w-64 bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <h4 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">Hot Zones (24h)</h4>
        <div className="space-y-3">
          {loading && <div className="text-slate-400 text-sm">Loading hot zones…</div>}

          {!loading && stats.length === 0 && (
            <div className="text-slate-500 text-sm">No anomalies recorded in the last 24 hours.</div>
          )}

          {!loading && stats
            .slice() // copy
            .sort((a, b) => (b.anomaly_count || 0) - (a.anomaly_count || 0))
            .slice(0, 3)
            .map((s, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                  <span className="text-slate-600">#{i + 1}</span>
                  <span>{s.country_code || 'Unknown'}</span>
                </div>
                <span className={`text-xs font-black ${s.anomaly_count > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {s.anomaly_count ?? 0} Errors
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}