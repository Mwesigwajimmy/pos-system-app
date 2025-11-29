'use client';

import React, { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, ShieldCheck, AlertOctagon, UserCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface KYCRecord {
  id: string;
  name: string;
  type: string;
  entity: string;
  country: string;
  kyc_status: "verified" | "pending" | "flagged";
  aml_risk: "low" | "medium" | "high";
  last_reviewed: string;
}

export default function KycAmlMonitor() {
  const supabase = createClient();
  const [clients, setClients] = useState<KYCRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data } = await supabase.from('kyc_records').select('*');
        setClients(data as KYCRecord[] || []);
        setLoading(false);
    };
    fetch();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC & AML Monitor</CardTitle>
        <CardDescription>Real-time risk scoring for onboarded entities.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin"/></div> :
        <ScrollArea className="h-[350px]">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Entity Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>AML Risk</TableHead>
                <TableHead>Last Review</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {clients.map(c => (
                <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>{c.entity} ({c.country})</TableCell>
                    <TableCell>
                        {c.kyc_status === 'verified' ? 
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><UserCheck className="w-3 h-3 mr-1"/>Verified</Badge> :
                         c.kyc_status === 'flagged' ? 
                            <Badge variant="destructive">Flagged</Badge> :
                            <Badge variant="secondary">Pending</Badge>
                        }
                    </TableCell>
                    <TableCell>
                        <span className={`font-bold ${c.aml_risk === 'high' ? 'text-red-600' : c.aml_risk === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {c.aml_risk.toUpperCase()}
                        </span>
                    </TableCell>
                    <TableCell>{c.last_reviewed ? new Date(c.last_reviewed).toLocaleDateString() : 'Never'}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </ScrollArea>
        }
      </CardContent>
    </Card>
  );
}