'use client';

/**
 * --- BBU1 AGRI-PLOT GEOSPATIAL MANAGER ---
 * VERSION: v2.0 OMEGA (LAND SOVEREIGNTY)
 * Use: Deep management of land assets and plot utilization.
 * Logic: Linked to agri_land_plots and agri_production_batches.
 *
 * LAYOUT / UI PASS NOTES:
 * - The original `plots` useQuery is completely untouched — same table, same columns,
 *   same join, same queryKey.
 * - "Annex New Acreage" previously had no onClick handler and there was no form anywhere
 *   in the file to register a new plot. That's the "missing field/form" this pass adds:
 *   a full Add Land Plot dialog, wired to a new (additive) useMutation that inserts into
 *   agri_land_plots. Nothing that existed before was removed or altered — only added to.
 * - Layout was rebuilt for a government/ministry audience: disciplined type scale, no
 *   all-caps overload, consistent spacing, explicit loading/empty states, fully responsive.
 */

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
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
    Maximize2,
    Loader2,
    X,
    FileCheck2,
    Landmark,
    Droplets,
    Compass
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2";

const SOIL_TYPES = ["Loamy", "Clay", "Sandy", "Silty", "Peaty", "Chalky"];
const STATUS_OPTIONS = ["active", "resting", "leased", "under_dispute", "fallow"];
const OWNERSHIP_TYPES = ["Freehold", "Leasehold", "Customary", "Mailo", "Communal"];
const IRRIGATION_TYPES = ["Rain-fed", "Drip", "Sprinkler", "Flood", "None"];
const LAND_USE_TYPES = ["Crop production", "Livestock grazing", "Agroforestry", "Mixed use", "Fallow / reserve"];

const EMPTY_FORM = {
    name: "",
    acreage: "",
    soil_type: "Loamy",
    current_status: "active",
    latitude: "",
    longitude: "",
    region: "",
    district: "",
    land_title_number: "",
    ownership_type: "Freehold",
    irrigation_type: "Rain-fed",
    land_use_type: "Crop production",
    notes: "",
};

const selectFieldClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1";

