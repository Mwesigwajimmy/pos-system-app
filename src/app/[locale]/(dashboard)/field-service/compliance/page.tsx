import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// FIX 1: Use Default Imports to match the Component definitions
import RegulatoryComplianceManager from '@/components/field-service/compliance/RegulatoryComplianceManager';
import WarrantyAndContractManager from '@/components/field-service/compliance/WarrantyAndContractManager';

export default async function CompliancePage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Supabase Client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/${locale}/auth/login`);
    }

    // 3. Fetch Tenant Context from 'profiles'
    // We fetch 'country' as well because RegulatoryComplianceManager requires it
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency, country") 
        .eq("id", user.id)
        .single();

    // 4. Enterprise Security Validation
    if (error || !profile?.business_id) {
        return (
            <div className="flex h-[50vh] items-center justify-center p-8 text-destructive">
                Unauthorized: No Business linked to this account.
            </div>
        );
    }

    // 5. Construct Tenant Context
    // We combine requirements for both components (Currency, Country, TenantId)
    const tenantContext = {
        tenantId: profile.business_id,
        country: profile.country || 'US', // Fallback for compliance regulations
        currency: profile.currency || 'USD'
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Compliance & Warranty</h2>
                    <p className="text-muted-foreground">
                        Monitor regulatory adherence, safety permits, and service contracts.
                    </p>
                </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                {/* 
                    COMPONENT 1: Regulatory Documents
                    Note: We pass workOrderId={0} to imply "Global/Company Level" documents, 
                    assuming your API handles ID 0 as a general bucket.
                */}
                <RegulatoryComplianceManager 
                    workOrderId={0} 
                    tenant={tenantContext}
                />
                
                {/* 
                    COMPONENT 2: Warranty & Contracts
                    Note: We pass equipmentId={0} to imply "All Equipment" or "General Contracts".
                */}
                <WarrantyAndContractManager 
                    equipmentId={0}
                    tenant={tenantContext}
                />
            </div>
        </div>
    );
}