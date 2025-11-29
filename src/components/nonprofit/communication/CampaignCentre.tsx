'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CreateCommCampaignModal } from './CreateCommCampaignModal';
import { createClient } from "@/lib/supabase/client";
import { Plus, Megaphone, Loader2 } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  channel: string;
  scheduled: string;
  sent: boolean;
  recipients: number;
  status: 'Scheduled' | 'Sent' | 'Draft' | 'Cancelled';
}

async function fetchCommsCampaigns(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('communication_campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('scheduled', { ascending: false });
  
  if (error) throw error; 
  return data as Campaign[];
}

export function CampaignCenter({ tenantId }: { tenantId: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['comms-campaigns', tenantId],
    queryFn: () => fetchCommsCampaigns(tenantId)
  });

  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> 
            Campaign Center
          </CardTitle>
          <CardDescription>
            Manage and schedule mass communications for your organization.
          </CardDescription>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </CardHeader>
      
      <CardContent>
        <CreateCommCampaignModal 
          open={modalOpen} 
          onClose={() => setModalOpen(false)} 
          tenantId={tenantId} 
          onComplete={refetch} 
        />
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead className="text-center">Recipients</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Execution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-2 block">Loading campaigns...</span>
                  </TableCell>
                </TableRow>
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No active campaigns found. Click "New Campaign" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.channel}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(c.scheduled), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="text-center font-mono">{c.recipients}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={c.status === 'Sent' ? 'default' : c.status === 'Scheduled' ? 'secondary' : 'outline'}
                        className={c.status === 'Sent' ? 'bg-green-600' : ''}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.sent ? (
                        <span className="text-green-600 font-semibold text-xs">Completed</span>
                      ) : (
                        <span className="text-amber-600 font-semibold text-xs">Pending</span>
                      )}
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