export function AgriPlotManager({ businessId }: { businessId: string }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [form, setForm] = React.useState({ ...EMPTY_FORM });

    // ORIGINAL DATA QUERY — untouched: same table, same join, same queryKey.
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

    // ADDITIVE MUTATION (new — does not alter the query above): registers a new land plot.
    // This is what the "Annex New Acreage" button now opens, since it previously had no
    // handler and there was no form anywhere to capture this data.
    const createPlotMutation = useMutation({
        mutationFn: async () => {
            if (!form.name.trim()) throw new Error("Plot name is required.");
            if (!form.acreage || Number(form.acreage) <= 0) throw new Error("A valid acreage is required.");
            if (!form.latitude || !form.longitude) throw new Error("GPS latitude and longitude are required for land audit compliance.");

            const { error } = await supabase.from('agri_land_plots').insert({
                business_id: businessId,
                name: form.name.trim(),
                acreage: Number(form.acreage),
                soil_type: form.soil_type,
                current_status: form.current_status,
                gps_coordinates: { x: Number(form.latitude), y: Number(form.longitude) },
                region: form.region.trim() || null,
                district: form.district.trim() || null,
                land_title_number: form.land_title_number.trim() || null,
                ownership_type: form.ownership_type,
                irrigation_type: form.irrigation_type,
                land_use_type: form.land_use_type,
                notes: form.notes.trim() || null,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Land plot registered successfully.");
            queryClient.invalidateQueries({ queryKey: ['agri_plots', businessId] });
            setForm({ ...EMPTY_FORM });
            setIsFormOpen(false);
        },
        onError: (err: any) => toast.error(err.message || "Could not register this plot.")
    });

    // Derived summary (client-side only, computed from the existing query result).
    const summary = React.useMemo(() => {
        const list = plots || [];
        const totalAcreage = list.reduce((sum: number, p: any) => sum + (Number(p.acreage) || 0), 0);
        const active = list.filter((p: any) => p.current_status === 'active').length;
        const resting = list.filter((p: any) => p.current_status !== 'active').length;
        return { totalPlots: list.length, totalAcreage, active, resting };
    }, [plots]);

    const updateField = (key: keyof typeof EMPTY_FORM, value: string) => setForm(prev => ({ ...prev, [key]: value }));

    return (
        <div className="space-y-8">

            {/* ============================= PAGE HEADER ============================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Land & plot management</h2>
                    <p className="text-sm text-slate-500 mt-1">Register, audit, and track utilization across all managed land assets.</p>
                </div>
                <Button
                    onClick={() => setIsFormOpen(true)}
                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
                >
                    <Plus size={16} className="mr-2" aria-hidden="true" /> Add new plot
                </Button>
            </div>

            {/* ============================= SUMMARY STRIP ============================= */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total plots", value: summary.totalPlots, icon: MapIcon },
                    { label: "Total acreage", value: `${summary.totalAcreage.toLocaleString()} ac`, icon: Maximize2 },
                    { label: "Active plots", value: summary.active, icon: Sprout },
                    { label: "Resting / inactive", value: summary.resting, icon: Layers },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <Card key={i} className="border border-slate-200 rounded-xl shadow-none">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Icon size={17} aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-slate-500 truncate">{s.label}</p>
                                    <p className="text-base font-semibold text-slate-900">{s.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ============================= PLOT GRID OVERVIEW ============================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {isLoading ? (
                    <div className="col-span-full py-16 text-center text-slate-400">
                        <Loader2 className="animate-spin inline mr-2" size={16} aria-hidden="true" />
                        <span className="text-sm font-medium">Loading registered plots…</span>
                    </div>
                ) : plots && plots.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-slate-400">
                        <MapIcon size={28} className="mx-auto mb-3" aria-hidden="true" />
                        <p className="text-sm font-medium">No land plots have been registered yet.</p>
                    </div>
                ) : (
                    plots?.map((plot: any) => (
                        <Card key={plot.id} className="border border-slate-200 rounded-xl shadow-none hover:shadow-md hover:border-emerald-300 transition-all group">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <MapIcon size={19} aria-hidden="true" />
                                    </div>
                                    <Badge className={cn(
                                        "px-2.5 py-1 font-medium text-[11px] border-none capitalize",
                                        plot.current_status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                    )}>
                                        {plot.current_status}
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-[15px] font-semibold text-slate-900 tracking-tight">{plot.name}</h3>
                                    <p className="text-[11.5px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                        <Maximize2 size={11} aria-hidden="true" /> {plot.acreage} acres · {plot.soil_type || 'Loamy'} soil
                                    </p>
                                </div>

                                <div className="pt-3 border-t border-slate-100">
                                    {plot.agri_production_batches?.[0] ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end text-[11px]">
                                                <span className="text-slate-400">Current crop</span>
                                                <span className="text-emerald-600 font-medium">{plot.agri_production_batches[0].variety_breed}</span>
                                            </div>
                                            <Progress value={65} className="h-1.5 bg-slate-100" />
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic py-1">Plot currently resting…</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}

                <button
                    onClick={() => setIsFormOpen(true)}
                    className={cn(
                        "min-h-[176px] border-2 border-dashed border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 group transition-all flex items-center justify-center",
                        FOCUS_RING
                    )}
                >
                    <div className="flex flex-col items-center gap-2.5">
                        <Plus className="text-slate-300 group-hover:text-emerald-500" size={28} aria-hidden="true" />
                        <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-600">Annex new acreage</span>
                    </div>
                </button>
            </div>

            {/* ============================= LAND UTILIZATION LEDGER ============================= */}
            <Card className="border border-slate-200 rounded-xl overflow-hidden shadow-none">
                <CardHeader className="bg-slate-900 text-white px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Activity className="text-emerald-400" size={18} aria-hidden="true" /> Land utilization ledger
                            </CardTitle>
                            <p className="text-emerald-400 text-[11px] font-medium">Precision spatial tracking</p>
                        </div>
                        <Button variant="outline" className="h-9 px-4 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg text-sm border-none w-fit">
                            Export land audit
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="h-12 border-slate-100">
                                    <TableHead className="pl-6 font-medium text-[11px] uppercase tracking-wide text-slate-500">Plot identity</TableHead>
                                    <TableHead className="font-medium text-[11px] uppercase tracking-wide text-slate-500">GPS fix</TableHead>
                                    <TableHead className="font-medium text-[11px] uppercase tracking-wide text-slate-500 text-center">Health status</TableHead>
                                    <TableHead className="text-right pr-6 font-medium text-[11px] uppercase tracking-wide text-slate-500">Forensic valuation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-sm text-slate-400">
                                            <Loader2 className="animate-spin inline mr-2" size={14} aria-hidden="true" /> Loading ledger…
                                        </TableCell>
                                    </TableRow>
                                ) : plots && plots.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-sm text-slate-400">No plots to display.</TableCell>
                                    </TableRow>
                                ) : (
                                    plots?.map((plot: any) => (
                                        <TableRow key={plot.id} className="h-16 border-slate-50 hover:bg-slate-50 transition-colors">
                                            <TableCell className="pl-6 font-medium text-slate-900 text-sm">{plot.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-xs font-mono text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md w-fit">
                                                    <Navigation size={11} aria-hidden="true" /> {plot.gps_coordinates?.x ?? '0.00'}, {plot.gps_coordinates?.y ?? '0.00'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 rounded-md font-medium px-2.5 py-1 text-[11.5px]">
                                                    <ShieldCheck size={11} className="mr-1.5" aria-hidden="true" /> Soil optimal
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-mono font-semibold text-slate-900 text-sm">
                                                UGX 14,200,000
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* ============================= ADD LAND PLOT FORM ============================= */}
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false); }}>
                <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden bg-white border border-slate-200 max-h-[90vh] overflow-y-auto text-slate-900">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                            <Landmark size={18} className="text-emerald-600" aria-hidden="true" /> Register new land plot
                        </DialogTitle>
                        <DialogDescription className="text-[13px] text-slate-500 mt-0.5">
                            All fields marked with an asterisk (*) are required for land audit compliance.
                        </DialogDescription>
                    </div>

                    <div className="px-6 py-5 space-y-7">

                        {/* SECTION: BASIC INFORMATION */}
                        <section className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Basic information</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="plot-name" className="text-[11px] font-medium text-slate-500">Plot name *</Label>
                                    <Input id="plot-name" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. Kyabakuza North Block A" className="h-10 rounded-lg border-slate-200 text-sm" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-acreage" className="text-[11px] font-medium text-slate-500">Acreage (acres) *</Label>
                                    <Input id="plot-acreage" type="number" min="0" step="0.01" value={form.acreage} onChange={e => updateField('acreage', e.target.value)} placeholder="e.g. 12.5" className="h-10 rounded-lg border-slate-200 text-sm" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-status" className="text-[11px] font-medium text-slate-500">Current status *</Label>
                                    <select id="plot-status" value={form.current_status} onChange={e => updateField('current_status', e.target.value)} className={cn(selectFieldClass, "capitalize")}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-soil" className="text-[11px] font-medium text-slate-500">Soil type</Label>
                                    <select id="plot-soil" value={form.soil_type} onChange={e => updateField('soil_type', e.target.value)} className={selectFieldClass}>
                                        {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-land-use" className="text-[11px] font-medium text-slate-500">Land use type</Label>
                                    <select id="plot-land-use" value={form.land_use_type} onChange={e => updateField('land_use_type', e.target.value)} className={selectFieldClass}>
                                        {LAND_USE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: LOCATION & GPS */}
                        <section className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                                <Compass size={13} aria-hidden="true" /> Location & GPS
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-region" className="text-[11px] font-medium text-slate-500">Region</Label>
                                    <Input id="plot-region" value={form.region} onChange={e => updateField('region', e.target.value)} placeholder="e.g. Central" className="h-10 rounded-lg border-slate-200 text-sm" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-district" className="text-[11px] font-medium text-slate-500">District</Label>
                                    <Input id="plot-district" value={form.district} onChange={e => updateField('district', e.target.value)} placeholder="e.g. Masaka" className="h-10 rounded-lg border-slate-200 text-sm" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-lat" className="text-[11px] font-medium text-slate-500">GPS latitude (X) *</Label>
                                    <Input id="plot-lat" type="number" step="0.000001" value={form.latitude} onChange={e => updateField('latitude', e.target.value)} placeholder="e.g. 0.34540" className="h-10 rounded-lg border-slate-200 text-sm font-mono" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-lng" className="text-[11px] font-medium text-slate-500">GPS longitude (Y) *</Label>
                                    <Input id="plot-lng" type="number" step="0.000001" value={form.longitude} onChange={e => updateField('longitude', e.target.value)} placeholder="e.g. 32.58250" className="h-10 rounded-lg border-slate-200 text-sm font-mono" />
                                </div>
                            </div>
                        </section>

                        {/* SECTION: TENURE & COMPLIANCE */}
                        <section className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                                <FileCheck2 size={13} aria-hidden="true" /> Tenure & compliance
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-title-no" className="text-[11px] font-medium text-slate-500">Land title / reference number</Label>
                                    <Input id="plot-title-no" value={form.land_title_number} onChange={e => updateField('land_title_number', e.target.value)} placeholder="e.g. MASAKA-BLK-0042" className="h-10 rounded-lg border-slate-200 text-sm font-mono" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="plot-ownership" className="text-[11px] font-medium text-slate-500">Ownership type</Label>
                                    <select id="plot-ownership" value={form.ownership_type} onChange={e => updateField('ownership_type', e.target.value)} className={selectFieldClass}>
                                        {OWNERSHIP_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="plot-irrigation" className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                                        <Droplets size={12} aria-hidden="true" /> Irrigation type
                                    </Label>
                                    <select id="plot-irrigation" value={form.irrigation_type} onChange={e => updateField('irrigation_type', e.target.value)} className={selectFieldClass}>
                                        {IRRIGATION_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: NOTES */}
                        <section className="space-y-1.5">
                            <Label htmlFor="plot-notes" className="text-[11px] font-medium text-slate-500">Additional notes</Label>
                            <Textarea
                                id="plot-notes"
                                value={form.notes}
                                onChange={e => updateField('notes', e.target.value)}
                                placeholder="Boundary disputes, access roads, prior land use history, etc."
                                className="min-h-[80px] rounded-lg border-slate-200 text-sm resize-none"
                            />
                        </section>
                    </div>

                    <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => { setIsFormOpen(false); setForm({ ...EMPTY_FORM }); }}
                            className="h-11 font-medium text-sm text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => createPlotMutation.mutate()}
                            disabled={createPlotMutation.isPending}
                            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm flex-1"
                        >
                            {createPlotMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mx-auto" aria-hidden="true" /> : "Register land plot"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}