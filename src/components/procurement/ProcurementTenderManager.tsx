"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Tender {
  id: string;
  reference: string;
  title: string;
  status: string;
  closing_date: string;
  submissions_count: number;
  created_at: string;
  entity: string;
  country: string;
}

interface Props {
  tenantId: string;
}

export default function ProcurementTenderManager({ tenantId }: Props) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTenders = async () => {
      const { data } = await supabase
        .from('procurement_tenders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('closing_date', { ascending: true });

      if (data) setTenders(data as any);
      setLoading(false);
    };

    fetchTenders();
  }, [tenantId, supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Tenders & RFQs</CardTitle>
        <CardDescription>
          Launch, track, and evaluate all live tenders, competitive bids, and RFQs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-12 justify-center"><Loader2 className="w-8 h-8 animate-spin"/></div>
          : <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Bids</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenders.length === 0
                    ? <TableRow><TableCell colSpan={6} className="text-center">No active tenders.</TableCell></TableRow>
                    : tenders.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                             <Badge variant="outline">{t.status}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                          <TableCell className="font-medium">{t.title}</TableCell>
                          <TableCell>{new Date(t.closing_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-center">{t.submissions_count}</TableCell>
                          <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
        }
        <Button className="mt-4 flex items-center gap-2" variant="default">
          <Plus className="w-4 h-4"/>
          Post New Tender
        </Button>
      </CardContent>
    </Card>
  );
}