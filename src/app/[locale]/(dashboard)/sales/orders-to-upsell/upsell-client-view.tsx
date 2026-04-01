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
  Clock,
  Target,
  Zap,
  ShieldCheck,
  MousePointerClick,
  ArrowUpRight,
  Layers,
  Activity,
  Database,
  Search,
  CheckCircle2,
  Package
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
      header: "Order ID",
      cell: ({ row }) => {
        const uid = String(row.getValue("order_uid") || "");
        return (
          <code className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
              {uid.split('-')[0] || "REF"}
          </code>
        );
      },
    },
    {
      accessorKey: "customer_name",
      header: "Customer Details",
      cell: ({ row }) => {
        const name = String(row.getValue("customer_name") || "Guest");
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                  {name}
              </span>
              {row.original.customer_segment === 'VIP' && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 h-5 px-1.5 text-[9px] font-bold">
                  VIP
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                <span>LTV: {currencyFormatter.format(row.original.total_spent_history || 0)}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 uppercase">{row.original.customer_segment || 'Standard'}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "order_date",
      header: "Recency",
      cell: ({ row }) => {
        const dateStr = String(row.getValue("order_date"));
        return (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600">
                {formatDistanceToNow(new Date(dateStr), { addSuffix: true })}
            </p>
            <p className="text-[10px] font-medium text-slate-400 uppercase">
                Last Order: {currencyFormatter.format(row.original.current_order_amount || 0)}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "upsell_score",
      header: ({ column }) => (
        <Button 
            variant="ghost" 
            className="-ml-4 h-8 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors" 
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Opportunity Score <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = Number(row.getValue("upsell_score") || 0);
        const colorClass = score > 80 ? "bg-emerald-500" : score > 50 ? "bg-blue-500" : "bg-slate-300";
        const textClass = score > 80 ? "text-emerald-600" : score > 50 ? "text-blue-600" : "text-slate-500";
        
        return (
          <div className="w-[140px] space-y-2">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[9px] font-bold uppercase text-slate-400">Probability</span>
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
      header: () => <div className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Estimated Uplift</div>,
      cell: ({ row }) => {
        const potential = Number(row.getValue("potential_revenue") || 0);
        return (
          <div className="text-right">
            <div className="text-sm font-bold text-emerald-600">
              +{currencyFormatter.format(potential)}
            </div>
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight">Projected</div>
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
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                    <Activity className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-2 border-slate-200 shadow-xl rounded-lg">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1.5">Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer rounded-md font-semibold text-xs py-2 focus:bg-blue-50">
                    <Sparkles className="mr-2 h-4 w-4 text-blue-600" /> 
                    AI Pitch Generation
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-md font-semibold text-xs py-2 focus:bg-emerald-50">
                    <Mail className="mr-2 h-4 w-4 text-emerald-600" /> 
                    Send Promotion
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer rounded-md font-semibold text-xs py-2 text-slate-600">
                    <MousePointerClick className="mr-2 h-4 w-4" /> 
                    View Profile
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
    <div className="flex-1 space-y-8 p-6 md:p-10 animate-in fade-in duration-500 bg-[#F8FAFC]">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600 rounded-lg shadow-sm">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Sales Opportunities
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-1">
            Data-driven targets identified through customer purchase patterns and behavior analytics.
          </p>
        </div>
        
        {/* KPI CARDS */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm items-center gap-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Estimated Impact</p>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-slate-900">
                            {currencyFormatter.format(totalPotential)}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </div>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Active Targets</p>
                    <p className="text-xl font-bold text-slate-900">{opportunities.length}</p>
                </div>
            </div>
            <Button className="flex-1 lg:flex-none h-11 px-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-all active:scale-95">
                Process Queue
            </Button>
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
                <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">Upsell Opportunities</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">Prioritized list based on expansion probability.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-white text-blue-600 border-slate-200 font-bold px-3">
                System Version 4.2
            </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-12 px-8 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-4 px-8">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                    ))}
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300 gap-3">
                          <Package className="w-12 h-12 opacity-20" />
                          <p className="font-semibold uppercase tracking-widest text-xs">No active opportunities found</p>
                      </div>
                    </TableCell>
                </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* PAGINATION */}
          <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/30">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">
                Showing {table.getRowModel().rows.length} of {opportunities.length} Results
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-9 px-4 border-slate-200 font-bold"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <div className="h-9 px-4 flex items-center rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-9 px-4 border-slate-200 font-bold"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* SYSTEM STATUS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 border border-slate-200 rounded-xl bg-white shadow-sm opacity-60">
          <div className="flex flex-wrap items-center justify-center gap-8 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure Analysis
              </span>
              <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" /> Ledger Verified
              </span>
              <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> BBU1 Integrity Protocol
              </span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-400">
              {new Date().toLocaleDateString()} // STATUS: SYNCHRONIZED
          </div>
      </div>
    </div>
  );
}