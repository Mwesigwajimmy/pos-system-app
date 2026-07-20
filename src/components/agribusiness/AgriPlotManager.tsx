'use client';

/**
 * --- BBU1 AGRI-PLOT GEOSPATIAL MANAGER ---
 * VERSION: v1.0 OMEGA (LAND SOVEREIGNTY)
 * Use: Deep management of land assets and plot utilization.
 * Logic: Linked to agri_land_plots and agri_production_batches.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
    Map as MapIcon, 
    Navigation, 
    ThermometerSun, 
    Layers, 
    Sprout, 
    Tractor, 
    Activity,
    ShieldCheck,
    Plus,
    Maximize2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function AgriPlotManager({ businessId }: { businessId: string }) {
    const supabase = createClient();

    const { data: plots, isLoading } = useQuery({
        queryKey: ['agri_plots', businessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('agri_land_plots')
                .select('*, agri_production_batches(*)')
                .eq('business_id', businessId);
            if (error) throw error;
            return data;
        }
    });

    return (
        <div className="space-y-8">
            {/* --- PLOT GRID OVERVIEW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plots?.map((plot) => (
                    <Card key={plot.id} className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all group">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <MapIcon size={24} />
                                </div>
                                <Badge className={cn(
                                    "px-3 py-1 font-black text-[9px] uppercase border-none",
                                    plot.current_status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                )}>
                                    {plot.current_status}
                                </Badge>
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{plot.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Maximize2 size={10} /> {plot.acreage} Acres • {plot.soil_type || 'Loamy'} Soil
                                </p>
                            </div>

                            <div className="pt-2 border-t border-slate-50">
                                {plot.agri_production_batches?.[0] ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">Current Crop</span>
                                            <span className="text-emerald-600">{plot.agri_production_batches[0].variety_breed}</span>
                                        </div>
                                        <Progress value={65} className="h-1.5 bg-slate-100" />
                                    </div>
                                ) : (
                                    <div className="py-2 italic text-xs text-slate-400">Plot currently resting...</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                <Button variant="outline" className="h-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-[2rem] hover:bg-emerald-50 hover:border-emerald-200 group transition-all">
                    <div className="flex flex-col items-center gap-3">
                        <Plus className="text-slate-300 group-hover:text-emerald-500" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-600">Annex New Acreage</span>
                    </div>
                </Button>
            </div>

            {/* --- FORENSIC PLOT TABLE --- */}
            <Card className="border-none shadow-3xl bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                <Activity className="text-emerald-400" /> Land Utilization Ledger
                            </CardTitle>
                            <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">Precision Spatial Tracking</p>
                        </div>
                        <Button className="bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl h-11 px-6">
                            Export Land Audit
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow className="h-14 border-slate-100">
                                <TableHead className="pl-8 font-black uppercase text-[10px] text-slate-500 tracking-widest">Plot Identity</TableHead>
                                <TableHead className="font-black uppercase text-[10px] text-slate-500 tracking-widest">GPS Fix</TableHead>
                                <TableHead className="font-black uppercase text-[10px] text-slate-500 tracking-widest text-center">Health Status</TableHead>
                                <TableHead className="text-right pr-8 font-black uppercase text-[10px] text-slate-500 tracking-widest">Forensic Valuation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plots?.map((plot) => (
                                <TableRow key={plot.id} className="h-20 border-slate-50 hover:bg-slate-50 transition-colors">
                                    <TableCell className="pl-8 font-bold text-slate-900">{plot.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-lg w-fit">
                                            <Navigation size={12} /> {plot.gps_coordinates?.x || '0.00'}, {plot.gps_coordinates?.y || '0.00'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 rounded-md font-bold px-3 py-1">
                                            <ShieldCheck size={12} className="mr-1.5" /> SOIL OPTIMAL
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-8 font-mono font-black text-slate-900">
                                        UGX 14,200,000
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}