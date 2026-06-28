'use client';

/**
 * --- LOGISTICS TRANSIT RADAR ---
 * VERSION: v2.0 ENTERPRISE
 * Use: Real-time fleet tracking and route audit visualization.
 */

import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
    Navigation, 
    Loader2, 
    Truck, 
    Map as MapIcon, 
    History, 
    AlertCircle,
    Activity
} from 'lucide-react';
import { Card } from '@/components/ui/card';

// Enterprise Standard: Token retrieved from environment variables for security
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export default function TransitRadar({ loadId }: { loadId: string }) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const marker = useRef<mapboxgl.Marker | null>(null);
    const supabase = createClient();

    // 1. DATA PULL: Accessing real GPS signals from the database logs
    const { data: logs, isLoading } = useQuery({
        queryKey: ['transit_logs', loadId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('logistics_transit_logs')
                .select('lat, lng, recorded_at')
                .eq('load_id', loadId)
                .order('recorded_at', { ascending: true });
            
            if (error) throw error;
            return data;
        },
        refetchInterval: 5000 // Real-time poll: 5-second signal heartbeat
    });

    // 2. MAP INITIALIZATION & LOGIC ENGINE
    useEffect(() => {
        if (!mapContainer.current || !logs || logs.length === 0 || !mapboxgl.accessToken) return;

        // --- Step A: Create Map Instance ---
        if (!map.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/light-v11', // Professional clean corporate style
                center: [Number(logs[logs.length - 1].lng), Number(logs[logs.length - 1].lat)],
                zoom: 13,
                pitch: 45, // Professional perspective angle
                antialias: true
            });

            // Add standard navigation controls (Zoom/Rotate)
            map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
        }

        const coordinates = logs.map(l => [Number(l.lng), Number(l.lat)]);
        const latestPoint = coordinates[coordinates.length - 1];

        // --- Step B: Handle Route Visualization ---
        const updateRoute = () => {
            if (!map.current) return;
            const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;

            if (source) {
                // Smoothly update the existing path data
                source.setData({
                    'type': 'Feature',
                    'properties': {},
                    'geometry': { 'type': 'LineString', 'coordinates': coordinates as any }
                });
            } else {
                // Initialize the route layer if it's the first time
                map.current.addSource('route', {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': { 'type': 'LineString', 'coordinates': coordinates as any }
                    }
                });

                map.current.addLayer({
                    'id': 'route',
                    'type': 'line',
                    'source': 'route',
                    'layout': { 'line-join': 'round', 'line-cap': 'round' },
                    'paint': { 
                        'line-color': '#2563eb', // Clean Blue
                        'line-width': 4, 
                        'line-opacity': 0.5 
                    }
                });
            }
        };

        // Ensure style is loaded before drawing
        if (map.current.isStyleLoaded()) {
            updateRoute();
        } else {
            map.current.once('style.load', updateRoute);
        }

        // --- Step C: Professional Marker Management ---
        if (!marker.current) {
            const el = document.createElement('div');
            el.style.width = '36px';
            el.style.height = '36px';
            el.style.backgroundColor = '#0f172a'; // Slate-900
            el.style.borderRadius = '10px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.color = 'white';
            el.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            el.style.border = '2px solid white';
            el.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3m1 0h4m5 0h4m1 0h1V9l-5-4v12z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>';
            
            marker.current = new mapboxgl.Marker(el)
                .setLngLat(latestPoint as [number, number])
                .addTo(map.current);
        } else {
            // Smoothly move the marker to the new signal
            marker.current.setLngLat(latestPoint as [number, number]);
        }

        // --- Step D: Smooth Camera Follow ---
        map.current.easeTo({
            center: latestPoint as [number, number],
            duration: 1500, // 1.5s transition for professional smoothness
            padding: { top: 0, bottom: 0, left: 0, right: 0 }
        });

    }, [logs]);

    // Error UI: Missing Configuration
    if (!mapboxgl.accessToken) {
        return (
            <Card className="h-[500px] w-full flex flex-col items-center justify-center p-12 text-center bg-slate-50 border-slate-200">
                <AlertCircle className="text-amber-500 h-10 w-10 mb-4" />
                <h3 className="font-bold text-slate-800 uppercase text-sm tracking-widest">Map Configuration Error</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-xs">The system public token is missing. Please check the environment variables.</p>
            </Card>
        );
    }

    // Loading UI
    if (isLoading) return (
        <div className="h-[600px] w-full bg-slate-50 flex flex-col items-center justify-center rounded-[2rem] border border-slate-100 gap-4">
            <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accessing Satellite Signals...</p>
        </div>
    );

    return (
        <Card className="relative h-[650px] w-full rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl bg-white animate-in fade-in duration-1000">
            {/* The Map Visual Surface */}
            <div ref={mapContainer} className="absolute inset-0 bg-slate-100" />
            
            {/* OVERLAY: Status Console */}
            <div className="absolute top-8 left-8 z-10 space-y-4 w-72">
                <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-xl flex items-center gap-4">
                    <div className="h-11 w-11 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md">
                        <Truck size={22} />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Vehicle Status</p>
                        <p className="text-sm font-bold text-slate-800">Moving In Transit</p>
                    </div>
                </div>

                <div className="bg-blue-600 px-5 py-3 rounded-xl shadow-lg flex items-center justify-between text-white border border-blue-500/50">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Active Signal</span>
                    </div>
                    <Activity size={14} className="opacity-60" />
                </div>
            </div>

            {/* OVERLAY: Route Metadata */}
            <div className="absolute bottom-8 left-8 z-10">
                <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-100 shadow-xl flex items-center gap-4">
                    <History size={16} className="text-slate-400" />
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Load Reference</p>
                        <p className="text-xs font-bold text-slate-700">#SHIP-{loadId}</p>
                    </div>
                </div>
            </div>

            {/* OVERLAY: Business Identification */}
            <div className="absolute bottom-8 right-8 z-10">
                <div className="bg-slate-900 px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-slate-800">
                    <MapIcon size={14} className="text-blue-400" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-[0.3em]">Fleet Management Hub</span>
                </div>
            </div>

            {/* EMPTY STATE: Signal Search */}
            {(!logs || logs.length === 0) && (
                <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-12">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
                        <Navigation size={48} className="text-blue-500 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Signal Search Active</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-xs font-medium">
                        Searching for initial GPS signal from the driver's device. Please ensure the dispatch app is active.
                    </p>
                </div>
            )}
        </Card>
    );
}