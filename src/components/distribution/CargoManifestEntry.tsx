'use client';

import React, { useState } from 'react';
import { 
  Ship, 
  Plane, 
  Truck, 
  Globe, 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Anchor, 
  Landmark, 
  CheckCircle2, 
  RefreshCw,
  Box, 
  Info, 
  MapPin, 
  ClipboardList,
  AlertCircle,
  FileSpreadsheet,
  ShieldCheck, // FIXED: Added missing import to resolve ReferenceError
  Globe2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CargoManifestEntry() {
    const [items, setItems] = useState<any[]>([]);
    const [shipmentType, setShipmentType] = useState('IMPORT');

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), description: '', hsCode: '', weight: 0, value: 0 }]);
    };

    return (
        <div className="p-6 md:p-10 space-y-8 bg-[#F8FAFC] min-h-screen animate-in fade-in duration-500">
            
            {/* --- TOP HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-lg shadow-sm">
                            <Ship className="text-white w-7 h-7" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            Cargo Manifest Management
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium ml-1">
                        Systemized registry for international trade and customs synchronization.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={shipmentType} onValueChange={setShipmentType}>
                        <SelectTrigger className="w-44 h-10 bg-white border-slate-200 font-bold text-slate-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="IMPORT" className="font-semibold">Import (Entry)</SelectItem>
                            <SelectItem value="EXPORT" className="font-semibold">Export (Exit)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* --- PRIMARY SHIPMENT DETAILS --- */}
            <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-600">
                        <Anchor size={16} className="text-blue-600" /> General Consignment Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Bill of Lading / AWB No.</Label>
                        <Input className="h-10 border-slate-200 font-mono font-semibold uppercase" placeholder="e.g. MSKU9928110" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Origin Jurisdiction</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-3 text-slate-400" size={14} />
                            <Input className="h-10 pl-9 border-slate-200 font-semibold" placeholder="e.g. United Arab Emirates" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Designated Port</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                            <Input className="h-10 pl-9 border-slate-200 font-semibold" placeholder="e.g. Mombasa (KE)" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Transport Mode</Label>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 h-10 border-slate-200 bg-slate-50 hover:bg-white transition-colors" title="Sea"><Ship size={16} className="text-blue-600"/></Button>
                            <Button variant="outline" className="flex-1 h-10 border-slate-200 bg-slate-50 hover:bg-white transition-colors" title="Air"><Plane size={16}/></Button>
                            <Button variant="outline" className="flex-1 h-10 border-slate-200 bg-slate-50 hover:bg-white transition-colors" title="Land"><Truck size={16}/></Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- COST & IDENTIFICATION METRICS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. SHIPPING COSTS */}
                <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 p-5 flex flex-row items-center gap-2">
                        <ClipboardList size={16} className="text-blue-600" />
                        <CardTitle className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Logistics Cost Center (USD)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-400">Total Freight</Label><Input type="number" className="h-10 border-slate-200 font-bold" placeholder="0.00" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-400">Insurance Value</Label><Input type="number" className="h-10 border-slate-200 font-bold" placeholder="0.00" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-400">Handling Fees</Label><Input type="number" className="h-10 border-slate-200 font-bold" placeholder="0.00" /></div>
                    </CardContent>
                </Card>

                {/* 2. UNIT IDENTIFICATION */}
                <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 p-5 flex flex-row items-center gap-2">
                        <Box size={16} className="text-blue-600" />
                        <CardTitle className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Tracking & Weight</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-400">Container Number</Label><Input className="h-10 border-slate-200 font-mono font-bold text-blue-600" placeholder="e.g. MSKU 123456" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-400">Seal Reference</Label><Input className="h-10 border-slate-200 font-mono font-bold" placeholder="S-99281" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-400">Gross Weight (KG)</Label><Input type="number" className="h-10 border-slate-200 font-bold" placeholder="0.00" /></div>
                    </CardContent>
                </Card>

                {/* 3. TAX & VALUE ESTIMATION SUMMARY */}
                <Card className="bg-slate-900 border-none shadow-lg rounded-xl p-8 flex flex-col justify-between text-white relative overflow-hidden">
                    <Globe2 size={100} className="absolute -right-4 -top-4 text-blue-500 opacity-5 rotate-12" />
                    <div className="space-y-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-blue-400 tracking-widest">Estimated CIF Base</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl font-bold tracking-tight">$14,500.00</span>
                                <span className="text-xs font-semibold text-slate-500">USD</span>
                            </div>
                        </div>
                        <div className="h-px bg-white/10 w-full" />
                        <div>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={14}/> Projected Tax Liability
                            </p>
                            <p className="text-2xl font-bold mt-1">UGX 9,657,000</p>
                            <div className="flex items-start gap-2 mt-4 p-3 bg-white/5 rounded-lg border border-white/5">
                                <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                                    "Estimated value calculated using standard jurisdictional tariff rules."
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* --- LINE ITEM CONTENT --- */}
            <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-900">
                            <FileSpreadsheet size={16} className="text-blue-600" /> Declared Cargo Items
                        </CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-500 mt-1">Itemized list of goods for customs declaration.</CardDescription>
                    </div>
                    <Button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-6 rounded-lg shadow-sm">
                        <Plus className="mr-2" size={16} /> Add Line
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="text-[10px] font-bold uppercase pl-8 h-12">Item Details (HS Code / Desc)</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-center h-12">Net Weight (KG)</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-right h-12">FOB Value (USD)</TableHead>
                                    <TableHead className="w-20"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center text-slate-400 font-medium italic">
                                            No items registered. Click "Add Line" to begin entry.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => (
                                        <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="pl-8 py-5">
                                                <div className="flex gap-4 max-w-xl">
                                                    <Input className="w-32 h-10 font-mono font-bold text-blue-600 bg-slate-50 border-slate-200" placeholder="HS CODE" />
                                                    <Input className="flex-1 h-10 font-semibold bg-white border-slate-200" placeholder="Goods Description..." />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" className="w-32 mx-auto h-10 text-center font-bold border-slate-200" placeholder="0.00" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400">$</span>
                                                    <Input type="number" className="w-40 h-10 text-right font-bold border-slate-200" placeholder="0.00" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-8 text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-600 transition-colors">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* --- FINAL ACTIONS --- */}
            <div className="flex flex-col lg:flex-row justify-between items-center bg-white border border-slate-200 p-8 rounded-xl shadow-sm gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-full">
                        <CheckCircle2 size={24} className="text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">System Status</p>
                        <p className="text-sm font-bold text-slate-900 mt-1 uppercase">Ready for Validation</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <Button variant="outline" className="flex-1 lg:flex-none h-11 px-8 border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider hover:bg-slate-50 transition-all">
                        <RefreshCw className="mr-2" size={14} /> Save Draft
                    </Button>
                    <Button className="flex-1 lg:flex-none h-11 px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[11px] tracking-widest shadow-md transition-all active:scale-95">
                        <Save className="mr-2" size={16} /> Finalize Manifest
                    </Button>
                </div>
            </div>

            {/* Global system status footer */}
            <div className="text-center py-6 opacity-30">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] flex items-center justify-center gap-2">
                   <Landmark size={12} /> System Node: Global Compliance Standard
                </p>
            </div>
        </div>
    );
}