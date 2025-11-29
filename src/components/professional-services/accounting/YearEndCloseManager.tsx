'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArchiveRestore } from 'lucide-react';

interface TenantContext { tenantId: string; currency: string; }

async function yearEndClose(year: number, tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('process_year_end_close', { p_year: year, p_tenant_id: tenantId });
  if (error) throw error;
  return data;
}

export default function YearEndCloseManager({ tenant }: { tenant: TenantContext }) {
  const [year, setYear] = useState<number>(new Date().getFullYear() - 1); // Default to previous year
  
  const mutation = useMutation({
    mutationFn: () => yearEndClose(year, tenant.tenantId),
    onSuccess: () => toast.success(`Fiscal year ${year} closed successfully. Retained earnings updated.`),
    onError: e => toast.error(e.message || 'Year-end close failed'),
  });

  return (
    <Card className="max-w-xl mx-auto border-t-4 border-t-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ArchiveRestore className="w-5 h-5 text-amber-600"/> Year-End Close</CardTitle>
        <CardDescription>
          This process will close out all Income and Expense accounts to Retained Earnings for the selected fiscal year.
          This action is irreversible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex-1">
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Fiscal Year to Close</label>
            <Input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="bg-white"
            />
          </div>
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending}
            variant="destructive"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
            Execute Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}