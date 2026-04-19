'use client';

import React, { useState } from 'react';
import { 
    ColumnDef, 
    flexRender, 
    getCoreRowModel, 
    useReactTable, 
    PaginationState 
} from "@tanstack/react-table";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"; // Added for better UX
import AddEmployeeDialog from './AddEmployeeDialog';
import { useTenant } from '@/hooks/useTenant'; 


interface DataTableProps<TData, TValue> { 
    columns: ColumnDef<TData, TValue>[]; 
}

/**
 * SOVEREIGN DATA FETCH PROTOCOL
 * Fetches employees based on pagination and the active business context.
 */
async function fetchEmployees(pagination: PaginationState) {
    const supabase = createClient();
    
    // The backend RPC 'get_paginated_employees' now utilizes the 
    // 'get_active_business_id()' SQL function we welded into the database.
    const { data, error } = await supabase.rpc('get_paginated_employees', {
        p_page: pagination.pageIndex + 1,
        p_page_size: pagination.pageSize,
    });
    
    if (error) throw new Error(error.message);
    return data as { employees: any[], total_count: number };
}

export default function EmployeeDataTable<TData, TValue>({ columns }: DataTableProps<TData, TValue>) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  
  // --- 1. CONTEXT RESOLUTION ---
  // We grab the active tenant ID to use as a reactive trigger for the query.
  const { data: tenant } = useTenant();
  const businessId = tenant?.id;

  // --- 2. REACTIVE QUERY PROTOCOL ---
  const { data, isLoading, isFetching } = useQuery({
    // We add businessId to the queryKey. This is the secret to "Fully Automatic" switching.
    // When the user switches businesses, the key changes, and React Query instantly
    // fetches the employee list for the new business.
    queryKey: ['employees', businessId, pagination],
    queryFn: () => fetchEmployees(pagination),
    enabled: !!businessId, // Only fetch when we have a valid business context
  });

  const table = useReactTable({
    data: (data?.employees as TData[]) ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total_count ?? 0) / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Team Context: {tenant?.name || 'Loading...'}
            </span>
        </div>
        <AddEmployeeDialog />
      </div>

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id} className="hover:bg-transparent border-slate-100">
                    {hg.headers.map(h => (
                        <TableHead key={h.id} className="text-xs font-black uppercase tracking-widest text-slate-500 py-4">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                    ))}
                </TableRow>
            ))}
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-48 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Team Data...</span>
                        </div>
                    </TableCell>
                </TableRow>
            ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                        {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id} className="py-4 font-medium text-slate-700">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                        ))}
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-slate-400 font-medium">
                        No employees found in this business node.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            Total Authorized Personnel: {data?.total_count ?? 0}
        </div>
        <div className="flex items-center space-x-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="rounded-lg font-bold text-xs uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                onClick={() => table.previousPage()} 
                disabled={!table.getCanPreviousPage() || isLoading}
            >
                Previous
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="rounded-lg font-bold text-xs uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                onClick={() => table.nextPage()} 
                disabled={!table.getCanNextPage() || isLoading}
            >
                Next
            </Button>
        </div>
      </div>
    </div>
  );
}