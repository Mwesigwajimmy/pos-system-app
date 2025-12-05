'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Search, X, RotateCcw } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';

async function fetchReturns() {
  const { data, error } = await createClient().rpc('get_returns_claims');
  if (error) throw error;
  return data;
}

export default function ReturnsClaimsManager() {
  const [filter, setFilter] = useState('');
  const { data: claims, isLoading } = useQuery({ queryKey: ['returnsClaims'], queryFn: fetchReturns });

  const filtered = useMemo(() => {
    if (!claims) return [];
    return claims.filter((c: any) =>
      (c.customer_name?.toLowerCase() || '').includes(filter.toLowerCase()) ||
      (c.order_number?.toLowerCase() || '').includes(filter.toLowerCase())
    );
  }, [claims, filter]);

  return (
    <Card className="h-full border-t-4 border-t-red-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-500"/> Returns & Claims
        </CardTitle>
        <CardDescription>Manage reverse logistics and customer claims.</CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Search returns..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 cursor-pointer text-muted-foreground" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Handled By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">No active returns.</TableCell></TableRow>
                ) : (
                  filtered.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.order_number || '-'}</TableCell>
                      <TableCell>{c.customer_name}</TableCell>
                      <TableCell>{c.region || 'N/A'}</TableCell>
                      <TableCell className="italic text-muted-foreground">{c.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`
                            ${c.status === 'approved' ? 'bg-green-50 text-green-700' : ''}
                            ${c.status === 'rejected' ? 'bg-red-50 text-red-700' : ''}
                            ${c.status === 'open' ? 'bg-yellow-50 text-yellow-700' : ''}
                        `}>
                            {c.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.handled_by_email || 'Unassigned'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}