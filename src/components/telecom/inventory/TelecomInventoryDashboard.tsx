'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Boxes } from "lucide-react";

interface InvItem { 
    id: string; 
    type: 'SIM' | 'DEVICE' | 'ROUTER' | 'ACCESSORY'; 
    label: string; // IMEI or Serial
    region: string; 
    outlet: string; 
    status: 'AVAILABLE' | 'ASSIGNED' | 'DEFECTIVE' | 'LOST'; 
    owner_name: string; 
    assigned_at: string; 
}

async function fetchInventory(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('telecom_inventory')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('assigned_at', { ascending: false })
    .limit(50);
  
  if (error) throw error; 
  return data as InvItem[];
}

export function TelecomInventoryDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
      queryKey: ['telecom-inventory', tenantId], 
      queryFn: () => fetchInventory(tenantId) 
  });

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'AVAILABLE': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Available</Badge>;
          case 'ASSIGNED': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Assigned</Badge>;
          case 'DEFECTIVE': return <Badge variant="destructive">Defective</Badge>;
          case 'LOST': return <Badge variant="destructive" className="bg-red-800">Lost</Badge>;
          default: return <Badge variant="secondary">{status}</Badge>;
      }
  };

  return (
    <Card className="h-full border-t-4 border-t-indigo-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-indigo-600"/> Asset Inventory
          </CardTitle>
          <CardDescription>Track SIM cards, devices, and network equipment distribution.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Asset Type</TableHead>
                <TableHead>Serial / IMEI</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Owner</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Last Update</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No inventory items found.</TableCell></TableRow>
                ) : (
                    data.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-700">{item.type}</TableCell>
                        <TableCell className="font-mono text-sm">{item.label}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{item.owner_name || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                            {item.region} {item.outlet ? `• ${item.outlet}` : ''}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                            {item.assigned_at ? format(new Date(item.assigned_at), 'MMM d, yyyy') : '-'}
                        </TableCell>
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