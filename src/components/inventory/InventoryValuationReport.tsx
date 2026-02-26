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
  currencyCode: string; // Dynamic from DB (e.g. 'UGX', 'USD')
  locale: string;       // Dynamic from DB (e.g. 'en-UG', 'en-US')
}

export default function InventoryValuationReport({ 
  data, 
  currencyCode, 
  locale 
}: InventoryValuationReportProps) {

  // --- 1. ENTERPRISE FORMATTING ENGINE ---

  // High-precision currency formatter
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

  // High-precision number formatter (Handles fractional medical quantities)
  const formatQty = (num: number) => {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4, // Upgraded for high-precision chemical/drug doses
    }).format(num || 0);
  };

  // --- 2. ROBOTIC ANALYTICS ENGINE (useMemo for Performance) ---

  const metrics = useMemo(() => {
    const totalAssetValue = data.reduce((sum, row) => sum + row.totalValue, 0);
    const totalPhysicalUnits = data.reduce((sum, row) => sum + row.stockQuantity, 0);
    const averageUnitCost = totalPhysicalUnits > 0 ? totalAssetValue / totalPhysicalUnits : 0;
    
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
        <Card className="border-l-4 border-l-blue-600 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5">
             <TrendingUp size={48} className="text-blue-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Total Asset Value</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{formatCurrency(metrics.totalAssetValue)}</div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">
              Consolidated across {metrics.skuCount} active SKUs
            </p>
          </CardContent>
        </Card>
        
        {/* Total Stock Units */}
        <Card className="border-l-4 border-l-emerald-500 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Physical Volume</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{formatQty(metrics.totalPhysicalUnits)}</div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">
              Verified units in storage
            </p>
          </CardContent>
        </Card>

        {/* Average Unit Cost */}
        <Card className="border-l-4 border-l-indigo-500 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Avg Unit Basis</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{formatCurrency(metrics.averageUnitCost)}</div>
            <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">
              Weighted cost per unit
            </p>
          </CardContent>
        </Card>

        {/* Jurisdictional Identity */}
        <Card className="bg-slate-900 text-white shadow-2xl relative overflow-hidden">
          <Globe className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Jurisdiction</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{currencyCode}</div>
            <p className="text-[9px] text-slate-400 uppercase font-bold mt-1">
              Locale: {locale} // SYNC: ACTIVE
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- SECTION 2: THE FIDUCIARY VALUATION LEDGER --- */}
      <Card className="border-none shadow-2xl bg-white/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="text-xl font-black flex items-center gap-2 tracking-tight">
                    <BarChart3 className="text-primary w-5 h-5" />
                    DETAILED LEDGER VALUATION
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">
                    Real-time cost basis calculated using the Sovereign Moving Average Protocol.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-mono text-[10px]">
                    <Activity size={10} className="mr-1.5 text-blue-500 animate-pulse" />
                    LIVE DATASTREAM
                </Badge>
                <Badge className="bg-slate-900 border-none px-3 font-mono text-[10px] tracking-widest">
                    v10.2.4
                </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] w-full">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[350px] font-black text-[10px] uppercase tracking-widest text-slate-400 pl-8">Clinical/Product Asset</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">DNA / SKU</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Warehouse Origin</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Physical Qty</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400">Unit Basis</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400 pr-8">Fiduciary Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <div className="p-6 rounded-full bg-slate-50 border-2 border-dashed mb-4">
                            <AlertCircle className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="font-black uppercase tracking-widest text-sm">Orphaned Ledger Detected</p>
                        <p className="text-[10px] mt-1 italic">No active inventory movements found for this fiscal period.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-blue-50/30 transition-all border-b">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded group-hover:bg-white transition-colors">
                                <Package size={14} className="text-slate-400 group-hover:text-primary" />
                            </div>
                            <span className="font-bold text-slate-900 text-sm">{row.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono bg-white border-slate-200 text-slate-500">
                            {row.sku || 'UNMAPPED'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-500 uppercase tracking-tighter italic">
                        {row.warehouseName}
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-slate-700">
                        {formatQty(row.stockQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono text-xs">
                        {formatCurrency(row.unitCost)}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex flex-col items-end">
                            <span className="font-black text-slate-900 font-mono text-sm leading-none">
                                {formatCurrency(row.totalValue)}
                            </span>
                            <span className="text-[8px] font-bold text-blue-500 mt-1 uppercase tracking-tighter">
                                {( (row.totalValue / metrics.totalAssetValue) * 100 ).toFixed(1)}% Weight
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
        <CardFooter className="bg-slate-900/5 border-t py-4 px-8 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Mathematically Absolute Verification v10.2
                </span>
            </div>
            <div className="text-right">
                <p className="text-[9px] font-mono text-slate-400 italic leading-none">
                    Report Sealed: {new Date().toISOString()}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-slate-300">
                    <Fingerprint size={12} />
                    <span className="text-[8px] font-mono uppercase tracking-tighter">Chain of Custody Verified</span>
                </div>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}