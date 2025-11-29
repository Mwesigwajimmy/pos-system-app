'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Loader2, TrendingUp, AlertCircle, Calendar } from "lucide-react";

// Strict Interface for Supabase Join
interface Donor { id: string; name: string; }
interface Campaign { id: string; name: string; }

interface Donation { 
  id: string; 
  donor: Donor | null; // Joined table
  campaign: Campaign | null; // Joined table
  amount: number; 
  currency: string; 
  method: string; 
  date: string; 
  notes?: string; 
}

async function fetchDonations(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('donations')
    .select(`
      *,
      donor:donors(id, name),
      campaign:communication_campaigns(id, name)
    `)
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .limit(100);

  if (error) throw error; 
  return data as unknown as Donation[];
}

export function DonationList({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ['donations', tenantId], 
    queryFn: () => fetchDonations(tenantId) 
  });

  const formatMoney = (amount: number, currency: string) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-center p-6 text-red-600 gap-2">
          <AlertCircle className="w-5 h-5"/> Failed to load donations.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" /> 
          Recent Donations
        </CardTitle>
        <CardDescription>A list of recent contributions from your donors.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Donor Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[200px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No donations recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">
                      {d.donor?.name || "Anonymous / Unknown"}
                    </TableCell>
                    <TableCell className="font-bold text-green-700">
                      {formatMoney(d.amount, d.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase">
                        {d.method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {d.campaign?.name || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3"/>
                        {format(new Date(d.date), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 truncate max-w-[200px]" title={d.notes}>
                      {d.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}