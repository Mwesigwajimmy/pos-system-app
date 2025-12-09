'use client';

import LoanDetailView from '@/components/lending/LoanDetailView';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoanDetailPage({ params }: { params: { loanId: string } }) {
    const router = useRouter();
    // Convert string param to number for the component
    const loanId = parseInt(params.loanId, 10);

    return (
        <div className="p-8 space-y-6">
            <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => router.back()}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Portfolio
            </Button>
            
            {/* Uses your provided Logic/UI Component */}
            <LoanDetailView applicationId={loanId} />
        </div>
    );
}