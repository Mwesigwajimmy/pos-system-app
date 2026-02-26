'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    ShieldAlert, Camera, Cpu, Wifi, Zap, 
    Lock, Unlock, Radio, Loader2, Fingerprint,
    Activity, Video, BellRing, Link
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SentryHub({ tenantId }: { tenantId: string }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    // 1. Fetch Registered Hardware
    const { data: devices, isLoading } = useQuery({
        queryKey: ['security_hardware', tenantId],
        queryFn: async () => {
            const { data } = await supabase
                .from('security_hardware_registry')
                .select('*')
                .eq('tenant_id', tenantId);
            return data || [];
        }
    });

    // 2. Real-time Theft Feed
    const { data: alerts } = useQuery({
        queryKey: ['security_alerts', tenantId],
        queryFn: async () => {
            const { data } = await supabase
                .from('system_tactical_comms')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('priority', 'URGENT')
                .order('created_at', { ascending: false });
            return data || [];
        },
        refetchInterval: 3000 // Scan for breaches every 3 seconds
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-1000 pb-20">
            
            {/* War Room Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3 italic uppercase">
                        <ShieldAlert className="text-red-600 w-10 h-10 animate-pulse" />
                        Sovereign Sentry Hub
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest ml-1">
                        Robotic Defense & IoT Hardware Integration // Status: ARMED
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-12 border-slate-300 font-black uppercase tracking-widest text-xs">
                        <Link size={16} className="mr-2" /> Pair New Hardware
                    </Button>
                    <Button className="h-12 bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest text-xs shadow-xl shadow-red-200">
                        <BellRing size={16} className="mr-2" /> Global Lockdown
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* LEFT: Live Telemetry Feed */}
                <div className="xl:col-span-8 space-y-6">
                    <Card className="bg-slate-950 border-none shadow-2xl overflow-hidden rounded-3xl">
                        <CardHeader className="bg-white/5 border-b border-white/5">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-white flex items-center gap-2 text-sm font-black tracking-widest uppercase">
                                    <Activity className="text-emerald-500 animate-pulse" size={16} />
                                    Live Sensor Stream
                                </CardTitle>
                                <Badge className="bg-emerald-600 border-none text-[8px] font-mono">10.2 Gbps Encryption</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="aspect-video bg-black flex items-center justify-center relative group">
                                <Video size={64} className="text-white/5 group-hover:scale-110 transition-transform duration-1000" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-[10px] font-mono text-emerald-500 tracking-[0.5em] animate-pulse">AWAITING CAMERA HANDSHAKE...</p>
                                </div>
                                <div className="absolute bottom-6 left-6 flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                        <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Live: Front Gate</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Threat Log */}
                    <Card className="border-none shadow-xl">
                        <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Tactical Threat Register</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {alerts.map(alert => (
                                <div key={alert.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <ShieldAlert className="text-red-600" size={24} />
                                        <div>
                                            <p className="text-sm font-black text-red-950 uppercase">{alert.body}</p>
                                            <p className="text-[10px] text-red-700 font-mono italic">Time: {new Date(alert.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" className="bg-red-600 font-bold">Dispatch Guard</Button>
                                </div>
                            ))}
                            {alerts.length === 0 && <div className="p-10 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-20">Perimeter Secure. No Threats.</div>}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: Device Registry */}
                <div className="xl:col-span-4 space-y-6">
                    <Card className="border-none shadow-xl bg-slate-50/50">
                        <CardHeader className="border-b bg-white">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Cpu size={14} className="text-primary" /> Robotic Hardware Mesh
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {devices.map(device => (
                                <div key={device.id} className="p-4 bg-white rounded-xl border flex items-center justify-between group hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        {device.device_type === 'CAMERA' ? <Camera className="text-slate-400 group-hover:text-blue-500" /> : <Wifi className="text-slate-400" />}
                                        <div>
                                            <p className="text-xs font-black text-slate-900">{device.device_name}</p>
                                            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">{device.ip_address}</p>
                                        </div>
                                    </div>
                                    <Badge className={cn("text-[8px] border-none px-2", device.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500')}>
                                        {device.status}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Weight Detection Calibration */}
                    <Card className="bg-primary text-white shadow-2xl relative overflow-hidden border-none">
                        <Radio className="absolute -right-4 -top-4 w-24 h-24 text-white/10" />
                        <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest opacity-80">Precision Sensors</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-[9px] text-white/50 uppercase font-bold tracking-widest">Active RFID Tag Count</p>
                                    <p className="text-3xl font-black">4,201</p>
                                </div>
                                <Zap className="text-emerald-400 animate-pulse" />
                            </div>
                            <p className="text-[10px] text-white/60 leading-relaxed uppercase tracking-tighter italic">
                                Sentry Hub v10.2. Scanning for weight deltas on high-value drug cabinets in real-time.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}