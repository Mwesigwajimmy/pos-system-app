'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { RepaymentScheduleTable } from '@/components/lending/RepaymentScheduleTable';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

async function fetchUserContext() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');
    const { data } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
    return data?.business_id;
}

export default function LoanSchedulePage({ params }: { params: { loanId: string } }) {
    const router = useRouter();
    const { data: tenantId, isLoading } = useQuery({
        queryKey: ['tenantId'],
        queryFn: fetchUserContext
    });

    if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;
    if (!tenantId) return <div className="p-8 text-red-600">Error: Configuration Missing.</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Loan
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Repayment Schedule</h2>
                    <p className="text-muted-foreground text-sm">Loan #{params.loanId}</p>
                </div>
            </div>

            {/* The Detailed Table Component */}
            <RepaymentScheduleTable tenantId={tenantId} loanId={params.loanId} />
        </div>
    );
}