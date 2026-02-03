"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, FileText, Globe, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

// ENTERPRISE TYPE ALIGNMENT: Matches DB Interconnect View 1:1
interface Tender {
  id: string;
  tender_no: string; // Matches upgraded DB column
  title: string;
  status: "open" | "closed" | "awarded" | "cancelled" | string;
  budget: number;    // From DB schema
  closing_date: string;
  submissions_count: number; // From SQL view subquery
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
    if (!tenantId) return;

    const fetchTenders = async () => {
      // Logic interconnected to the high-performance view
      const { data } = await supabase
        .from('view_procurement_tenders_with_counts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('closing_date', { ascending: true });

      if (data) setTenders(data as any);
      setLoading(false);
    };

    fetchTenders();
  }, [tenantId, supabase]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Live Bidding</Badge>;
      case 'closed': return <Badge variant="secondary">Evaluation</Badge>;
      case 'awarded': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Awarded</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="border-t-4 border-t-purple-600 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-purple-600" /> Procurement Tenders & RFQs
          </CardTitle>
          <CardDescription>
            Launch, track, and evaluate all live tenders, competitive bids, and RFQs.
          </CardDescription>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2">
          <Plus className="w-4 h-4"/> Post New Tender
        </Button>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-20 justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500"/></div>
          : <ScrollArea className="h-96 rounded-md border">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead>Ref & Entity</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="text-center">Bids</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenders.length === 0
                    ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No active tenders found.</TableCell></TableRow>
                    : tenders.map((t) => (
                        <TableRow key={t.id} className="hover:bg-purple-50/30 transition-colors">
                          <TableCell>
                             {getStatusBadge(t.status)}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs font-bold text-slate-600">{t.tender_no || t.id.split('-')[0].toUpperCase()}</div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase mt-1">
                               <Globe className="h-2 w-2" /> {t.country || 'Global'} / {t.entity || 'Corp'}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate" title={t.title}>
                             {t.title}
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">
                             {(Number(t.budget) || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">USD</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className={new Date(t.closing_date) < new Date() ? "text-red-500 font-bold" : ""}>
                               {new Date(t.closing_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono px-3">
                               {t.submissions_count || 0}
                            </Badge>
                          </TableCell>
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