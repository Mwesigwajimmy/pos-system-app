"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Search, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

interface SupplierRisk {
  id: string;
  supplier_name: string;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_type: string;
  country: string;
  entity: string;
  details: string;
  is_active: boolean;
}

interface Props {
  tenantId?: string;
}

export default function SupplierRiskRegister({ tenantId }: Props) {
  const [rows, setRows] = useState<SupplierRisk[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if(!tenantId) return;

    const fetchData = async () => {
      const { data } = await supabase
        .from('supplier_risk_register')
        .select('*')
        .eq('tenant_id', tenantId);

      if (data) setRows(data as any);
      setLoading(false);
    };

    fetchData();
  }, [tenantId, supabase]);

  const filtered = useMemo(
    () => rows.filter(r =>
      r.supplier_name.toLowerCase().includes(filter.toLowerCase()) ||
      r.risk_type.toLowerCase().includes(filter.toLowerCase())
    ),
    [rows, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier Risk Register</CardTitle>
        <CardDescription>
          Monitor sanctions, performance issues, and compliance risks.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter supplier..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin" /></div>
          : <ScrollArea className="h-56">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={5}>No risk alerts found.</TableCell></TableRow>
                    : filtered.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-bold">{r.supplier_name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              r.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                              r.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                              r.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {r.risk_level.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell>{r.risk_type}</TableCell>
                          <TableCell>
                            {r.is_active
                              ? <div className="flex items-center text-yellow-600 gap-1"><AlertTriangle className="w-3 h-3"/> Active</div>
                              : <div className="flex items-center text-green-600 gap-1"><CheckCircle2 className="w-3 h-3"/> Resolved</div>
                            }
                          </TableCell>
                          <TableCell>{r.entity}</TableCell>
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