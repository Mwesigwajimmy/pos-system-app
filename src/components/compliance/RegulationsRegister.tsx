'use client';

import React, { useState, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, CheckCircle2 } from "lucide-react";

interface Regulation {
  id: string;
  name: string;
  jurisdiction: string;
  entity: string;
  next_due: string;
  status: "compliant" | "pending" | "overdue";
}

export default function RegulationsRegister() {
  const supabase = createClient();
  const [regs, setRegs] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data } = await supabase.from('regulations').select('*');
        setRegs(data as Regulation[] || []);
        setLoading(false);
    };
    fetch();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regulations Register</CardTitle>
        <CardDescription>Legal framework compliance monitoring.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="animate-spin mx-auto"/> :
        <Table>
            <TableHeader><TableRow><TableHead>Regulation</TableHead><TableHead>Jurisdiction</TableHead><TableHead>Next Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
                {regs.map(r => (
                    <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.jurisdiction}</TableCell>
                        <TableCell>{r.next_due}</TableCell>
                        <TableCell>
                            {r.status === 'compliant' ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Compliant</span> : 
                             <span className="text-yellow-600 capitalize">{r.status}</span>}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        }
      </CardContent>
    </Card>
  );
}