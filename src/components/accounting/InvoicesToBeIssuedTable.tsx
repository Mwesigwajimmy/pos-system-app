"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search, X, AlertCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { format } from "date-fns";

export interface InvoiceAwaiting {
  id: string;
  supplier_name: string;
  expected_amount: number;
  currency: string;
  due_date: string;          
  status: "pending" | "reminded" | "received";
  tenant_id: string;
}

interface Props {
  tenantId?: string;
}

export default function InvoicesToBeIssuedTable({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [invoices, setInvoices] = useState<InvoiceAwaiting[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch pending invoices for the specific tenant
        const { data, error: supabaseError } = await supabase
          .from('accounting_pending_invoices') 
          .select('*')
          .eq('tenant_id', tenantId)
          .neq('status', 'paid') 
          .order('due_date', { ascending: true });

        if (supabaseError) throw supabaseError;

        if (data) {
          setInvoices(data as unknown as InvoiceAwaiting[]);
        }

      } catch (err: any) {
        console.error("Data fetch error:", err);
        setError("Failed to load invoices. Please ensure you are connected to the network.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      invoices.filter(
        inv =>
          (inv.supplier_name || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [invoices, filter]
  );

  // 5. Utility: Currency Formatter
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 6. Utility: Status Badge Variant
  const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'received': return 'default';
      case 'reminded': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  // 7. Loading State
  if (loading && !invoices.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Invoices To Be Issued</CardTitle>
          <CardDescription>Syncing data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Invoices To Be Issued</CardTitle>
            <CardDescription className="mt-1">
              Track supplier bills pending formal invoice generation.
            </CardDescription>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by supplier..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-8" 
            />
            {filter && (
              <X 
                className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
                onClick={() => setFilter('')}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <ScrollArea className="h-[400px] w-full">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="w-[35%]">Supplier</TableHead>
                  <TableHead>Expected Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {filter ? "No matching suppliers found." : "No invoices awaiting issuance."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/5">
                      <TableCell className="font-medium">
                        {inv.supplier_name}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {formatCurrency(inv.expected_amount, inv.currency)}
                      </TableCell>
                      <TableCell>
                        {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getBadgeVariant(inv.status)} className="capitalize">
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}