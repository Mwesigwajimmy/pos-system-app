"use client";

import React, { useEffect, useState } from 'react';
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
  const supabase = createClient();

  const loadMapData = async () => {
    const { data: geoStats } = await supabase.from('view_admin_geo_pulse').select('*');
    const { data: markers } = await supabase.from('view_admin_live_map_markers').select('*');
    if (geoStats) setStats(geoStats);
    if (markers) setPoints(markers);
  };

  useEffect(() => {
    loadMapData();
    // Real-time subscription to "flash" new visitors on the map
    const channel = supabase
      .channel('map_pulse')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' }, 
      () => loadMapData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="relative bg-slate-900/20 border border-white/5 rounded-[3rem] p-8 overflow-hidden backdrop-blur-3xl shadow-2xl">
      {/* MAP HEADER */}
      <div className="absolute top-10 left-10 z-10 space-y-2">
        <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
          <Globe className="text-blue-500 animate-spin-slow" /> Global Threat Matrix
        </h3>
        <div className="flex gap-4">
           <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full shadow-[0_0_10px_#2563eb]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Normal Traffic</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-ping shadow-[0_0_10px_#ef4444]" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Active Anomaly</span>
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
            {points.map((point) => (
              <Marker key={point.id} coordinates={[parseFloat(point.longitude) || 0, parseFloat(point.latitude) || 0]}>
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {/* Outer Pulse Ring */}
                  <circle 
                    r={point.severity_level === 'CRITICAL' ? 12 : 6} 
                    fill={point.severity_level === 'CRITICAL' ? "#ef4444" : "#3b82f6"} 
                    fillOpacity={0.3} 
                  />
                  {/* Core Data Node */}
                  <circle 
                    r={point.severity_level === 'CRITICAL' ? 4 : 2} 
                    fill={point.severity_level === 'CRITICAL' ? "#ef4444" : "#3b82f6"} 
                  />
                </motion.g>
              </Marker>
            ))}
          </AnimatePresence>
        </ComposableMap>
      </div>

      {/* MAP FOOTER: TOP ANOMALY REGIONS */}
      <div className="absolute bottom-10 right-10 z-10 w-64 bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
         <h4 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">Hot Zones (24h)</h4>
         <div className="space-y-3">
            {stats.sort((a,b) => b.anomaly_count - a.anomaly_count).slice(0, 3).map((s, i) => (
               <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                    <span className="text-slate-600">#{i+1}</span>
                    <span>{s.country_code || 'Unknown'}</span>
                  </div>
                  <span className={`text-xs font-black ${s.anomaly_count > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {s.anomaly_count} Errors
                  </span>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}