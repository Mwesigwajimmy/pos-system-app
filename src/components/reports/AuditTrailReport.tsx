'use client';

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, ChevronLeft, ChevronRight, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
// FIX 1: Removed the broken import "@lib/hooks/use-debounce". 
// You already implemented the debounce logic manually below, so the import was not needed.

// FIX 2: Defined the interface here instead of importing from 'page.tsx' to avoid build errors.
export interface AuditLog {
  id: string;
  created_at: string;
  user_email: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  changes_summary?: string;
  description?: string;
}

interface Props {
  logs: AuditLog[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export default function AuditTrailReportClient({ logs, totalCount, currentPage, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('q') || '');
  
  // Custom debounce logic (This replaces the need for the hook import)
  const [debouncedFilter, setDebouncedFilter] = useState(filter);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedFilter(filter); }, 500);
    return () => clearTimeout(handler);
  }, [filter]);

  // Effect to trigger search
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedFilter) {
        params.set('q', debouncedFilter);
    } else {
        params.delete('q');
    }
    params.set('page', '1'); // Reset to page 1 on search
    router.push(`?${params.toString()}`);
  }, [debouncedFilter, router, searchParams]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-indigo-600"/> 
                    Compliance Audit Log
                </CardTitle>
                <CardDescription>
                  Immutable historical record of all data modifications. Total Records: {totalCount}
                </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search user, table, or action..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8" 
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
          <div className="rounded-md border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target Entity</TableHead>
                    <TableHead>Details (Changes)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground flex flex-col items-center justify-center">
                            <FileSearch className="h-10 w-10 mb-3 opacity-20"/>
                            No audit records found.
                        </TableCell>
                    </TableRow>
                  ) : (
                    logs.map(log => (
                      <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                            {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 text-sm">
                            {log.user_email}
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={
                                log.action === 'INSERT' ? "bg-green-50 text-green-700 border-green-200" :
                                log.action === 'DELETE' ? "bg-red-50 text-red-700 border-red-200" :
                                "bg-blue-50 text-blue-700 border-blue-200"
                            }>
                                {log.action}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-slate-600">
                            {log.table_name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-lg truncate" title={log.changes_summary}>
                            {log.changes_summary || log.description}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-slate-50/50 p-4 border-t">
          <div className="text-xs text-muted-foreground">
             Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
             >
                <ChevronLeft className="h-4 w-4 mr-1"/> Previous
             </Button>
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
             >
                Next <ChevronRight className="h-4 w-4 ml-1"/>
             </Button>
          </div>
      </CardFooter>
    </Card>
  );
}