'use client';

import React from 'react';
import { 
  Route, Timer, Fuel, AlertTriangle, 
  MapPin, CheckCircle2, Navigation, TrendingDown 
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Mock Data structure for the Sovereign Route Audit
const ROUTE_AUDIT_DATA = [
    {
        id: "RT-7742-KLA",
        driver: "John S.",
        route: "Kampala → Jinja",
        fuelEfficiency: "92%",
        timeVariance: "-12m", // Ahead of schedule
        status: "OPTIMIZED",
        riskLevel: "LOW"
    },
    {
        id: "RT-9921-EBB",
        driver: "Sarah K.",
        route: "Kampala → Entebbe",
        fuelEfficiency: "78%",
        timeVariance: "+45m", // Delayed
        status: "DRIFT_DETECTED",
        riskLevel: "MEDIUM"
    }
];

export default function StrategicRouteAudit() {
    return (
        <div className="bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100 overflow-hidden relative">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-950 rounded-xl text-white shadow-lg shadow-slate-950/20">
                            <Navigation size={22} />
                        </div>
                        <h2 className="text-base font-black uppercase tracking-tighter text-slate-900">
                            Strategic <span className="text-blue-600">Route Audit</span>
                        </h2>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-12">
                        Operational Efficiency & Drift Monitoring
                    </p>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border border-blue-100 font-black text-[10px] px-3 py-1">
                    AI ROUTE OPTIMIZATION ACTIVE
                </Badge>
            </div>

            {/* Audit Table */}
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4">Manifest / Agent</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Route Node</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Fuel Efficiency</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Time Variance</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right">Aura Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ROUTE_AUDIT_DATA.map((row) => (
                            <TableRow key={row.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs font-black text-slate-900">{row.id}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{row.driver}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                        <MapPin size={12} className="text-blue-500" />
                                        {row.route}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={cn(
                                                    "h-full rounded-full",
                                                    parseInt(row.fuelEfficiency) > 85 ? "bg-emerald-500" : "bg-amber-500"
                                                )} 
                                                style={{ width: row.fuelEfficiency }} 
                                            />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-700">{row.fuelEfficiency}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs font-black">
                                    <span className={cn(
                                        row.timeVariance.startsWith('-') ? "text-emerald-600" : "text-red-500"
                                    )}>
                                        {row.timeVariance}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "text-[9px] font-black uppercase px-2 py-0.5",
                                            row.status === 'OPTIMIZED' ? "border-emerald-500/20 text-emerald-600 bg-emerald-50" : "border-amber-500/20 text-amber-600 bg-amber-50"
                                        )}
                                    >
                                        {row.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* AI Forensic Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-5 bg-slate-950 rounded-2xl border border-white/10 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                        <Fuel size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Fuel Forensic Alert</p>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-medium">
                            "I detected a <span className="text-white font-bold text-emerald-400">12% efficiency gain</span> on the Jinja route after switching to the northern bypass. Recommend updated dispatch protocol."
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-orange-700 tracking-widest">Operational Drift</p>
                        <p className="text-[11px] text-orange-800 mt-1 leading-relaxed font-medium">
                            "Manifest RT-9921 is experiencing high dwell time at the Nakawa node. Investigating possible traffic or loading bottleneck."
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-emerald-500" /> 
                    Live Telemetry Sync (Node L-7742)
                </div>
                <button className="text-[10px] font-black text-blue-600 uppercase hover:underline">
                    View Real-time Map
                </button>
            </div>
        </div>
    );
}