'use client';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { 
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TenantContext { 
  tenantId: string; 
  currency: string;
}

export interface GeneralLedgerEntry {
  id: string;
  date: string;
  account_code: string;
  description: string;
  reference_id?: string;
  debit: number;
  credit: number;
  balance: number;
  status: 'POSTED' | 'DRAFT' | 'VOID';
}

const PAGE_SIZE = 20;

async function fetchGL(tenantId: string, page: number) {
  const db = createClient();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await db
    .from("general_ledger")
    .select("*", { count: 'exact' })
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data as GeneralLedgerEntry[], count };
}

export default function GeneralLedgerViewer({ tenant }: { tenant: TenantContext }) {
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({ 
    queryKey: ["general-ledger", tenant.tenantId, page], 
    queryFn: () => fetchGL(tenant.tenantId, page),
    placeholderData: (previousData) => previousData // Keep prev data while fetching next page
  });

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: tenant.currency,
  });

  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 0;

  return (
    <Card className="h-full border-t-4 border-t-slate-800 shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5"/> General Ledger
            </CardTitle>
            <CardDescription>Master record of all financial transactions.</CardDescription>
          </div>
          {data?.count && <Badge variant="outline">{data.count} Total Entries</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error loading ledger</AlertTitle>
             <AlertDescription>{error.message}</AlertDescription>
           </Alert>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-[300px]">Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center w-[80px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-12 text-center"><Loader2 className="animate-spin inline mr-2 h-4 w-4"/> Loading...</TableCell>
                    </TableRow>
                  ))
                ) : data?.data.length === 0 ? (
                   <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No ledger entries found.</TableCell></TableRow>
                ) : (
                  data?.data.map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono text-xs">
                        {format(new Date(l.date), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {l.account_code}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 truncate max-w-[300px]" title={l.description}>
                        {l.description}
                        {l.reference_id && <span className="block text-[10px] text-muted-foreground">Ref: {l.reference_id}</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {l.debit > 0 ? currencyFormatter.format(l.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {l.credit > 0 ? currencyFormatter.format(l.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                         {currencyFormatter.format(l.balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[10px] ${l.status === 'POSTED' ? 'border-green-200 text-green-700 bg-green-50' : 'text-slate-500'}`}>
                          {l.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-xs text-muted-foreground">
             Page {page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
            >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => (!data?.count || (p + 1) * PAGE_SIZE >= data.count ? p : p + 1))}
                disabled={!data?.count || (page + 1) * PAGE_SIZE >= data.count || isLoading}
            >
                Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
      </CardFooter>
    </Card>
  );
}