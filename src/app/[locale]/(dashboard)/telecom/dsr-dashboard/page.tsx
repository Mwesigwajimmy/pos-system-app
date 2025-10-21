// src/app/(dashboard)/telecom/dsr-dashboard/page.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

// --- UI & Icon Imports ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, Power, Banknote, Wallet, FileText, Zap } from 'lucide-react';

// --- Child Component Imports ---
import { StartShiftCard } from '@/components/dsr/StartShiftCard';
import { RecordActivityForm } from '@/components/dsr/RecordActivityForm';
import { EndShiftDialog } from '@/components/dsr/EndShiftDialog';
import { CashDepositForm } from '@/components/dsr/CashDepositForm';
import { UploadReceiptCard } from '@/components/dsr/UploadReceiptCard';

// --- DATA TYPES ---
interface DsrShift { id: number; opening_float_balance: number; opening_cash_balance: number; location_name: string; }
interface Service { id: number; service_name: string; }
interface Location { id: string; name: string; }
interface Transaction { id: number; created_at: string; transaction_type: string; amount: number; notes: string | null; customer_phone: string | null; service_id: number | null; }
interface ShiftBalances { current_float: number; current_cash: number; }

// ===================================================================
// ACTIVE SHIFT DASHBOARD CONTAINER
// ===================================================================
function ActiveShiftDashboard({ activeShift }: { activeShift: DsrShift }) {
    const supabase = createClient();
    const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);

    const { data: services, isLoading: isLoadingServices } = useQuery({
        queryKey: ['allTelecomServices'],
        queryFn: async (): Promise<Service[]> => {
            const { data, error } = await supabase.rpc('get_all_telecom_services');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
        queryKey: ['activeShiftTransactions', activeShift.id],
        queryFn: async (): Promise<Transaction[]> => {
            const { data, error } = await supabase.from('telecom_transactions').select('*').eq('shift_id', activeShift.id).order('created_at', { ascending: false }).limit(50);
            if (error) throw new Error(error.message);
            return data || [];
        },
        refetchInterval: 5000,
    });

    const liveBalances = useMemo<ShiftBalances>(() => {
        if (!transactions) return { current_float: activeShift.opening_float_balance, current_cash: activeShift.opening_cash_balance };
        let current_cash = activeShift.opening_cash_balance;
        for (const tx of transactions) {
            if (tx.transaction_type === 'Sale') current_cash += tx.amount;
            else if (['Mobile Money Disbursement', 'Expense', 'Cash Deposit'].includes(tx.transaction_type)) current_cash -= tx.amount;
        }
        return { current_float: activeShift.opening_float_balance, current_cash };
    }, [transactions, activeShift]);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">DSR Field Dashboard</h1>
                    <p className="text-muted-foreground">Shift ID: {activeShift.id} | Location: {activeShift.location_name}</p>
                </div>
                <Button variant="destructive" onClick={() => setIsEndShiftOpen(true)} className="mt-4 sm:mt-0">
                    <Power className="mr-2 h-4 w-4" /> End Shift & Reconcile
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card><CardHeader><CardTitle className="flex items-center"><Banknote className="mr-2"/> Live Cash</CardTitle></CardHeader><CardContent className="text-2xl font-bold">UGX {liveBalances.current_cash.toLocaleString()}</CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center"><Zap className="mr-2"/> Opening Float</CardTitle></CardHeader><CardContent className="text-2xl font-bold">UGX {activeShift.opening_float_balance.toLocaleString()}</CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center"><Wallet className="mr-2"/> Sales Today</CardTitle></CardHeader><CardContent className="text-2xl font-bold">UGX {transactions?.filter(tx => tx.transaction_type === 'Sale').reduce((sum, tx) => sum + tx.amount, 0).toLocaleString() || 0}</CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {isLoadingServices ? (
                        <Card><CardContent className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /> Loading...</CardContent></Card>
                    ) : (
                        <RecordActivityForm services={services || []} />
                    )}
                    <CashDepositForm />
                    <UploadReceiptCard shiftId={activeShift.id} />
                </div>
                <Card>
                    <CardHeader><CardTitle>Live Transaction Log</CardTitle></CardHeader>
                    <CardContent>
                        {(isLoadingTransactions && !transactions) ? (
                             <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (transactions?.length === 0) ? (
                            <p className="text-muted-foreground text-center py-4">No transactions recorded yet.</p>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                {transactions?.map(tx => (
                                    <div key={tx.id} className="text-sm p-3 border-b hover:bg-muted/50 rounded-md">
                                        <div className="flex justify-between font-bold">
                                            <span>{tx.transaction_type}</span>
                                            <span className={tx.transaction_type === 'Sale' ? "text-green-600" : "text-red-600"}>
                                                {tx.transaction_type === 'Sale' ? '+' : '-'} UGX {tx.amount.toLocaleString()}
                                            </span>
                                        </div>
                                        {tx.notes && <p className="text-muted-foreground italic text-xs mt-1">"{tx.notes}"</p>}
                                        <p className="text-xs text-right text-gray-400 mt-1">{format(new Date(tx.created_at), 'MMM dd, p')}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <EndShiftDialog isOpen={isEndShiftOpen} onClose={() => setIsEndShiftOpen(false)} />
        </div>
    );
}

// ===================================================================
// MAIN PAGE LOADER & STATE MANAGER
// ===================================================================
export default function DsrDashboardPage() {
    const supabase = createClient();

    // THIS IS THE FIX: Explicitly typing the Supabase RPC response
    const { data: activeShift, isLoading: isLoadingShift, error: shiftError } = useQuery({
        queryKey: ['activeDsrShift'],
        queryFn: async (): Promise<DsrShift | null> => {
            // By adding `<DsrShift>` here, we tell Supabase what to expect.
            const { data, error } = await supabase.rpc('get_my_active_shift').single<DsrShift>();

            if (error && error.code !== 'PGRST116') { // Ignore "No rows found" error
                throw new Error(error.message);
            }
            // Now `data` is correctly typed as `DsrShift | null`
            return data;
        },
        refetchOnWindowFocus: true,
    });

    const { data: locations, isLoading: isLoadingLocations } = useQuery({
        queryKey: ['allLocations'],
        queryFn: async (): Promise<Location[]> => {
            const { data, error } = await supabase.from('locations').select('id, name');
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: !isLoadingShift && !activeShift,
    });

    if (isLoadingShift) {
        return <div className="flex flex-col justify-center items-center h-screen space-y-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-lg text-muted-foreground">Loading your shift...</p></div>;
    }

    if (shiftError) {
        return <div className="flex flex-col justify-center items-center h-screen space-y-4 text-center p-4"><AlertCircle className="h-16 w-16 text-red-500" /><h2 className="text-2xl font-bold">Error Loading Shift Data</h2><p className="text-muted-foreground max-w-md">Could not connect to the server. Please check your internet and refresh.</p><p className="text-xs text-red-600 mt-2">Error: {shiftError.message}</p><Button onClick={() => window.location.reload()} className="mt-4">Refresh Page</Button></div>;
    }

    if (!activeShift) {
        return <StartShiftCard locations={locations || []} isLoadingLocations={isLoadingLocations} />;
    }

    return <ActiveShiftDashboard activeShift={activeShift} />;
}