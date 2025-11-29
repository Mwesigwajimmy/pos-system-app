'use client';

import React, { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

interface Screening {
  id: string;
  party: string;
  result: "clear" | "flagged";
  checked_at: string;
  matched_list: string;
}

export default function SanctionsScreeningTable() {
  const supabase = createClient();
  const [data, setData] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data } = await supabase.from('sanctions_screenings').select('*').order('checked_at', { ascending: false });
        setData(data as Screening[] || []);
        setLoading(false);
    };
    fetch();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sanctions Screening Log</CardTitle>
        <CardDescription>OFAC/EU/UN Watchlist checks.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="animate-spin mx-auto"/> :
        <Table>
            <TableHeader><TableRow><TableHead>Party</TableHead><TableHead>Date Checked</TableHead><TableHead>Result</TableHead><TableHead>Match Info</TableHead></TableRow></TableHeader>
            <TableBody>
                {data.map(s => (
                    <TableRow key={s.id}>
                        <TableCell>{s.party}</TableCell>
                        <TableCell>{new Date(s.checked_at).toLocaleString()}</TableCell>
                        <TableCell>
                            {s.result === 'clear' ? 
                                <span className="flex items-center text-green-700"><ShieldCheck className="w-4 h-4 mr-1"/> Clear</span> : 
                                <span className="flex items-center text-red-700 font-bold"><ShieldAlert className="w-4 h-4 mr-1"/> Flagged</span>
                            }
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.matched_list || '-'}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        }
      </CardContent>
    </Card>
  );
}