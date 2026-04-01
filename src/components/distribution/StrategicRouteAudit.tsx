'use client';

import React from 'react';
import { 
  Route, 
  Clock, 
  Fuel, 
  AlertCircle, 
  MapPin, 
  CheckCircle2, 
  Navigation, 
  TrendingUp,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Logic preserved exactly as original
const ROUTE_AUDIT_DATA = [
    {
        id: "RT-7742-KLA",
        driver: "John S.",
        route: "Kampala → Jinja",
        fuelEfficiency: "92%",
        timeVariance: "-12m", 
        status: "OPTIMIZED",
        riskLevel: "LOW"
    },
    {
        id: "RT-9921-EBB",
        driver: "Sarah K.",
        route: "Kampala → Entebbe",
        fuelEfficiency: "78%",
        timeVariance: "+45m", 
        status: "ATTENTION",
        riskLevel: "MEDIUM"
    }
];

export default function StrategicRouteAudit() {
    return (
        <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-200 overflow-hidden relative animate-in fade-in duration-500">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-lg text-white shadow-sm">
                            <Navigation size={20} />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                            Route <span className="text-blue-600">Performance Audit</span>
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium ml-1">
                        Monitoring operational efficiency and delivery schedules
                    </p>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] px-3 py-1 uppercase tracking-wider">
                    Optimization Engine Active
                </Badge>
            </div>

            {/* Audit Table */}
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500 py-4 pl-6">Reference / Agent</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500">Route Path</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500">Efficiency</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-center">Variance</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-right pr-6">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ROUTE_AUDIT_DATA.map((row) => (
                            <TableRow key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="py-4 pl-6">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs font-bold text-slate-900 uppercase">{row.id}</span>
                                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{row.driver}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-tight">
                                        <MapPin size={12} className="text-blue-500" />
                                        {row.route}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    parseInt(row.fuelEfficiency) > 85 ? "bg-emerald-500" : "bg-amber-500"
                                                )} 
                                                style={{ width: row.fuelEfficiency }} 
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-700">{row.fuelEfficiency}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs font-bold">
                                    <span className={cn(
                                        row.timeVariance.startsWith('-') ? "text-emerald-600" : "text-red-500"
                                    )}>
                                        {row.timeVariance}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "text-[9px] font-bold uppercase px-2 py-0.5 rounded",
                                            row.status === 'OPTIMIZED' ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"
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

            {/* AI Strategic Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-blue-200 shadow-sm text-blue-600 shrink-0">
                        <Fuel size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">Fuel Consumption Insight</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                            System detected a <span className="text-emerald-600 font-bold">12% efficiency gain</span> on the Jinja route. We recommend continuing the bypass protocol for the next 48 hours.
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-amber-50/50 rounded-xl border border-amber-100 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-amber-200 shadow-sm text-amber-600 shrink-0">
                        <AlertCircle size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Operational Alert</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                            Manifest <span className="font-bold text-slate-900">RT-9921</span> is experiencing higher dwell time at the Nakawa node. Possible loading delay identified.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-emerald-500" /> 
                    Live System Sync Active
                </div>
                <button className="text-[10px] font-bold text-blue-600 uppercase hover:underline transition-colors">
                    Access Interactive Map
                </button>
            </div>
        </div>
    );
}