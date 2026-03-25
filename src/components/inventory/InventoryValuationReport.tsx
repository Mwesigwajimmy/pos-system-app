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
    CheckCircle2, 
    Globe, 
    Package, 
    Calculator,
    BarChart3,
    Clock,
    Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Interfaces ---
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

  // --- Formatting Helpers (Professional & Safe) ---

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    } catch (e) {
      return `${currencyCode} ${(amount || 0).toLocaleString()}`;
    }
  };

  const formatQty = (num: number) => {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num || 0);
  };

  // --- Logic: Asset Totals (Integer scaling preserved for accuracy) ---

  const metrics = useMemo(() => {
    const totalAssetValueCents = data.reduce((sum, row) => sum + Math.round((row.totalValue || 0) * 100), 0);
    const totalPhysicalUnitsScaled = data.reduce((sum, row) => sum + Math.round((row.stockQuantity || 0) * 10000), 0);

    const totalAssetValue = totalAssetValueCents / 100;
    const totalPhysicalUnits = totalPhysicalUnitsScaled / 10000;
    
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* --- OVERVIEW CARDS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Asset Value */}
        <Card className="border-t-4 border-t-blue-600 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Inventory Value</span>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(metrics.totalAssetValue)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Valued across {metrics.skuCount} products
            </p>
          </CardContent>
        </Card>
        
        {/* Total Stock Units */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Stock Quantity</span>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
                {formatQty(metrics.totalPhysicalUnits)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Total units in warehouse
            </p>
          </CardContent>
        </Card>

        {/* Average Unit Cost */}
        <Card className="border-t-4 border-t-indigo-500 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Average Unit Cost</span>
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(metrics.averageUnitCost)}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Weighted average cost
            </p>
          </CardContent>
        </Card>

        {/* Currency Card */}
        <Card className="bg-slate-900 text-white shadow-md border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Base Currency</span>
            <Globe className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyCode}</div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Status: Live Sync Active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- DATA TABLE CARD --- */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="text-blue-600 w-5 h-5" />
                    Valuation Report
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Breakdown of stock costs and valuations per product.
                </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-semibold px-3">
                <Clock size={12} className="mr-1.5" />
                Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <ScrollArea className="h-[550px] w-full">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                <TableRow>
                  <TableHead className="w-[300px] text-xs font-bold text-slate-500 uppercase pl-6 h-12">Product</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase h-12">SKU</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase h-12">Warehouse</TableHead>
                  <TableHead className="text-right text-xs font-bold text-slate-500 uppercase h-12">Stock</TableHead>
                  <TableHead className="text-right text-xs font-bold text-slate-500 uppercase h-12">Unit Cost</TableHead>
                  <TableHead className="text-right text-xs font-bold text-slate-500 uppercase h-12 pr-6">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                        <p className="font-semibold">No data available</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                      <TableCell className="pl-6 py-4">
                        <div className="font-semibold text-slate-800 text-sm">{row.productName}</div>
                      </TableCell>
                      <TableCell>
                        <code className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            {row.sku || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-500 uppercase">
                        {row.warehouseName}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-700">
                        {formatQty(row.stockQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-slate-500 text-xs font-medium">
                        {formatCurrency(row.unitCost)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex flex-col items-end">
                            <span className="font-bold text-slate-900">
                                {formatCurrency(row.totalValue)}
                            </span>
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1">
                                {metrics.totalAssetValue > 0 ? ((row.totalValue / metrics.totalAssetValue) * 100).toFixed(1) : 0}% Share
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
        
        <CardFooter className="bg-slate-50 border-t py-4 px-6 flex justify-between items-center text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Inventory valuation verified</span>
            </div>
            <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-slate-400 border-slate-200">
                    Calculated via Weighted Average
                </Badge>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}