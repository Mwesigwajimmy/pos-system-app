// src/components/reports/SalesHistoryDataTable.tsx
// FINAL, CORRECTED VERSION (V3)

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, PaginationState } from "@tanstack/react-table";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { CSVLink } from "react-csv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface DataTableProps<TData, TValue> { columns: ColumnDef<TData, TValue>[]; }

async function fetchSalesHistory(pagination: PaginationState, date: DateRange): Promise<{ sales_history: any[], total_count: number }> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_paginated_sales_history', {
        p_start_date: date.from!.toISOString().split('T')[0],
        p_end_date: date.to!.toISOString().split('T')[0],
        p_page: pagination.pageIndex + 1,
        p_page_size: pagination.pageSize,
    });
    if (error) throw new Error(error.message);
    // THIS IS THE FIX: Ensure the function always returns a valid object.
    return data || { sales_history: [], total_count: 0 };
}

const csvHeaders = [
    { label: "Sale ID", key: "id" },
    { label: "Date", key: "created_at" },
    { label: "Customer", key: "customer_name" },
    { label: "Sold By", key: "employee_name" },
    { label: "Payment Method", key: "payment_method" },
    { label: "Items", key: "item_count" },
    { label: "Total", key: "total_amount" },
];

export default function SalesHistoryDataTable<TData, TValue>({ columns }: DataTableProps<TData, TValue>) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });
  const [date, setDate] = useState<DateRange | undefined>({ from: addDays(new Date(), -29), to: new Date() });
  const [exportData, setExportData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isReadyForExport, setIsReadyForExport] = useState(false);
  const csvLink = useRef<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['salesHistory', pagination, date],
    queryFn: () => fetchSalesHistory(pagination, date!),
    enabled: !!date?.from && !!date?.to,
  });

  useEffect(() => {
    if (isReadyForExport && csvLink.current) {
      csvLink.current.link.click();
      setIsReadyForExport(false);
      setExportData([]); 
      setIsExporting(false);
      toast.success('Export downloaded successfully!');
    }
  }, [isReadyForExport]);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Preparing all sales data for export...');
    try {
      const supabase = createClient();
      const { data: allData, error } = await supabase.rpc('get_paginated_sales_history', {
          p_start_date: date!.from!.toISOString().split('T')[0],
          p_end_date: date!.to!.toISOString().split('T')[0],
          p_page: 1,
          p_page_size: 10000, 
      });

      if (error) throw error;
      
      toast.dismiss(toastId);
      // THIS IS THE FIX: Safely handle null or undefined data from the RPC.
      setExportData(allData?.sales_history || []);
      setIsReadyForExport(true);
      
    } catch (error: any) {
        toast.error(`Export failed: ${error.message}`, { id: toastId });
        setIsExporting(false);
    }
  }

  const tableData = data?.sales_history as TData[] ?? [];
  const totalCount = data?.total_count ?? 0;

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize) || 1,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <DatePickerWithRange date={date} setDate={setDate} />
        <Button onClick={handleExport} variant="outline" disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Preparing...' : 'Export to CSV'}
        </Button>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
             : table.getRowModel().rows?.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)
             : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No sales found for this period.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <span className="flex-1 text-sm text-muted-foreground">Total Sales: {totalCount}</span>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>

      {isReadyForExport && (
        <CSVLink
          data={exportData}
          headers={csvHeaders}
          filename={`sales_history_${format(new Date(), 'yyyy-MM-dd')}.csv`}
          ref={csvLink}
          className="hidden"
        />
      )}
    </div>
  );
}