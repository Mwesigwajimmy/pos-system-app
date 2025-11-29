'use client';

import * as React from "react";
// FIX: Import keepPreviousData
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Search } from "lucide-react";

interface Subscriber { 
    id: string; 
    msisdn: string; 
    name: string; 
    status: 'ACTIVE' | 'BARRED' | 'CHURNED'; 
    kyc_status: 'VERIFIED' | 'PENDING' | 'FAILED'; 
    active_product: string; 
    region: string; 
    account_type: 'PREPAID' | 'POSTPAID'; 
}

async function fetchSubscribers(tenantId: string, search: string) {
  const db = createClient();
  let query = db
    .from('subscribers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (search) {
      query = query.or(`name.ilike.%${search}%,msisdn.ilike.%${search}%`);
  }
  
  const { data, error } = await query;
  if (error) throw error; 
  return data as Subscriber[];
}

export function SubscriberManager({ tenantId }: { tenantId: string }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const { data, isLoading, refetch } = useQuery({ 
      queryKey: ['subscribers', tenantId, searchTerm], 
      queryFn: () => fetchSubscribers(tenantId, searchTerm),
      // FIX: Use placeholderData instead of keepPreviousData: true
      placeholderData: keepPreviousData
  });

  return (
    <Card className="h-full border-t-4 border-t-green-600 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600"/> Subscriber Base
          </CardTitle>
          <div className="flex gap-2">
              <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
                  <Input 
                    placeholder="Search MSISDN or Name" 
                    className="pl-9 w-[250px]" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              <Button onClick={() => refetch()}>Search</Button>
          </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>MSISDN</TableHead>
                <TableHead>Subscriber Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Region</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No subscribers found.</TableCell></TableRow>
                ) : (
                    data.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-sm font-medium">{s.msisdn}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{s.account_type}</Badge></TableCell>
                        <TableCell>
                            <Badge variant={s.kyc_status === 'VERIFIED' ? 'default' : 'destructive'} className={s.kyc_status === 'VERIFIED' ? 'bg-green-600' : ''}>
                                {s.kyc_status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <span className={`text-xs font-semibold ${s.status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}`}>
                                {s.status}
                            </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.active_product}</TableCell>
                        <TableCell className="text-xs">{s.region}</TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  )
}