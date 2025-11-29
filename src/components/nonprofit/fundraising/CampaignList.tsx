'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from 'lucide-react';

interface Campaign { 
  id: string; name: string; goal: number; raised: number; start: string; end: string; status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

async function fetchCampaigns(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from('fundraising_campaigns').select('*').eq('tenant_id', tenantId).order('start', { ascending: false });
  if (error) throw error; return data as Campaign[];
}

export function CampaignList({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ queryKey:['campaigns', tenantId], queryFn:() => fetchCampaigns(tenantId) });

  return (
    <Card>
      <CardHeader><CardTitle>Fundraising Campaigns</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Raised / Goal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timeline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : data?.map((c) => {
                const percent = Math.min((c.raised / c.goal) * 100, 100);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="w-[150px]">
                      <Progress value={percent} className="h-2" />
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {c.raised.toLocaleString()} / {c.goal.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'ACTIVE' ? 'default' : 'secondary'}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(c.start), "MMM d")} - {format(new Date(c.end), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}