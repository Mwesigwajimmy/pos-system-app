'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { createClient } from '@/lib/supabase/client';
import type { AuditLogEntry } from '@/types/dashboard';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import ReactJson from 'react18-json-view';
import 'react18-json-view/src/style.css';
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// Utility function for exporting logs to CSV
function exportToCSV(logs: AuditLogEntry[], filename: string = "audit-logs.csv") {
  if (!logs.length) return;
  const headers = Object.keys(logs[0]) as (keyof AuditLogEntry)[];
  const csvRows = [
    headers.join(","),
    ...logs.map(log =>
      headers.map(h =>
        `"${String(log[h] ?? '').replace(/"/g, '""')}"`
      ).join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function fetchAuditLogs(filters: AuditLogFilters): Promise<{ logs: AuditLogEntry[]; total_count: number }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_paginated_audit_logs', {
    p_start_date: filters.startDate,
    p_end_date: filters.endDate,
    p_user_email: filters.userEmail || null,
    p_action_type: filters.actionType || null,
    p_table_name: filters.tableName || null,
    p_page: filters.page,
    p_page_size: filters.pageSize,
    // Pass fuzzySearch if supported by your backend
    p_fuzzy_search: filters.fuzzySearch || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

interface AuditLogFilters {
    page: number;
    pageSize: number;
    userEmail: string;
    actionType: string;
    tableName: string;
    startDate: string;
    endDate: string;
    fuzzySearch?: string;
}

// Debounce hook for performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Diff viewer for old/new data
const DiffViewer = ({ oldData, newData }: { oldData: any; newData: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm max-h-[60vh] overflow-y-auto font-mono">
    <div>
      <h3 className="font-semibold mb-2 p-2 bg-destructive/10 text-destructive rounded-t-md">Before Change (Old Data)</h3>
      <div className="bg-muted/50 p-1 rounded-b-md">
        <ReactJson src={oldData || {}} style={{ padding: '1rem' }} theme="atom" />
      </div>
    </div>
    <div>
      <h3 className="font-semibold mb-2 p-2 bg-green-100 text-green-800 rounded-t-md">After Change (New Data)</h3>
      <div className="bg-muted/50 p-1 rounded-b-md">
        <ReactJson src={newData || {}} style={{ padding: '1rem' }} theme="atom" />
      </div>
    </div>
  </div>
);

// Skeleton loader for table
export const AuditLogTableSkeleton = ({ columns = 6, rowCount = 10 }: { columns?: number; rowCount?: number }) => (
  <>
    {Array.from({ length: rowCount }).map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
        <TableCell colSpan={columns}>
          <Skeleton className="h-6 w-full" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

export default function AuditLogTable() {
  const [userEmailInput, setUserEmailInput] = useState('');
  const [tableNameInput, setTableNameInput] = useState('');
  const [fuzzySearchInput, setFuzzySearchInput] = useState('');

  const debouncedUserEmail = useDebounce(userEmailInput, 500);
  const debouncedTableName = useDebounce(tableNameInput, 500);
  const debouncedFuzzySearch = useDebounce(fuzzySearchInput, 500);

  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    pageSize: 15,
    userEmail: '',
    actionType: '',
    tableName: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    fuzzySearch: '',
  });

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      userEmail: debouncedUserEmail,
      tableName: debouncedTableName,
      fuzzySearch: debouncedFuzzySearch,
      page: 1
    }));
  }, [debouncedUserEmail, debouncedTableName, debouncedFuzzySearch]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => fetchAuditLogs(filters),
    placeholderData: (prevData) => prevData,
  });

  const logs = data?.logs ?? [];
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / filters.pageSize) || 1;

  // Columns definition with tooltips & sortable headers
  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(() => [
    {
      accessorKey: 'created_at',
      header: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>Timestamp</span>
            </TooltipTrigger>
            <TooltipContent>When the action occurred</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString()
    },
    {
      accessorKey: 'user_email',
      header: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>User</span>
            </TooltipTrigger>
            <TooltipContent>User who performed the action</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'action',
      header: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>Action</span>
            </TooltipTrigger>
            <TooltipContent>Type of operation</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      cell: ({ row }) => {
        const action = row.original.action;
        // Only use allowed Badge variants
        const variant = action === 'UPDATE' ? 'secondary' :
                        action === 'INSERT' ? 'default' :
                        action === 'DELETE' ? 'destructive' : 'outline';
        return <Badge variant={variant}>{action}</Badge>;
      }
    },
    {
      accessorKey: 'table_name',
      header: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>Entity</span>
            </TooltipTrigger>
            <TooltipContent>Table or entity affected</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'description',
      header: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>Description</span>
            </TooltipTrigger>
            <TooltipContent>Additional details</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.description}</span>
    },
    {
      id: 'actions',
      header: () => <span>Diff</span>,
      cell: ({ row }) =>
        row.original.action === 'UPDATE' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">View Changes</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Data Change Details</DialogTitle>
                <DialogDescription>Showing the state of the data before and after the change.</DialogDescription>
              </DialogHeader>
              <DiffViewer oldData={row.original.old_data} newData={row.original.new_data} />
            </DialogContent>
          </Dialog>
        ),
    },
  ], []);

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount
  });

  // Date range controls
  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') {
    const value = e.target.value;
    setFilters(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: value,
      page: 1
    }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Immutable Audit Log</CardTitle>
        <CardDescription>
          A complete, searchable history of all changes made to critical data.
          <br />
          <span className="text-green-600 font-semibold">Enterprise-grade, QuickBooks-ready audit logging: Export, filter, and trace every change—better than QuickBooks and competitors.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="p-4 border rounded-lg bg-muted/50 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by user email..."
              value={userEmailInput}
              onChange={e => setUserEmailInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by entity name..."
              value={tableNameInput}
              onChange={e => setTableNameInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Fuzzy search (any field)..."
              value={fuzzySearchInput}
              onChange={e => setFuzzySearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="startDate" className="text-xs text-muted-foreground">From</label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={e => handleDateChange(e, 'start')}
              className="w-[145px]"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="text-xs text-muted-foreground">To</label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={e => handleDateChange(e, 'end')}
              className="w-[145px]"
            />
          </div>
          <Select value={filters.actionType} onValueChange={value => setFilters(prev => ({
            ...prev,
            actionType: value === 'ALL' ? '' : value,
            page: 1
          }))}>
            <SelectTrigger className="w-full sm:w-[145px]">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="INSERT">INSERT</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => exportToCSV(logs)}
            disabled={!logs.length}
          >
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}>
                  {hg.headers.map(h => (
                    <TableHead key={h.id}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <AuditLogTableSkeleton columns={columns.length} />
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                    Error: {error.message}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No logs found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
              {isFetching && !isLoading && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-2 text-muted-foreground animate-pulse">
                    Fetching updated data...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Total Logs: <strong>{totalCount.toLocaleString()}</strong>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={filters.page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm font-medium">
            Page {filters.page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={filters.page >= pageCount}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}