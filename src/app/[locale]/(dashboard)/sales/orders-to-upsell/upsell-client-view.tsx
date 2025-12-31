'use client';

import React, { useState, useMemo } from 'react'; // FIXED: Added useMemo
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
  History
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
  locale?: string;    // e.g. 'en-US', 'en-UG', 'fr-FR'
  currency?: string;  // e.g. 'USD', 'UGX', 'EUR'
}

export default function UpsellClientView({ 
  opportunities, 
  locale = 'en-US', 
  currency = 'UGX' 
}: UpsellClientViewProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'upsell_score', desc: true }]);

  // Dynamic Currency Formatter for Multi-Tenant Support
  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    });
  }, [locale, currency]);

  // Columns moved inside the component to utilize the dynamic currencyFormatter
  const columns = useMemo<ColumnDef<UpsellOpportunity>[]>(() => [
    {
      accessorKey: "order_uid",
      header: "Order Ref",
      cell: ({ row }) => <span className="font-mono text-[10px] uppercase text-muted-foreground">{row.getValue("order_uid")}</span>,
    },
    {
      accessorKey: "customer_name",
      header: "Customer Intelligence",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold flex items-center gap-1.5">
            {row.getValue("customer_name")}
            {row.original.customer_segment === 'VIP' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><BadgeCheck className="w-4 h-4 text-blue-500" /></TooltipTrigger>
                  <TooltipContent>Verified VIP Customer</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
          <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] h-4 px-1 uppercase tracking-wider">
                  {row.original.customer_segment}
              </Badge>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <History className="w-3 h-3" /> 
                  {currencyFormatter.format(row.original.total_spent_history)} spent
              </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "order_date",
      header: "Recency",
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="font-medium text-foreground">
              {formatDistanceToNow(new Date(row.original.order_date), { addSuffix: true })}
          </p>
          <p className="text-[10px] text-muted-foreground">
              {currencyFormatter.format(row.original.current_order_amount)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "upsell_score",
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-4 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Propensity <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = row.getValue("upsell_score") as number;
        // Automated Color Logic
        const colorClass = score > 80 ? "bg-emerald-500" : score > 50 ? "bg-amber-500" : "bg-slate-400";
        
        return (
          <div className="w-[120px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Match Probability</span>
              <span className={`text-[10px] font-bold ${score > 80 ? "text-emerald-600" : "text-amber-600"}`}>{score}%</span>
            </div>
            {/* @ts-ignore - Ignore type error while using custom styling on Progress */}
            <Progress value={score} className="h-1.5" indicatorClassName={colorClass} />
          </div>
        );
      },
    },
    {
      accessorKey: "potential_revenue",
      header: () => <div className="text-right">Est. Uplift</div>,
      cell: ({ row }) => (
        <div className="text-right font-bold text-emerald-600">
          +{currencyFormatter.format(row.getValue("potential_revenue"))}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Intelligence Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                  <Sparkles className="mr-2 h-4 w-4 text-purple-500" /> Generate AI Pitch
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                  <Phone className="mr-2 h-4 w-4 text-blue-500" /> Click to Call
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                  <Mail className="mr-2 h-4 w-4 text-emerald-500" /> Send Personalized Email
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
    initialState: { pagination: { pageSize: 7 } }
  });

  const totalPotential = useMemo(() => 
    opportunities.reduce((acc, curr) => acc + curr.potential_revenue, 0), 
    [opportunities]
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Revenue Intelligence</h2>
          <p className="text-slate-500">Automated upsell targets generated from system-wide transaction patterns.</p>
        </div>
        
        <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative">
             <div className="absolute top-0 right-0 p-1 opacity-10"><TrendingUp className="w-20 h-20" /></div>
             <CardContent className="p-5 flex items-center gap-4 relative z-10">
               <div className="p-3 bg-emerald-500/20 rounded-full"><TrendingUp className="h-6 w-6 text-emerald-400" /></div>
               <div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pipeline Opportunity</p>
                 <p className="text-2xl font-black">{currencyFormatter.format(totalPotential)}</p>
               </div>
             </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-lg">High-Propensity Targets</CardTitle>
                <CardDescription>Targeting customers with successful order history and high match scores.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {opportunities.length} Active Opportunities
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-10 text-[11px] font-bold uppercase text-slate-500">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="bg-white">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-40 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Sparkles className="w-8 h-8 opacity-20" />
                        <p>No high-propensity opportunities detected yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/30">
            <p className="text-xs text-slate-500 font-medium">
                Showing {table.getRowModel().rows.length} of {opportunities.length} targets
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-xs font-bold px-2">
                Page {table.getState().pagination.pageIndex + 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 px-2"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}