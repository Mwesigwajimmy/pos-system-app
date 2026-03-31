'use client';

import React, { useState } from 'react';
import { 
  Ship, Plane, Truck, Globe, 
  FileText, Plus, Trash2, Save, 
  Anchor, Landmark, ShieldCheck, RefreshCcw,
  Container, ShieldAlert, BadgeDollarSign,
  Scale, Box, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen animate-in fade-in duration-700">
            {/* --- TOP HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3 italic uppercase">
                        Global <span className="text-blue-600">Cargo Manifest</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                        Registry for International Trade & ASYCUDA Synchronization
                    </p>
                </div>
                <div className="flex gap-4">
                    <Select value={shipmentType} onValueChange={setShipmentType}>
                        <SelectTrigger className="w-40 h-12 bg-slate-950 text-white border-none rounded-xl font-black uppercase text-[10px] tracking-widest">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="IMPORT">IMPORT (Entry)</SelectItem>
                            <SelectItem value="EXPORT">EXPORT (Exit)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* --- SHIPMENT MASTER DETAILS --- */}
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-slate-950 text-white p-8">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-blue-400">
                        <Anchor size={18} /> Primary Consignment Data
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Master B/L or AWB No.</Label>
                        <Input className="h-12 rounded-xl bg-slate-50 font-mono font-bold" placeholder="e.g. MSKU9928110" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Origin Country</Label>
                        <Input className="h-12 rounded-xl bg-slate-50 font-bold" placeholder="e.g. United Arab Emirates" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Port of Entry/Exit</Label>
                        <Input className="h-12 rounded-xl bg-slate-50 font-bold" placeholder="e.g. Mombasa (KE) / Entebbe (UG)" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mode of Transport</Label>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200"><Ship size={18}/></Button>
                            <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200"><Plane size={18}/></Button>
                            <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200"><Truck size={18}/></Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- NEW: FIDUCIARY COST STACK & IDENTIFICATION --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. SHIPPING COSTS */}
                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-100">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center gap-2">
                        <BadgeDollarSign size={16} className="text-blue-600" />
                        <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Shipping Cost Stack (USD)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-5">
                        <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-500">Ocean / Air Freight</Label><Input type="number" className="h-11 rounded-xl bg-slate-50 font-black" placeholder="0.00" /></div>
                        <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-500">Insurance Premium</Label><Input type="number" className="h-11 rounded-xl bg-slate-50 font-black" placeholder="0.00" /></div>
                        <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-500">Other Terminal Handling</Label><Input type="number" className="h-11 rounded-xl bg-slate-50 font-black" placeholder="0.00" /></div>
                    </CardContent>
                </Card>

                {/* 2. UNIT IDENTIFICATION */}
                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-100">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center gap-2">
                        <Box size={16} className="text-blue-600" />
                        <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargo Identification</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-5">
                        <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-500">Container Number</Label><Input className="h-11 rounded-xl bg-slate-50 font-mono font-black text-blue-600" placeholder="MSKU 123456-7" /></div>
                        <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-500">Customs Seal Number</Label><Input className="h-11 rounded-xl bg-slate-50 font-mono font-black" placeholder="S-99281" /></div>
                        <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-slate-500">Total Gross Weight (KG)</Label><Input type="number" className="h-11 rounded-xl bg-slate-50 font-black" placeholder="0.00" /></div>
                    </CardContent>
                </Card>

                {/* 3. AURA FORENSIC PRE-AUDIT SUMMARY */}
                <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Landmark size={150} /></div>
                    <div className="space-y-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">CIF Base Calculation</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-4xl font-black tracking-tighter">$14,500.00</span>
                                <span className="text-xs font-bold text-slate-500 uppercase">USD</span>
                            </div>
                        </div>
                        <div className="h-px bg-white/10 w-full" />
                        <div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={12}/> Est. Statutory Liability
                            </p>
                            <p className="text-2xl font-black mt-1">UGX 9,657,000</p>
                            <div className="flex items-center gap-2 mt-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                <Info size={14} className="text-blue-400" />
                                <p className="text-[9px] text-slate-400 leading-relaxed italic">
                                    "Computed via Sovereign Tax Engine using current Tariff rules."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LINE ITEM CONTENT --- */}
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 p-8 flex flex-row justify-between items-center">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-900">
                        <FileText size={18} className="text-blue-600" /> Declared Cargo Items
                    </CardTitle>
                    <Button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase rounded-xl px-6">
                        <Plus className="mr-2" size={14} /> Add Cargo Line
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="border-none">
                                <TableHead className="text-[10px] font-black uppercase py-6 pl-10">HS Code / Description</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-center">Net Weight (KG)</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">FOB Value (USD)</TableHead>
                                <TableHead className="w-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center text-slate-400 font-medium italic">
                                        No items registered. Click "Add Cargo Line" to start inputting manifest data.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="pl-10 py-6">
                                            <div className="flex gap-4">
                                                <Input className="w-32 h-10 font-mono font-black text-blue-600 bg-blue-50 border-none" placeholder="HS CODE" />
                                                <Input className="flex-1 h-10 font-bold bg-transparent border-slate-200" placeholder="Goods Description..." />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" className="w-32 mx-auto h-10 text-center font-black rounded-lg" placeholder="0.00" />
                                        </TableCell>
                                        <TableCell className="text-right pr-10">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-[10px] font-black text-slate-400">$</span>
                                                <Input type="number" className="w-40 h-10 text-right font-black rounded-lg" placeholder="0.00" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-10">
                                            <Button variant="ghost" size="icon" onClick={() => setItems(items.filter(i => i.id !== item.id))}>
                                                <Trash2 size={16} className="text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* --- FINAL ACTIONS --- */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-8 rounded-[2rem] shadow-2xl text-white relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-2 bg-blue-600" />
                <div className="flex items-center gap-6 mb-6 md:mb-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compliance Status</span>
                        <div className="flex items-center gap-2 text-emerald-400 mt-1 font-black">
                            <ShieldCheck size={16} /> AURA-CFO AUDIT READY
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <Button className="flex-1 md:flex-none h-16 px-10 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl border border-white/10">
                        <RefreshCcw className="mr-2" size={16} /> Save as Draft
                    </Button>
                    <Button className="flex-1 md:flex-none h-16 px-16 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-2xl shadow-blue-600/30 active:scale-95 transition-all">
                        Finalize & Push to Customs
                    </Button>
                </div>
            </div>
        </div>
    );
}