// src/components/ledger/GeneralLedgerTable.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
} from '@tanstack/react-table';
import { createClient } from '@/lib/supabase/client'; // <-- 1. CORRECTED IMPORT
import { Transaction } from '@/types/dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays } from "date-fns";
// NOTE: You will need to create the DateRangePicker component in a future step.

// The data fetcher function
async function fetchTransactions(filters: any): Promise<{ transactions: Transaction[]; total_count: number }> {
  const supabase = createClient(); // <-- 2. CREATE THE CLIENT INSTANCE HERE
  const { data, error } = await supabase.rpc('get_paginated_transactions', {
    p_business_id: 1, // Hardcoded for now, will come from user state later
    p_start_date: filters.date.from.toISOString().split('T')[0],
    p_end_date: filters.date.to.toISOString().split('T')[0],
    p_search_text: filters.searchText || null,
    p_account_id: filters.accountId || null,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  });

  if (error) throw new Error(error.message);
  return data;
}

export default function GeneralLedgerTable() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    date: { from: addDays(new Date(), -30), to: new Date() },
    searchText: '',
    accountId: null,
    page: 1,
    pageSize: 10,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
  });

  const transactions = data?.transactions ?? [];
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / filters.pageSize) || 1;

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={row.getToggleExpandedHandler()}>
            {row.getIsExpanded() ? '▼' : '►'}
          </Button>
        ),
      },
      { accessorKey: 'transaction_date', header: 'Date' },
      { accessorKey: 'description', header: 'Description' },
    ],
    []
  );

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    pageCount,
  });

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, searchText: searchText, page: 1 }));
  };

  if (isLoading) return <div>Loading General Ledger...</div>
  if (error) return <div className="text-red-500">Error loading ledger: {error.message}</div>

  return (
    <div className="p-4 bg-white rounded-lg shadow space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">General Ledger Explorer</h2>
      </div>
      
      <div className="flex items-center gap-4">
        {/* We will add a DateRangePicker here later */}
        <Input
          placeholder="Search description..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-sm"
        />
        {/* We will add an Account Select dropdown here later */}
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-2 bg-gray-50">
                        <div className="p-2 grid grid-cols-3 gap-x-4">
                           <h4 className="font-semibold text-sm mb-1 col-span-3 border-b pb-1">Journal Entries</h4>
                           <div className="font-bold text-xs">Account</div>
                           <div className="font-bold text-xs text-right">Debit</div>
                           <div className="font-bold text-xs text-right">Credit</div>
                           {row.original.journal_entries.map(entry => (
                             <React.Fragment key={entry.entry_id}>
                               <span className="text-xs py-1 border-b">{entry.account_name}</span>
                               <span className="text-xs py-1 border-b text-right font-mono">
                                 {entry.type === 'DEBIT' ? entry.amount.toFixed(2) : ''}
                               </span>
                               <span className="text-xs py-1 border-b text-right font-mono">
                                 {entry.type === 'CREDIT' ? entry.amount.toFixed(2) : ''}
                               </span>
                             </React.Fragment>
                           ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No transactions found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <span className="flex-1 text-sm text-muted-foreground">
            Total Transactions: {totalCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters(prev => ({...prev, page: prev.page - 1}))}
          disabled={filters.page <= 1}
        >
          Previous
        </Button>
        <span className="text-sm">Page {filters.page} of {pageCount}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters(prev => ({...prev, page: prev.page + 1}))}
          disabled={filters.page >= pageCount}
        >
          Next
        </Button>
      </div>
    </div>
  );
}