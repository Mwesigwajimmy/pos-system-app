'use client';

/**
 * --- BBU1 SOVEREIGN DASHBOARD ENGINE ---
 * VERSION: v21.6 OMEGA-ULTIMATUM (THE PURE VIEW WELD)
 * JURISDICTION: Multi-Tenant / Multi-Sector / Global ERP
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. UI PURIFICATION: Completely removed the Aura Forensic overlay and 
 *    associated scroll detection logic to eliminate visual interference.
 * 2. STRUCTURAL STABILITY: Restored the viewport to a clean flex-container 
 *    focused exclusively on industry-specific telemetry.
 * 3. IDENTITY FOCUS: Authoritatively maps the correct dashboard view 
 *    based on the synchronized tenant profile.
 */

import React from 'react';
import { useTenant } from '@/hooks/useTenant';
import { Loader2 } from 'lucide-react';

// --- Import All 11 Industry Views (100% PRESERVED) ---
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

    // 🟢 SYNCHRONIZATION STATE
    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-[70vh]">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <h2 className="text-xs font-black uppercase tracking-[0.5em] text-slate-400 animate-pulse">
                    Synchronizing Workspace...
                </h2>
            </div>
        );
    }

    if (!tenant) return <div className="p-8 font-black text-rose-500 uppercase tracking-tighter">Identity Desync: No tenant profile found.</div>;

    const type = (tenant.business_type || '').toLowerCase();

    /**
     * --- INDUSTRY RESOLUTION ENGINE ---
     * Authoritatively maps the node industry to the correct UI view.
     */
    const renderDashboard = () => {
        // 1. Restaurant / Cafe / Bar
        if (type.includes('restaurant') || type.includes('cafe') || type.includes('bar')) {
            return <RestaurantDashboard />;
        }

        // 2. Retail / Wholesale / General Trade
        if (type.includes('retail') || type.includes('wholesale') || type.includes('shop') || type.includes('supermarket')) {
            return <RetailDashboard />;
        }

        // 3. Contractor / Construction
        if (type.includes('contractor') || type.includes('construction') || type.includes('builder')) {
            return <ContractorDashboard />;
        }

        // 4. Field Service / Trades
        if (type.includes('field') || type.includes('hvac') || type.includes('plumbing') || type.includes('repair')) {
            return <FieldServiceDashboard />;
        }

        // 5. Professional Services
        if (type.includes('professional') || type.includes('legal') || type.includes('account') || type.includes('consult')) {
            return <ProServicesDashboard />;
        }

        // 6. Distribution / Logistics
        if (type.includes('distribution') || type.includes('logistics') || type.includes('delivery')) {
            return <DistributionDashboard />;
        }

        // 7. SACCO / Co-operative
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

        // 11. Nonprofit / NGO
        if (type.includes('nonprofit') || type.includes('charity') || type.includes('ngo')) {
            return <NonprofitDashboard />;
        }

        // Authoritative Fallback
        return <RetailDashboard />;
    };

    return (
        <div className="relative w-full bg-transparent min-h-screen">
            {/* 
               ✅ UI WELD COMPLETE: 
               The dashboard content is now rendered in a pure state 
               without any overlapping AI bars or scroll listeners.
            */}
            {renderDashboard()}
        </div>
    );
}