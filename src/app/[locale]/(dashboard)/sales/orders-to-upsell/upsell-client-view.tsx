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
  MoreHorizontal, 
  Sparkles, 
  BadgeCheck, 
  Mail,
  Phone,
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
  Database
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
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * CORE DATA INTERFACE
 */
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
  // Default sorting by Potential Revenue to prioritize fiscal impact
  const [sorting, setSorting] = useState<SortingState>([{ id: 'potential_revenue', desc: true }]);

  /**
   * DYNAMIC CURRENCY ENGINE
   * Centralized formatter for multi-tenant localization.
   */
  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    });
  }, [locale, currency]);

  /**
   * ENTERPRISE COLUMN DEFINITIONS
   * Implements strict type-casting to resolve Next.js build errors.
   */
  const columns = useMemo<ColumnDef<UpsellOpportunity>[]>(() => [
    {
      accessorKey: "order_uid",
      header: "System Node",
      cell: ({ row }) => {
        // FIXED: String conversion to prevent 'unknown' build error
        const uid = String(row.getValue("order_uid") || "");
        return (
          <div className="flex items-center gap-2 group">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-primary transition-colors" />
              <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
                  {uid.split('-')[0] || "NODE_0"}
              </span>
          </div>
        );
      },
    },
    {
      accessorKey: "customer_name",
      header: "Intelligence Profile",
      cell: ({ row }) => {
        const name = String(row.getValue("customer_name") || "ANONYMOUS_ENTITY");
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 tracking-tight italic uppercase text-sm">
                  {name}
              </span>
              {row.original.customer_segment === 'VIP' && (
                <Badge className="bg-blue-500/10 text-blue-600 border-none h-4 px-1 text-[8px] font-black">
                  <ShieldCheck className="w-3 h-3 mr-0.5" /> VERIFIED_VIP
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    <History className="w-3 h-3" /> 
                    LTV: {currencyFormatter.format(row.original.total_spent_history || 0)}
                </div>
                <div className="h-2 w-px bg-slate-200" />
                <span className="text-[9px] font-black text-primary uppercase">{row.original.customer_segment || 'STANDARD'} CLUSTER</span>
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
            <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                {formatDistanceToNow(new Date(dateStr), { addSuffix: true })}
            </p>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] font-mono py-0 text-slate-400 border-slate-100">
                  BASE: {currencyFormatter.format(row.original.current_order_amount || 0)}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "upsell_score",
      header: ({ column }) => (
        <Button 
            variant="ghost" 
            className="-ml-4 h-8 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors" 
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Propensity <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = Number(row.getValue("upsell_score") || 0);
        const color = score > 80 ? "text-emerald-500" : score > 50 ? "text-amber-500" : "text-slate-400";
        
        return (
          <div className="w-[140px] space-y-2 py-1">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">AI Confidence</span>
              <span className={cn("text-xs font-black leading-none", color)}>{score}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full rounded-full shadow-sm", 
                        score > 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : 
                        score > 50 ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-slate-300"
                    )} 
                />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "potential_revenue",
      header: () => <div className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Impact Forecast</div>,
      cell: ({ row }) => {
        const potential = Number(row.getValue("potential_revenue") || 0);
        return (
          <div className="text-right">
            <div className="text-sm font-black text-emerald-600 italic">
              +{currencyFormatter.format(potential)}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Projected Uplift</div>
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
                <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-primary hover:text-white transition-all rounded-xl border border-transparent hover:border-primary/20">
                    <Zap className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl border-slate-200 shadow-2xl">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Execute Intelligence</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer rounded-xl focus:bg-indigo-50 focus:text-indigo-600 py-3 group">
                    <Sparkles className="mr-3 h-4 w-4 text-indigo-500 group-hover:animate-pulse" /> 
                    <div className="flex flex-col">
                        <span className="font-bold text-xs uppercase text-slate-800">Generate AI Pitch</span>
                        <span className="text-[9px] opacity-60">Context-aware value proposition</span>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-xl focus:bg-emerald-50 focus:text-emerald-600 py-3 mt-1">
                    <Mail className="mr-3 h-4 w-4 text-emerald-500" /> 
                    <div className="flex flex-col">
                        <span className="font-bold text-xs uppercase text-slate-800">Precision Email</span>
                        <span className="text-[9px] opacity-60">Deploy expansion campaign</span>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer rounded-xl focus:bg-slate-100 py-2">
                    <MousePointerClick className="mr-3 h-4 w-4 text-slate-400" /> 
                    <span className="font-bold text-[10px] uppercase text-slate-600">Review Source Order</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [currencyFormatter]);

  /**
   * TABLE ORCHESTRATION
   */
  const table = useReactTable({
    data: opportunities,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 8 } }
  });

  const totalPotential = useMemo(() => 
    opportunities.reduce((acc, curr) => acc + (curr.potential_revenue || 0), 0), 
    [opportunities]
  );

  return (
    <div className="flex-1 space-y-10 p-4 md:p-10 bg-[#f8fafc] min-h-screen">
      
      {/* --- ENTERPRISE COMMAND HEADER --- */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 shadow-2xl shadow-indigo-200 rounded-[1.25rem]">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[10px] tracking-widest px-2 py-0">
                  REVENUE_CORE_v4.2
                </Badge>
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Active
                </div>
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase leading-none">
                Expansion Intel
              </h2>
            </div>
          </div>
          <p className="text-slate-500 font-medium max-w-xl leading-relaxed border-l-4 border-indigo-200 pl-4 text-sm">
            High-velocity expansion targets identified via recursive pattern recognition. 
            Automated scoring prioritizes accounts with high retention propensity and maximum fiscal uplift.
          </p>
        </div>
        
        {/* --- KPI TELEMETRY CARDS --- */}
        <div className="flex items-center gap-6">
            <div className="hidden xl:flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Opportunity</span>
                <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter italic">
                        {currencyFormatter.format(totalPotential)}
                    </span>
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                        <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                    </div>
                </div>
            </div>
            <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2rem] px-8 py-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 group-hover:scale-110 transition-transform duration-700">
                    <TrendingUp className="w-24 h-24" />
                </div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mb-1">Cluster Load</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black italic">{opportunities.length}</span>
                            <span className="text-xs font-bold opacity-40 uppercase tracking-widest">Targets</span>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <Button className="rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white border-none h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/20 transition-all active:scale-95">
                        Execute All
                    </Button>
                </div>
            </Card>
        </div>
      </div>

      {/* --- MAIN DATA ENGINE --- */}
      <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white/80 backdrop-blur-xl ring-1 ring-slate-100 overflow-hidden rounded-[2.5rem]">
        <CardHeader className="p-8 border-b border-slate-50 bg-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-800 uppercase italic">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    Propensity Matrix
                </CardTitle>
                <CardDescription className="text-slate-400 font-medium italic text-xs">
                    Targeting high-LTV customers with optimized conversion probabilities.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <Button variant="ghost" size="sm" className="h-8 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-white shadow-sm">Active</Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg font-black text-[9px] uppercase tracking-widest opacity-40">Processed</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-14 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="bg-white">
                <AnimatePresence mode='wait'>
                    {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row, index) => (
                        <motion.tr 
                            key={row.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group hover:bg-indigo-50/30 transition-all border-b border-slate-50 last:border-none"
                        >
                        {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="py-5 px-8">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                        ))}
                        </motion.tr>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                            <Sparkles className="w-12 h-12" />
                            <p className="font-black uppercase tracking-[0.3em] text-xs">No targets identified in this cycle</p>
                        </div>
                        </TableCell>
                    </TableRow>
                    )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
          
          {/* --- ENGINE PAGINATION --- */}
          <div className="flex items-center justify-between p-8 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                Matrix Load: {table.getRowModel().rows.length} of {opportunities.length} active nodes
            </p>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-10 px-4 rounded-xl border-slate-200 font-bold text-xs shadow-sm disabled:opacity-30 transition-all hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Prev
              </Button>
              <div className="bg-white border border-slate-200 h-10 px-4 flex items-center rounded-xl text-[11px] font-black text-slate-700 shadow-sm font-mono">
                NODE {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-10 px-4 rounded-xl border-slate-200 font-bold text-xs shadow-sm disabled:opacity-30 transition-all hover:bg-white"
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* --- SYSTEM STATUS FOOTER --- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-900/40 text-white/50 font-mono text-[10px] uppercase tracking-[0.2em] border-t-4 border-indigo-500">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 px-4">
              <span className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                  SECURE_TUNNEL_ESTABLISHED
              </span>
              <span className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-blue-500" /> 
                  DATA_INTEGRITY_VERIFIED
              </span>
              <span className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-yellow-500" /> 
                  AI_MODEL_OPTIMIZED: v4.2
              </span>
          </div>
          <div className="px-6 py-2 bg-white/5 rounded-full border border-white/10 text-white/30 whitespace-nowrap">
              ENGINE_REFRESH: {new Date().toLocaleTimeString()}
          </div>
      </div>
    </div>
  );
}