'use client';

import React from "react";
import { useQuery } from '@tanstack/react-query'; // FIX: Added for enterprise-grade caching
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const supabase = createClient();

interface Regulation {
  id: string;
  name: string;
  jurisdiction: string;
  entity: string;
  next_due: string;
  status: "compliant" | "pending" | "overdue";
}

// FIX: Added businessId prop for smart jurisdictional isolation
interface RegulationsRegisterProps {
  businessId: string;
}

export default function RegulationsRegister({ businessId }: RegulationsRegisterProps) {
  
  // FIX: Replaced useEffect with useQuery for background sync and zero-latency navigation
  const { data: regs, isLoading, isError } = useQuery({
    queryKey: ['regulations', businessId],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('regulations')
            .select('*')
            .eq('business_id', businessId); // isolation logic
            
        if (error) throw error;
        return data as Regulation[];
    },
    staleTime: 1000 * 60 * 5, // Keep data fresh for 5 minutes
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Regulations Register</CardTitle>
        <CardDescription>Legal framework compliance monitoring.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center text-slate-400">
             <Loader2 className="animate-spin w-8 h-8 mb-2"/>
             <p className="text-sm italic">Verifying legal ledger...</p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
             <AlertTriangle className="w-5 h-5"/>
             <p className="text-sm">Failed to synchronize regulations.</p>
          </div>
        ) : (
        <Table>
            <TableHeader>
                <TableRow className="bg-slate-50/50">
                    <TableHead>Regulation</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {regs?.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-slate-400 italic">
                            No registered regulations found for this jurisdiction.
                        </TableCell>
                    </TableRow>
                ) : (
                    regs?.map(r => (
                        <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                            <TableCell className="text-slate-600">{r.jurisdiction}</TableCell>
                            <TableCell className="text-slate-500 font-mono text-xs">{r.next_due}</TableCell>
                            <TableCell>
                                {r.status === 'compliant' ? (
                                    <span className="text-green-600 flex items-center gap-1.5 font-medium">
                                        <CheckCircle2 className="w-4 h-4"/> 
                                        Compliant
                                    </span>
                                ) : (
                                    <span className={`capitalize font-medium ${
                                        r.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                                    }`}>
                                        {r.status}
                                    </span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}