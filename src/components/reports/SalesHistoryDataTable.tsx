'use client';

import React, { useState, useEffect } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  ColumnDef, 
  flexRender, 
  PaginationState 
} from "@tanstack/react-table";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// --- Types ---
interface SalesHistoryRow {
  id: string;
  created_at: string;
  customer_name: string;
  employee_name: string;
  payment_method: string;
  item_count: number;
  total_amount: number;
}

interface RPCResponse {
  sales_history: SalesHistoryRow[];
  total_count: number;
}

// --- Fetch Function ---
async function fetchSalesHistory(
  pagination: PaginationState, 
  date: DateRange
): Promise<RPCResponse> {
    const supabase = createClient();
    
    // Safety check for dates
    const start = date.from ? format(date.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const end = date.to ? format(date.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase.rpc('get_paginated_sales_history', {
        p_start_date: start,
        p_end_date: end,
        p_page: pagination.pageIndex + 1, // API uses 1-based indexing usually
        p_page_size: pagination.pageSize,
    });

    if (error) throw new Error(error.message);
    return data || { sales_history: [], total_count: 0 };
}

// --- Columns Definition ---
const columns: ColumnDef<SalesHistoryRow>[] = [
  { accessorKey: "id", header: "Ref ID", cell: ({row}) => <span className="font-mono text-xs">{String(row.original.id).substring(0,8)}...</span> },
  { 
    accessorKey: "created_at", 
    header: "Date",
    cell: ({ row }) => format(new Date(row.original.created_at), "MMM dd, yyyy HH:mm")
  },
  { accessorKey: "customer_name", header: "Customer" },
  { accessorKey: "employee_name", header: "Sold By" },
  { accessorKey: "payment_method", header: "Method" },
  { accessorKey: "item_count", header: "Items" },
  { 
    accessorKey: "total_amount", 
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_amount"));
      const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "UGX" }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    }
  },
];

export default function SalesHistoryDataTable() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });
  const [isExporting, setIsExporting] = useState(false);

  // TanStack Query for caching and state management
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['salesHistory', pagination, date],
    queryFn: () => fetchSalesHistory(pagination, date!),
    enabled: !!date?.from && !!date?.to,
    placeholderData: (previousData) => previousData, // Keep data while fetching new page
  });

  const tableData = data?.sales_history ?? [];
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pageCount,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  // --- CSV Export Logic ---
  const handleExport = async () => {
    if (!date?.from || !date?.to) return;
    setIsExporting(true);
    const toastId = toast.loading('Generating CSV report...');

    try {
      const supabase = createClient();
      // Fetch ALL rows for date range (bypass pagination)
      const { data: allData, error } = await supabase.rpc('get_paginated_sales_history', {
          p_start_date: format(date.from, 'yyyy-MM-dd'),
          p_end_date: format(date.to, 'yyyy-MM-dd'),
          p_page: 1,
          p_page_size: 1000000, // Large number to get all
      });

      if (error) throw error;

      const rows = allData.sales_history || [];
      const headers = ["ID", "Date", "Customer", "Employee", "Method", "Items", "Amount"];
      
      const csvContent = [
        headers.join(","),
        ...rows.map((row: SalesHistoryRow) => [
          row.id,
          format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
          `"${row.customer_name}"`, // Escape CSV
          `"${row.employee_name}"`,
          row.payment_method,
          row.item_count,
          row.total_amount
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_history_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Export complete', { id: toastId });
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-2 rounded-lg border">
        <DatePickerWithRange date={date} setDate={setDate} />
        <Button onClick={handleExport} variant="outline" disabled={isExporting || isLoading}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="bg-slate-50">
                {hg.headers.map(h => (
                  <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading records...
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
               <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-red-500">Error loading data</TableCell></TableRow>
            ) : tableData.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No sales found.</TableCell></TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="hover:bg-slate-50/50">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {totalCount} records
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}