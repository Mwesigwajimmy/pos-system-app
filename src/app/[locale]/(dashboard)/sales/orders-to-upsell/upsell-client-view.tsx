'use client';

import React, { useState, useMemo } from 'react';
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  useReactTable, 
  SortingState 
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  ArrowUpDown, 
  Sparkles, 
  Mail,
  ChevronLeft,
  ChevronRight,
  History,
  Target,
  Zap,
  ShieldCheck,
  MousePointerClick,
  ArrowUpRight,
  Layers,
  Activity,
  Database,
  Search
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface UpsellOpportunity {
  order_id: string;
  order_uid: string;
  customer_name: string;
  customer_segment: string;
  total_spent_history: number;
  current_order_amount: number;
  order_date: string;
  upsell_score: number;
  potential_revenue: number;
}

interface UpsellClientViewProps {
  opportunities: UpsellOpportunity[];
  locale?: string;
  currency?: string;
}

export default function UpsellClientView({ 
  opportunities, 
  locale = 'en-US', 
  currency = 'UGX' 
}: UpsellClientViewProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'potential_revenue', desc: true }]);

  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    });
  }, [locale, currency]);

  const columns = useMemo<ColumnDef<UpsellOpportunity>[]>(() => [
    {
      accessorKey: "order_uid",
      header: "System Node",
      cell: ({ row }) => {
        const uid = String(row.getValue("order_uid") || "");
        return (
          <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-500 transition-colors" />
              <span className="font-mono text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {uid.split('-')[0] || "NODE_0"}
              </span>
          </div>
        );
      },
    },
    {
      accessorKey: "customer_name",
      header: "Identity Profile",
      cell: ({ row }) => {
        const name = String(row.getValue("customer_name") || "Anonymous");
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight">
                  {name}
              </span>
              {row.original.customer_segment === 'VIP' && (
                <Badge className="bg-blue-50 text-blue-600 border-none h-5 px-1.5 text-[9px] font-bold">
                  <ShieldCheck className="w-3 h-3 mr-1" /> VIP_STATUS
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <History className="w-3 h-3" /> 
                LTV: {currencyFormatter.format(row.original.total_spent_history || 0)}
                <span className="text-slate-200">•</span>
                <span className="text-blue-600 font-bold uppercase tracking-tight">{row.original.customer_segment || 'Standard'}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "order_date",
      header: "Temporal Context",
      cell: ({ row }) => {
        const dateStr = String(row.getValue("order_date"));
        return (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-700">
                {formatDistanceToNow(new Date(dateStr), { addSuffix: true })}
            </p>
            <Badge variant="outline" className="text-[9px] font-medium py-0 px-1.5 text-slate-400 border-slate-200 bg-slate-50">
                {currencyFormatter.format(row.original.current_order_amount || 0)} Base
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "upsell_score",
      header: ({ column }) => (
        <Button 
            variant="ghost" 
            className="-ml-4 h-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors" 
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Propensity <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = Number(row.getValue("upsell_score") || 0);
        const colorClass = score > 80 ? "bg-emerald-500" : score > 50 ? "bg-blue-500" : "bg-slate-300";
        const textClass = score > 80 ? "text-emerald-600" : score > 50 ? "text-blue-600" : "text-slate-500";
        
        return (
          <div className="w-[140px] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Score</span>
              <span className={cn("text-xs font-bold", textClass)}>{score}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    className={cn("h-full rounded-full", colorClass)} 
                />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "potential_revenue",
      header: () => <div className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Impact Forecast</div>,
      cell: ({ row }) => {
        const potential = Number(row.getValue("potential_revenue") || 0);
        return (
          <div className="text-right">
            <div className="text-sm font-bold text-emerald-600">
              +{currencyFormatter.format(potential)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Projected Uplift</div>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-blue-600 hover:text-white transition-all rounded-lg border border-slate-100 shadow-sm">
                    <Zap className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border-slate-200 shadow-xl">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 py-2">Intelligence Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-blue-50 focus:text-blue-700 py-2.5 transition-colors">
                    <Sparkles className="mr-2.5 h-4 w-4 text-blue-500" /> 
                    <span className="font-semibold text-xs">Generate Smart Pitch</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-emerald-50 focus:text-emerald-700 py-2.5 transition-colors">
                    <Mail className="mr-2.5 h-4 w-4 text-emerald-500" /> 
                    <span className="font-semibold text-xs">Send Precision Email</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-slate-100 py-2.5 transition-colors">
                    <MousePointerClick className="mr-2.5 h-4 w-4 text-slate-400" /> 
                    <span className="font-semibold text-xs text-slate-600">Review Order Details</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [currencyFormatter]);

  const table = useReactTable({
    data: opportunities,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  const totalPotential = useMemo(() => 
    opportunities.reduce((acc, curr) => acc + (curr.potential_revenue || 0), 0), 
    [opportunities]
  );

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 lg:p-10 bg-[#f8fafc] min-h-screen">
      
      {/* COMMAND HEADER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 shadow-xl shadow-blue-100 rounded-xl">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-50 text-blue-600 border-none font-bold text-[10px] tracking-widest px-2 py-0">
                  REV_ENGINE v4.2
                </Badge>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cluster Online
                </div>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-none">
                Expansion Intel
              </h2>
            </div>
          </div>
          <p className="text-slate-500 font-medium max-w-xl text-sm leading-relaxed border-l-4 border-blue-100 pl-4">
            High-velocity expansion targets identified via pattern recognition. Automated scoring prioritizes accounts with high retention propensity and uplift potential.
          </p>
        </div>
        
        {/* KPI TELEMETRY */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="hidden sm:flex bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm items-center gap-6 transition-all hover:border-blue-200">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Impact</p>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-xl font-bold text-slate-900 tracking-tight">
                            {currencyFormatter.format(totalPotential)}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </div>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Targets</p>
                    <p className="text-xl font-bold text-slate-900 leading-none">{opportunities.length}</p>
                </div>
            </div>
            <Button className="flex-1 lg:flex-none h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border-none shadow-xl font-bold uppercase tracking-wider text-xs transition-all active:scale-95">
                Bulk Execute Logic
            </Button>
        </div>
      </div>

      {/* MATRIX WORKSPACE */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-6 md:p-8 border-b border-slate-50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <Layers className="w-5 h-5 text-blue-600" />
                    Propensity Matrix
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs font-medium">
                    Identifying high-LTV customers with optimized expansion probabilities.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-[10px] uppercase bg-white shadow-sm text-blue-600">Queue</Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-[10px] uppercase text-slate-400">Processed</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-slate-50/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-slate-100">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-14 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                <AnimatePresence mode='wait'>
                    {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                        <TableRow 
                            key={row.id} 
                            className="group hover:bg-blue-50/30 transition-colors border-slate-50"
                        >
                        {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="py-5 px-8">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                        ))}
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center opacity-20">
                              <Sparkles className="w-12 h-12 mb-4" />
                              <p className="font-bold uppercase tracking-widest text-xs">No active targets identified</p>
                          </div>
                        </TableCell>
                    </TableRow>
                    )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
          
          {/* PAGINATION ENGINE */}
          <div className="flex items-center justify-between p-6 md:p-8 border-t border-slate-50 bg-slate-50/30">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Matrix Display: {table.getRowModel().rows.length} of {opportunities.length} Nodes
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-10 px-4 rounded-xl border-slate-200 font-bold text-xs active:scale-95 shadow-sm"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Prev
              </Button>
              <div className="bg-white border border-slate-200 h-10 px-4 flex items-center rounded-xl text-[11px] font-bold text-slate-700 shadow-sm font-mono">
                P{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-10 px-4 rounded-xl border-slate-200 font-bold text-xs active:scale-95 shadow-sm"
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* SYSTEM STATUS FOOTER */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-slate-900 rounded-[2rem] shadow-xl text-white/50 font-mono text-[10px] uppercase tracking-widest border-t-4 border-blue-600">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
              <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Network Secure
              </span>
              <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" /> Data Verified
              </span>
              <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-500" /> Intelligence V4.2
              </span>
          </div>
          <div className="px-5 py-2 bg-white/5 rounded-lg border border-white/10 text-white/30">
              Refresh Cluster: {new Date().toLocaleTimeString()}
          </div>
      </div>
    </div>
  );
}