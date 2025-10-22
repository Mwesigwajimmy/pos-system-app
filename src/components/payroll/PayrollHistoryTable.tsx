'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database } from '@/types/supabase';

type PayrollRun = Database['public']['Tables']['payroll_runs']['Row'];

// This component is designed to be highly readable and interactive.
export function PayrollHistoryTable({ runs }: { runs: PayrollRun[] }) {
  const router = useRouter();

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'COMPLETED': return 'default';
      case 'PENDING_APPROVAL': return 'secondary';
      case 'PROCESSING': return 'secondary';
      case 'FAILED': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="mt-8 border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Pay Period</TableHead>
            <TableHead>Run Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No payroll runs found.
              </TableCell>
            </TableRow>
          )}
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="font-medium">
                {format(new Date(run.period_start), "MMM dd, yyyy")} - {format(new Date(run.period_end), "MMM dd, yyyy")}
              </TableCell>
              <TableCell>{format(new Date(run.created_at), "MMM dd, yyyy 'at' hh:mm a")}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(run.status)}>{run.status.replace('_', ' ')}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => router.push(`/payroll/${run.id}/review`)}>
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}