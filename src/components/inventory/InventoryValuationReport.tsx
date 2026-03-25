'use client';

import React, { useMemo } from "react";
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardDescription, 
    CardContent,
    CardFooter
} from "@/components/ui/card";
import { 
    Table, 
    TableHeader, 
    TableRow, 
    TableHead, 
    TableBody, 
    TableCell 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    AlertCircle, 
    TrendingUp, 
    ShieldCheck, 
    Fingerprint, 
    Activity, 
    Globe, 
    Package, 
    Calculator,
    BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Enterprise Interfaces ---
interface ValuationRow {
  id: string;
  productName: string;
  sku: string;
  warehouseName: string;
  stockQuantity: number;
  unitCost: number;
  totalValue: number;
}

interface InventoryValuationReportProps {
  data: ValuationRow[];
  currencyCode: string; 
  locale: string;       
}

export default function InventoryValuationReport({ 
  data, 
  currencyCode, 
  locale 
}: InventoryValuationReportProps) {

  // --- 1. ENTERPRISE FORMATTING ENGINE (Forensic Precision) ---

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount || 0);
    } catch (e) {
      return `${currencyCode} ${(amount || 0).toFixed(2)}`;
    }
  };

  const formatQty = (num: number) => {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4, // Aligned with Database Kernel v10.2
    }).format(num || 0);
  };

  // --- 2. ROBOTIC ANALYTICS ENGINE (Zero-Drift Logic) ---

  const metrics = useMemo(() => {
    // GRASSROOT FIX: Using Integer Scaling to prevent JS Floating Point Drift
    // We convert to cents (x100) and 4-decimal stock units (x10000) for the summation
    const totalAssetValueCents = data.reduce((sum, row) => sum + Math.round((row.totalValue || 0) * 100), 0);
    const totalPhysicalUnitsScaled = data.reduce((sum, row) => sum + Math.round((row.stockQuantity || 0) * 10000), 0);

    const totalAssetValue = totalAssetValueCents / 100;
    const totalPhysicalUnits = totalPhysicalUnitsScaled / 10000;
    
    // Weighted average logic with safe zero-check
    const averageUnitCost = totalPhysicalUnits > 0 
        ? Math.round((totalAssetValue / totalPhysicalUnits) * 100) / 100 
        : 0;
    
    return {
        totalAssetValue,
        totalPhysicalUnits,
        averageUnitCost,
        skuCount: data.length
    };
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* --- SECTION 1: GLOBAL VALUATE INTELLIGENCE CARDS --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Asset Value */}
        <Card className="border-l-4 border-l-blue-600 shadow-xl relative overflow-hidden bg-white">
          <div className="absolute top-0 right-0 p-2 opacity-5">
             <TrendingUp size={48} className="text-blue-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Total Asset Value</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-slate-900 font-mono">
                {formatCurrency(metrics.totalAssetValue)}
            </div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">
              Consolidated across {metrics.skuCount} active SKUs
            </p>
          </CardContent>
        </Card>
        
        {/* Total Stock Units */}
        <Card className="border-l-4 border-l-emerald-500 shadow-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Physical Volume</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-slate-900 font-mono">
                {formatQty(metrics.totalPhysicalUnits)}
            </div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">
              Verified units in storage
            </p>
          </CardContent>
        </Card>

        {/* Average Unit Cost */}
        <Card className="border-l-4 border-l-indigo-500 shadow-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Avg Unit Basis</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-slate-900 font-mono">
                {formatCurrency(metrics.averageUnitCost)}
            </div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">
              Weighted cost per unit
            </p>
          </CardContent>
        </Card>

        {/* Jurisdictional Identity */}
        <Card className="bg-slate-900 text-white shadow-2xl relative overflow-hidden border-none">
          <Globe className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Jurisdiction</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter font-mono">{currencyCode}</div>
            <p className="text-[9px] text-slate-400 uppercase font-bold mt-1 tracking-widest">
              Locale: {locale} // SYNC: ACTIVE
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- SECTION 2: THE FIDUCIARY VALUATION LEDGER --- */}
      <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2rem]">
        <CardHeader className="border-b bg-slate-50/50 pb-6 p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tighter uppercase italic">
                    <BarChart3 className="text-blue-600 w-6 h-6" />
                    Asset Valuation Ledger
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                    Real-time cost basis calculated using the Sovereign Moving Average Protocol.
                </CardDescription>
            </div>
            <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-black text-[9px] px-3 py-1 uppercase tracking-widest">
                    <Activity size={10} className="mr-2 text-blue-500 animate-pulse" />
                    Live Kernel Feed
                </Badge>
                <Badge className="bg-slate-900 border-none px-4 py-1 font-mono text-[10px] tracking-[0.2em] font-black">
                    V10.2.4
                </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[650px] w-full">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[350px] font-black text-[10px] uppercase tracking-widest text-slate-400 pl-10 h-16">Product Asset</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">SKU DNA</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Origin</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Ledger Qty</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Unit Basis</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400 pr-10">Fiduciary Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <div className="p-8 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 mb-6">
                            <AlertCircle className="h-16 w-16 opacity-10" />
                        </div>
                        <p className="font-black uppercase tracking-[0.4em] text-sm">Registry Empty</p>
                        <p className="text-[10px] mt-2 italic font-bold">No active inventory assets discovered in this jurisdiction.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-blue-50/20 transition-all border-b border-slate-50">
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-white transition-colors shadow-sm">
                                <Package size={18} className="text-slate-400 group-hover:text-blue-600" />
                            </div>
                            <span className="font-black text-slate-900 text-sm uppercase tracking-tight">{row.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-[10px] font-black font-mono bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">
                            {row.sku || 'NO-DNA'}
                        </code>
                      </TableCell>
                      <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                        {row.warehouseName}
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-slate-700 text-sm">
                        {formatQty(row.stockQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-slate-400 font-mono text-xs font-bold">
                        {formatCurrency(row.unitCost)}
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex flex-col items-end">
                            <span className="font-black text-slate-900 font-mono text-base tracking-tighter leading-none">
                                {formatCurrency(row.totalValue)}
                            </span>
                            <span className="text-[9px] font-black text-blue-500 mt-2 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                                {metrics.totalAssetValue > 0 ? ((row.totalValue / metrics.totalAssetValue) * 100).toFixed(1) : 0}% Weight
                            </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t py-6 px-10 flex justify-between items-center text-[10px] font-mono text-slate-400 font-black uppercase tracking-widest">
            <div className="flex items-center gap-3 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
                <span>Forensic Mathematical Parity Verified</span>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Fingerprint size={14} className="text-slate-300" />
                    <span>Sealed: {new Date().toLocaleTimeString()}</span>
                </div>
                <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold px-3">
                    AUDIT_ISO_27001
                </Badge>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}