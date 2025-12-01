'use client';

import React, { useMemo, useState } from 'react';
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  useReactTable, 
  SortingState 
} from "@tanstack/react-table";
import { format } from "date-fns";
import { 
  TrendingUp, 
  User, 
  ArrowUpDown, 
  MoreHorizontal, 
  Sparkles, 
  BadgeCheck, 
  Mail,
  Phone
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

// --- Types ---
// Merges your Order and Customer interfaces for a rich view
export interface UpsellOpportunity {
  order_id: string;
  order_uid: string;
  customer_name: string;
  customer_segment: string; // VIP, Regular, New
  total_spent_history: number;
  current_order_amount: number;
  order_date: string;
  upsell_score: number; // 0-100 calculated score
  potential_revenue: number; // Estimated value of upsell
}

const columns: ColumnDef<UpsellOpportunity>[] = [
  {
    accessorKey: "order_uid",
    header: "Order Ref",
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("order_uid")}</span>,
  },
  {
    accessorKey: "customer_name",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium flex items-center gap-1">
          {row.getValue("customer_name")}
          {row.original.customer_segment === 'VIP' && <BadgeCheck className="w-3 h-3 text-blue-500" />}
        </span>
        <span className="text-xs text-muted-foreground">{row.original.customer_segment}</span>
      </div>
    ),
  },
  {
    accessorKey: "current_order_amount",
    header: "Recent Order",
    cell: ({ row }) => (
      <div className="font-medium">
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "UGX" }).format(row.getValue("current_order_amount"))}
      </div>
    ),
  },
  {
    accessorKey: "upsell_score",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Propensity <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = row.getValue("upsell_score") as number;
      return (
        <div className="w-[100px] flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Score</span>
            <span>{score}%</span>
          </div>
          <Progress value={score} className={`h-2 ${score > 75 ? "bg-green-100" : ""}`} />
        </div>
      );
    },
  },
  {
    accessorKey: "potential_revenue",
    header: "Est. Uplift",
    cell: ({ row }) => (
      <div className="font-bold text-green-600">
        +{new Intl.NumberFormat("en-US", { style: "currency", currency: "UGX" }).format(row.getValue("potential_revenue"))}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem><Sparkles className="mr-2 h-4 w-4 text-purple-500" /> View Recommended Products</DropdownMenuItem>
          <DropdownMenuItem><Phone className="mr-2 h-4 w-4" /> Call Customer</DropdownMenuItem>
          <DropdownMenuItem><Mail className="mr-2 h-4 w-4" /> Send Promo Email</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function UpsellClientView({ opportunities }: { opportunities: UpsellOpportunity[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'upsell_score', desc: true }]);

  const table = useReactTable({
    data: opportunities,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPotential = opportunities.reduce((acc, curr) => acc + curr.potential_revenue, 0);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upsell Opportunities</h2>
          <p className="text-muted-foreground">AI-driven recommendations based on recent order history.</p>
        </div>
        <div className="flex items-center space-x-2">
           <Card className="bg-primary text-primary-foreground border-none shadow-md">
             <CardContent className="p-4 flex items-center gap-3">
               <TrendingUp className="h-8 w-8 opacity-80" />
               <div>
                 <p className="text-xs opacity-80 font-medium uppercase">Pipeline Value</p>
                 <p className="text-xl font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "UGX" }).format(totalPotential)}</p>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>High Potential Targets</CardTitle>
          <CardDescription>
            Customers who recently purchased and match VIP criteria or high-value patterns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No opportunities found at this time.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}