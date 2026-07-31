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
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Sparkles,
  Mail,
  ChevronLeft,
  ChevronRight,
  Target,
  MousePointerClick,
  ArrowUpRight,
  Activity,
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
      header: "Order",
      cell: ({ row }) => {
        const uid = String(row.getValue("order_uid") || "");
        return (
          <code className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {uid.split('-')[0] || "REF"}
          </code>
        );
      },
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => {
        const name = String(row.getValue("customer_name") || "Guest");
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 text-sm">
                {name}
              </span>
              {row.original.customer_segment === 'VIP' && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 h-5 px-1.5 text-xs font-medium">
                  VIP
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>LTV: {currencyFormatter.format(row.original.total_spent_history || 0)}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">{row.original.customer_segment || 'Standard'}</span>
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
            <p className="text-sm text-slate-600">
              {formatDistanceToNow(new Date(dateStr), { addSuffix: true })}
            </p>
            <p className="text-xs text-slate-400">
              Last order: {currencyFormatter.format(row.original.current_order_amount || 0)}
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
          className="-ml-4 h-8 text-xs font-medium text-slate-500 hover:text-slate-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Opportunity score <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = Number(row.getValue("upsell_score") || 0);
        const colorClass = score > 80 ? "bg-emerald-500" : score > 50 ? "bg-blue-500" : "bg-slate-300";
        const textClass = score > 80 ? "text-emerald-600" : score > 50 ? "text-blue-600" : "text-slate-500";

        return (
          <div className="w-[140px] space-y-2">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-xs text-slate-400">Probability</span>
              <span className={cn("text-xs font-medium", textClass)}>{score}%</span>
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
      header: () => <div className="text-right text-xs font-medium text-slate-500">Estimated uplift</div>,
      cell: ({ row }) => {
        const potential = Number(row.getValue("potential_revenue") || 0);
        return (
          <div className="text-right">
            <div className="text-sm font-medium text-emerald-600">
              +{currencyFormatter.format(potential)}
            </div>
            <div className="text-xs text-slate-400">Projected</div>
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
            <DropdownMenuContent align="end" className="w-52 p-2 border-slate-200 shadow-md rounded-lg">
              <DropdownMenuLabel className="text-xs font-medium text-slate-400 px-2 py-1.5">Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-md text-sm py-2 focus:bg-blue-50">
                <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
                Generate AI pitch
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-md text-sm py-2 focus:bg-emerald-50">
                <Mail className="mr-2 h-4 w-4 text-emerald-600" />
                Send promotion
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-md text-sm py-2 text-slate-600">
                <MousePointerClick className="mr-2 h-4 w-4" />
                View profile
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
    <div className="flex-1 space-y-6 p-6 md:p-10 bg-slate-50">

      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Sales opportunities
            </h1>
          </div>
          <p className="text-sm text-slate-500 ml-1">
            Customers most likely to respond to an upsell, ranked by potential revenue.
          </p>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-white px-5 py-3 rounded-lg border border-slate-200 items-center gap-6">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Estimated impact</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-slate-900">
                  {currencyFormatter.format(totalPotential)}
                </span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="h-8 w-px bg-slate-100" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Active targets</p>
              <p className="text-lg font-semibold text-slate-900">{opportunities.length}</p>
            </div>
          </div>
          <Button className="flex-1 lg:flex-none h-10 px-6 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">
            Process queue
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden">
        <CardHeader className="bg-slate-50 border-b p-5 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold text-slate-900">Upsell opportunities</CardTitle>
            <CardDescription className="text-sm text-slate-500">Sorted by expansion probability.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-11 px-6 text-xs font-medium text-slate-500">
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
                        <TableCell key={cell.id} className="py-4 px-6">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-56 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300 gap-3">
                        <Package className="w-10 h-10" />
                        <p className="text-sm text-slate-400">No active opportunities found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-5 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing {table.getRowModel().rows.length} of {opportunities.length} results
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-9 px-4 border-slate-200"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <div className="h-9 px-4 flex items-center rounded-md bg-white border border-slate-200 text-sm text-slate-700">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-9 px-4 border-slate-200"
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