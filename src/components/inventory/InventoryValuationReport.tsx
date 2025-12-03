'use client';

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, TrendingUp } from "lucide-react";

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
  currencyCode: string; // Dynamic from DB (e.g. 'UGX')
  locale: string;       // Dynamic from DB (e.g. 'en-UG')
}

export default function InventoryValuationReport({ 
  data, 
  currencyCode, 
  locale 
}: InventoryValuationReportProps) {

  // 1. Enterprise Currency Formatter
  // Uses the browser's native Internationalization API for perfect formatting
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (e) {
      // Fallback if locale/currency code is invalid in DB
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale).format(num);
  };

  // 2. Real-time Totals Calculation
  const totalAssetValue = useMemo(() => 
    data.reduce((sum, row) => sum + row.totalValue, 0), 
  [data]);

  const totalItems = useMemo(() => 
    data.reduce((sum, row) => sum + row.stockQuantity, 0), 
  [data]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAssetValue)}</div>
            <p className="text-xs text-muted-foreground">
              Across {data.length} distinct SKUs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalItems)}</div>
            <p className="text-xs text-muted-foreground">
              Physical units on hand
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyCode}</div>
            <p className="text-xs text-muted-foreground">
              Locale: {locale}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Detailed Valuation</CardTitle>
          <CardDescription>
            Cost basis calculated using Moving Average method.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="mb-2 h-6 w-6" />
                        <p>No inventory data found for this entity.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.productName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {row.sku}
                      </TableCell>
                      <TableCell>{row.warehouseName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(row.stockQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono">
                        {formatCurrency(row.unitCost)}
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {formatCurrency(row.totalValue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}