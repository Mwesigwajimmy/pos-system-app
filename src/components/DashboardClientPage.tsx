'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { Loader2 } from 'lucide-react';
import AuraForensicGuard from '@/components/AuraForensicGuard';
import { motion, AnimatePresence } from 'framer-motion';

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

/**
 * --- BBU1 SOVEREIGN DASHBOARD ENGINE ---
 * VERSION: v21.4 (THE END-OF-VIEW AWAKENING)
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. SCROLL TELEMETRY: Added a real-time scroll observer to detect when 
 *    the operator reaches the floor of the dashboard.
 * 2. CONDITIONAL AWAKENING: Aura Forensic bar now remains dormant until 
 *    the workspace has been fully consumed.
 * 3. KINETIC SLIDE: Integrated Framer Motion for a bottom-anchored 
 *    entrance to prevent UI overlapping.
 */

export default function DashboardClientPage() {
    const { data: tenant, isLoading } = useTenant();
    const [isAtBottom, setIsAtBottom] = useState(false);

    // --- SCROLL DETECTION ENGINE ---
    useEffect(() => {
        const handleScroll = () => {
            // Calculate total scrollable height vs current position
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY || document.documentElement.scrollTop;

            // Trigger point: 100px before reaching the actual bottom
            const triggerPoint = documentHeight - windowHeight - 100;

            if (scrollTop >= triggerPoint) {
                setIsAtBottom(true);
            } else {
                setIsAtBottom(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Run once on mount to check if page is already short enough to show bottom
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-[70vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Synchronizing Node...</h2>
            </div>
        );
    }

    if (!tenant) return <div className="p-8">Identity Desync: No tenant profile detected.</div>;

    const type = (tenant.business_type || '').toLowerCase();

    const renderDashboard = () => {
        if (type.includes('restaurant') || type.includes('cafe') || type.includes('bar')) return <RestaurantDashboard />;
        if (type.includes('retail') || type.includes('wholesale') || type.includes('shop') || type.includes('supermarket')) return <RetailDashboard />;
        if (type.includes('contractor') || type.includes('construction') || type.includes('builder')) return <ContractorDashboard />;
        if (type.includes('field') || type.includes('hvac') || type.includes('plumbing') || type.includes('repair')) return <FieldServiceDashboard />;
        if (type.includes('professional') || type.includes('legal') || type.includes('account') || type.includes('consult')) return <ProServicesDashboard />;
        if (type.includes('distribution') || type.includes('logistics') || type.includes('delivery')) return <DistributionDashboard />;
        if (type.includes('sacco') || type.includes('co-op') || type.includes('union')) return <SaccoDashboard />;
        if (type.includes('lending') || type.includes('microfinance') || type.includes('credit')) return <LendingDashboard />;
        if (type.includes('rent') || type.includes('estate') || type.includes('property')) return <RealEstateDashboard />;
        if (type.includes('telecom') || type.includes('airtime') || type.includes('mobile')) return <TelecomDashboard />;
        if (type.includes('nonprofit') || type.includes('charity') || type.includes('ngo')) return <NonprofitDashboard />;
        
        return <RetailDashboard />;
    };

    return (
        <div className="relative min-h-screen">
            {/* The Main Dashboard Content */}
            <div className="pb-32"> {/* Extra padding to allow scrolling past content to reveal Aura */}
                {renderDashboard()}
            </div>

            {/* --- AURA AWAKENING WELD --- */}
            <AnimatePresence>
                {isAtBottom && (
                    <motion.div 
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-[999]"
                    >
                        <AuraForensicGuard />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}