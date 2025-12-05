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

// FIX: Interface matches what BillsPageClient passes
interface Props {
  businessId: string;
}

export default function InvoicesToBeIssuedTable({ businessId }: Props) {
  // 1. Context & Hooks
  // Note: We use the passed businessId directly, avoiding the need for client-side tenant context hooks
  const supabase = createClient();

  // 2. State
  const [invoices, setInvoices] = useState<InvoiceAwaiting[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Data Fetching
  useEffect(() => {
    if (!businessId) return;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch pending invoices for the specific business
        const { data, error: supabaseError } = await supabase
          .from('accounting_pending_invoices') 
          .select('*')
          // FIX: Map businessId to tenant_id column in DB
          .eq('tenant_id', businessId)
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
  }, [businessId, supabase]);

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
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading pending invoices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
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

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
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
                  <TableRow key={inv.id} className="hover:bg-muted/50">
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
    </div>
  );
}