"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, Search, X, FileText } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { format } from "date-fns";
import { Badge } from '@/components/ui/badge';

interface ApprovalRequest {
  id: string;
  request_type: string; // 'Bill', 'Journal Entry', 'Purchase Order'
  entity: string;
  country: string;
  currency: string;
  description: string;
  amount: number;
  requested_by: string;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  tenant_id: string;
}

interface Props {
  tenantId?: string;
}

export default function ApprovalsWorkflow({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('accounting_approval_requests')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('requested_at', { ascending: false });

        if (error) throw error;
        if (data) setRequests(data as unknown as ApprovalRequest[]);
      } catch (error) {
        console.error("Error fetching approval requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [tenantId, supabase]);

  // 4. Filtering
  const filtered = useMemo(
    () =>
      requests.filter(
        r =>
          (r.request_type || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.entity || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.country || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.description || '').toLowerCase().includes(filter.toLowerCase()) ||
          (r.requested_by || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [requests, filter]
  );

  // 5. Actions
  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'System';
      const timestamp = new Date().toISOString();

      const updates = action === 'approve' 
        ? { 
            status: 'approved', 
            approved_by: userEmail, 
            approved_at: timestamp 
          }
        : { 
            status: 'rejected', 
            approved_by: userEmail, // Tracking who rejected it in the same column or separate based on schema
            rejection_reason: 'Rejected by user' // Ideally prompt for reason
          };

      const { error } = await supabase
        .from('accounting_approval_requests')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Optimistic Update
      setRequests(prev => 
        prev.map(r => r.id === id ? { ...r, ...updates } as ApprovalRequest : r)
      );

    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
      alert(`Failed to ${action} request. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  // 6. Formatters
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading && !requests.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approvals Workflow</CardTitle>
          <CardDescription>Loading pending approvals...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvals Workflow</CardTitle>
        <CardDescription>
          Multi-level and cross-functional approvals for key transactions per entity, tenant, currency, and role.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter requests..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8" 
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setFilter('')}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No approval requests found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {r.request_type}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={r.description}>
                      {r.description}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(r.amount, r.currency)}
                    </TableCell>
                    <TableCell>
                      {r.status === 'pending' ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pending</Badge>
                      ) : r.status === 'approved' ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Approved</Badge>
                      ) : (
                        <Badge variant="destructive">Rejected</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.requested_by}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(r.requested_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{r.entity}</span>
                        <span className="text-xs text-muted-foreground">{r.country}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                            onClick={() => handleAction(r.id, 'approve')}
                            disabled={processingId === r.id}
                          >
                            {processingId === r.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle className="h-3 w-3 mr-1" />}
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="h-8"
                            onClick={() => handleAction(r.id, 'reject')}
                            disabled={processingId === r.id}
                          >
                            {processingId === r.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <XCircle className="h-3 w-3 mr-1" />}
                            Reject
                          </Button>
                        </div>
                      )}
                      {r.status === 'approved' && (
                        <span className="text-xs text-green-600 flex items-center justify-end gap-1">
                          <CheckCircle className="h-3 w-3" /> By {r.approved_by?.split('@')[0]}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}