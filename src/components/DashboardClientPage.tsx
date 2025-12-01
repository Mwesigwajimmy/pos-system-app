'use client';

import { useTenant } from '@/hooks/useTenant';
import { Loader2 } from 'lucide-react';

// --- Import All 11 Industry Views ---
import RetailDashboard from '@/components/dashboard-views/RetailDashboard';
import RestaurantDashboard from '@/components/dashboard-views/RestaurantDashboard';
import ContractorDashboard from '@/components/dashboard-views/ContractorDashboard';
import FieldServiceDashboard from '@/components/dashboard-views/FieldServiceDashboard';
import ProServicesDashboard from '@/components/dashboard-views/ProServicesDashboard';
import DistributionDashboard from '@/components/dashboard-views/DistributionDashboard';
import LendingDashboard from '@/components/dashboard-views/LendingDashboard';
import SaccoDashboard from '@/components/dashboard-views/SaccoDashboard';
import RealEstateDashboard from '@/components/dashboard-views/RealEstateDashboard';
import TelecomDashboard from '@/components/dashboard-views/TelecomDashboard';
import NonprofitDashboard from '@/components/dashboard-views/NonprofitDashboard';

export default function DashboardClientPage() {
    const { data: tenant, isLoading } = useTenant();

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-[70vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-semibold text-muted-foreground">Loading your workspace...</h2>
            </div>
        );
    }

    if (!tenant) return <div className="p-8">Error: No tenant profile found.</div>;

    const type = (tenant.business_type || '').toLowerCase();

    // --- LOGIC: 11 Distinct Routes ---

    // 1. Restaurant / Cafe
    if (type.includes('restaurant') || type.includes('cafe') || type.includes('bar')) {
        return <RestaurantDashboard />;
    }

    // 2. Retail / Wholesale (General)
    if (type.includes('retail') || type.includes('wholesale') || type.includes('shop') || type.includes('supermarket')) {
        return <RetailDashboard />;
    }

    // 3. Contractor (Construction, Remodeling)
    if (type.includes('contractor') || type.includes('construction') || type.includes('builder')) {
        return <ContractorDashboard />;
    }

    // 4. Field Service (HVAC, Plumbing, Trades)
    if (type.includes('field') || type.includes('hvac') || type.includes('plumbing') || type.includes('repair')) {
        return <FieldServiceDashboard />;
    }

    // 5. Professional Services (Legal, Accounting, Consulting)
    if (type.includes('professional') || type.includes('legal') || type.includes('account') || type.includes('consult')) {
        return <ProServicesDashboard />;
    }

    // 6. Distribution (Logistics)
    if (type.includes('distribution') || type.includes('logistics') || type.includes('delivery')) {
        return <DistributionDashboard />;
    }

    // 7. SACCO / Co-operative (Distinct from Lending)
    if (type.includes('sacco') || type.includes('co-op') || type.includes('union')) {
        return <SaccoDashboard />;
    }

    // 8. Lending / Microfinance
    if (type.includes('lending') || type.includes('microfinance') || type.includes('credit')) {
        return <LendingDashboard />;
    }

    // 9. Rentals / Real Estate
    if (type.includes('rent') || type.includes('estate') || type.includes('property')) {
        return <RealEstateDashboard />;
    }

    // 10. Telecom Services
    if (type.includes('telecom') || type.includes('airtime') || type.includes('mobile')) {
        return <TelecomDashboard />;
    }

    // 11. Nonprofit
    if (type.includes('nonprofit') || type.includes('charity') || type.includes('ngo')) {
        return <NonprofitDashboard />;
    }

    // Fallback
    return <RetailDashboard />;
}