'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Phone, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Donor {
  id: string; name: string; email: string; phone: string; type: string; status: string;
}

interface Donation {
  id: string; amount: number; currency: string; method: string; date: string; campaign_id?: string;
}

async function fetchDonor(tenantId: string, donorId: string) {
  const db = createClient();
  const { data, error } = await db.from('donors').select('*').eq('id', donorId).eq('tenant_id', tenantId).single();
  if (error) throw error; return data as Donor;
}

async function fetchDonorDonations(tenantId: string, donorId: string) {
  const db = createClient();
  const { data, error } = await db.from('donations').select('*').eq('tenant_id', tenantId).eq('donor_id', donorId).order('date', { ascending: false });
  if (error) throw error; return data as Donation[];
}

export function DonorProfile({ tenantId, donorId }: { tenantId: string, donorId: string }) {
  const { data: donor, isLoading: donorLoading } = useQuery({ 
    queryKey: ['donor', tenantId, donorId], 
    queryFn: () => fetchDonor(tenantId, donorId) 
  });
  
  const { data: donations, isLoading: donationsLoading } = useQuery({ 
    queryKey: ['donor-donations', tenantId, donorId], 
    queryFn: () => fetchDonorDonations(tenantId, donorId) 
  });

  if (donorLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;
  if (!donor) return <div className="text-red-500">Donor not found</div>;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{donor.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{donor.type}</Badge>
                <Badge className={donor.status === 'Active' ? 'bg-green-600' : 'bg-slate-500'}>{donor.status}</Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Mail className="w-4 h-4 text-slate-400" /> {donor.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Phone className="w-4 h-4 text-slate-400" /> {donor.phone || "N/A"}
          </div>
        </CardContent>
      </Card>

      {/* Donation History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" /> Donation History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-t">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Campaign Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donationsLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-20">Loading history...</TableCell></TableRow>
                ) : donations?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-20 text-muted-foreground">No donations yet.</TableCell></TableRow>
                ) : (
                  donations?.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-400"/>
                          {format(new Date(d.date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-green-700">
                        {d.currency} {d.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{d.method}</TableCell>
                      <TableCell className="text-slate-500 text-xs font-mono">{d.campaign_id || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}