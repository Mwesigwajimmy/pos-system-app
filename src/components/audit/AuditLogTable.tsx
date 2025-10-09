// src/components/audit/AuditLogTable.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { createClient } from '@/lib/supabase/client'; // <-- 1. CORRECTED IMPORT
import { AuditLogEntry } from '@/types/dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import ReactJson from 'react18-json-view';
import 'react18-json-view/src/style.css';
import { Search } from 'lucide-react';

async function fetchAuditLogs(filters: any): Promise<{ logs: AuditLogEntry[]; total_count: number }> {
  const supabase = createClient(); // <-- 2. CREATE THE CLIENT INSTANCE
  const { data, error } = await supabase.rpc('get_paginated_audit_logs', {
    // p_business_id is no longer needed if your RLS handles it
    p_start_date: filters.startDate,
    p_end_date: filters.endDate,
    p_user_email: filters.userEmail || null,
    p_action_type: filters.actionType || null,
    p_table_name: filters.tableName || null,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  });
  if (error) throw new Error(error.message);
  return data;
}

const DiffViewer = ({ oldData, newData }: { oldData: any, newData: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm max-h-[60vh] overflow-y-auto">
    <div>
      <h3 className="font-semibold mb-2 p-2 bg-red-50 text-red-800 rounded-t-md">Before Change (Old Data)</h3>
      <div className="bg-gray-50 p-2 rounded-b-md">
        <ReactJson src={oldData || {}} style={{ padding: '1em' }} />
      </div>
    </div>
    <div>
      <h3 className="font-semibold mb-2 p-2 bg-green-50 text-green-800 rounded-t-md">After Change (New Data)</h3>
      <div className="bg-gray-50 p-2 rounded-b-md">
        <ReactJson src={newData || {}} style={{ padding: '1em' }} />
      </div>
    </div>
  </div>
);

export default function AuditLogTable() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    userEmail: '',
    actionType: '',
    tableName: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [inputFilters, setInputFilters] = useState({ userEmail: '', tableName: '' });

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => fetchAuditLogs(filters),
    placeholderData: (prevData) => prevData,
  });

  const logs = data?.logs ?? [];
  const totalCount = data?.total_count ?? 0;
  const pageCount = Math.ceil(totalCount / filters.pageSize) || 1;

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(() => [
    { accessorKey: 'created_at', header: 'Timestamp', cell: ({row}) => new Date(row.original.created_at).toLocaleString() },
    { accessorKey: 'user_email', header: 'User' },
    { accessorKey: 'action', header: 'Action', cell: ({row}) => <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.original.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' : row.original.action === 'INSERT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{row.original.action}</span> },
    { accessorKey: 'table_name', header: 'Entity' },
    { accessorKey: 'description', header: 'Description' },
    {
      id: 'actions',
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
  
  const table = useReactTable({ data: logs, columns, getCoreRowModel: getCoreRowModel(), manualPagination: true, pageCount });

  const handleFilterChange = () => {
    setFilters(prev => ({ ...prev, ...inputFilters, page: 1 }));
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Immutable Audit Log</h2>
        <div className="p-4 border rounded-lg bg-gray-50 flex flex-wrap items-center gap-4">
          <Input placeholder="Filter by user email..." value={inputFilters.userEmail} onChange={e => setInputFilters(prev => ({...prev, userEmail: e.target.value}))} className="max-w-xs"/>
          <Input placeholder="Filter by table name..." value={inputFilters.tableName} onChange={e => setInputFilters(prev => ({...prev, tableName: e.target.value}))} className="max-w-xs"/>
          <Select value={filters.actionType} onValueChange={value => setFilters(prev => ({...prev, actionType: value === 'ALL' ? '' : value, page: 1}))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Action Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="INSERT">INSERT</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleFilterChange}><Search className="mr-2 h-4 w-4"/>Apply Filters</Button>
        </div>

        <div className="rounded-md border">
            <Table>
                <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id} className="font-semibold">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                <TableBody>
                    {(isLoading || isFetching) ? <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow> :
                     error ? <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-red-500">{error.message}</TableCell></TableRow> :
                     table.getRowModel().rows.map(row => (
                        <TableRow key={row.original.id} className="hover:bg-gray-50">{row.getVisibleCells().map(cell => <TableCell key={cell.id} className="py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>
                     ))
                    }
                </TableBody>
            </Table>
        </div>
        
        <div className="flex items-center justify-end space-x-2">
            <span className="flex-1 text-sm text-muted-foreground">Total Logs: {totalCount}</span>
            <Button variant="outline" size="sm" onClick={() => setFilters(prev => ({...prev, page: prev.page - 1}))} disabled={filters.page <= 1}>Previous</Button>
            <span className="text-sm font-medium">Page {filters.page} of {pageCount}</span>
            <Button variant="outline" size="sm" onClick={() => setFilters(prev => ({...prev, page: prev.page + 1}))} disabled={filters.page >= pageCount}>Next</Button>
        </div>
    </div>
  );
}