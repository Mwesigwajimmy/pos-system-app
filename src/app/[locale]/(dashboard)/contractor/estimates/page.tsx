import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Import the real components
import { EstimateList } from '@/components/contractor/estimates/EstimateList';
import { CreateEstimateModal } from '@/components/contractor/estimates/CreateEstimateModal';

// Data fetching function for all estimates
async function getAllEstimates(supabase: any) {
    const { data, error } = await supabase
        .from('estimates')
        .select(`
            id,
            estimate_uid,
            title,
            status,
            total_amount,
            valid_until,
            created_at,
            customers ( id, name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching estimates:", error);
        return [];
    }

    return data;
}

export default async function ContractorEstimatesPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    // Add auth check here if needed
    
    const estimates = await getAllEstimates(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Estimates & Bids</h2>
                    <p className="text-muted-foreground">
                        Create, send, and track the status of your quotes.
                    </p>
                </div>
                <CreateEstimateModal />
            </div>

            {/* The main data table displaying all estimates */}
            <EstimateList estimates={estimates} />
        </div>
    );
}