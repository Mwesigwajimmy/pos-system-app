'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Loader2, HeartHandshake } from "lucide-react";

// --- Types ---
interface Beneficiary { 
  id: string; 
  first_name?: string;
  last_name?: string;
  name?: string; // Fallback if schema differs
  program: string | null; 
  status: string; // e.g. 'Active', 'Graduated'
  gender: string | null; 
  age: number | null;
  created_at: string;
}

interface BeneficiaryListProps {
  tenant: {
    tenantId: string;
    currency: string;
  };
}

// --- Data Fetching ---
async function fetchBeneficiaries(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('beneficiaries')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50); // Performance limit
  
  if (error) throw error; 
  return data as Beneficiary[];
}

// --- Component ---
export default function BeneficiaryList({ tenant }: BeneficiaryListProps) {
  const { tenantId } = tenant;

  const { data, isLoading } = useQuery({ 
    queryKey: ['beneficiaries', tenantId], 
    queryFn: () => fetchBeneficiaries(tenantId) 
  });

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active') return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
    if (s === 'graduated') return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
    if (s === 'waitlist') return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getDisplayName = (b: Beneficiary) => {
    if (b.name) return b.name;
    return `${b.first_name || ''} ${b.last_name || ''}`.trim() || 'Anonymous';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-rose-500"/> 
          Beneficiaries Directory
        </CardTitle>
        <CardDescription>Recent individuals enrolled in your programs.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead className="text-right">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">Loading beneficiaries...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No beneficiaries found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{getDisplayName(b)}</TableCell>
                    <TableCell className="text-muted-foreground">{b.program || 'General'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-normal ${getStatusBadge(b.status)}`}>
                        {b.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{b.gender || '-'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{b.age || '-'}</TableCell>
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