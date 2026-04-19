'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus, ShieldCheck, Users, Mail } from 'lucide-react';
import { InviteEmployeeModal } from '@/components/management/InviteEmployeeModal';
import { Employee } from '@/types/dashboard';
import { useTenant } from '@/hooks/useTenant'; // --- IDENTITY WELD IMPORT ---
import { cn } from '@/lib/utils';

/**
 * SOVEREIGN EMPLOYEE MANAGEMENT PAGE
 * This page is surgically linked to the active business context.
 */
export default function EmployeesPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // --- 1. CONTEXT RESOLUTION ---
    // Grabbing the active business node (e.g., NAK or CAKE)
    const { data: tenant, isLoading: isTenantLoading } = useTenant();
    const activeBusinessId = tenant?.id;

    // --- 2. CONTEXT-AWARE DATA FETCHING ---
    const { data: employees, isLoading, error } = useQuery({
        // We include activeBusinessId in the key. 
        // When Jimmy switches businesses, this key changes and the table auto-refreshes.
        queryKey: ['allEmployees', activeBusinessId],
        queryFn: async () => {
            if (!activeBusinessId) return [];
            
            // The RPC 'get_all_employees_with_details' now uses our backend 'get_active_business_id()'
            // to ensure it only returns personnel for the currently switched node.
            const { data, error: rpcError } = await supabase.rpc('get_all_employees_with_details');
            
            if (rpcError) {
                toast.error('Identity Retrieval Failed', { description: rpcError.message });
                throw new Error(rpcError.message);
            }
            return data as Employee[];
        },
        enabled: !!activeBusinessId, // Only fetch once the business context is resolved
    });

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Security Access Error</h2>
                <p className="text-slate-500 max-w-sm mx-auto mt-2">{error.message}</p>
            </div>
        );
    }

    return (
        <>
            <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="h-5 w-5 text-blue-600" />
                            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">
                                Team Management
                            </h1>
                        </div>
                        <p className="text-slate-500 font-medium">
                            Managing authorized personnel for <span className="text-blue-600 font-bold">{tenant?.name || 'Active Node'}</span>
                        </p>
                    </div>
                    
                    <Button 
                        onClick={() => setIsInviteModalOpen(true)}
                        className="h-12 px-6 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 gap-2"
                        disabled={isTenantLoading}
                    >
                        <UserPlus className="h-5 w-5" />
                        Invite New Employee
                    </Button>
                </div>

                {/* --- DATA TABLE CARD --- */}
                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white">
                    <CardHeader className="border-b border-slate-50 px-8 py-6">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                            Authorized Identity Ledger
                            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-50">
                                    <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</TableHead>
                                    <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Identity Context</TableHead>
                                    <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Sovereign Role</TableHead>
                                    <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Auth Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="h-10 w-10 animate-spin text-blue-100" />
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-300 animate-pulse">
                                                    Synchronizing Identity Data...
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (employees && employees.length > 0) ? (
                                    employees.map((emp) => (
                                        <TableRow key={emp.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                            <TableCell className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white">
                                                        {emp.full_name?.charAt(0).toUpperCase() || "U"}
                                                    </div>
                                                    <span className="font-bold text-slate-900 tracking-tight">{emp.full_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Mail className="h-3.5 w-3.5 opacity-40" />
                                                    <span className="text-xs font-semibold">{emp.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                                    emp.role === 'owner' || emp.role === 'architect' 
                                                        ? "bg-blue-50 text-blue-600 border-blue-100" 
                                                        : "bg-white text-slate-500 border-slate-100"
                                                )}>
                                                    {emp.role?.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "h-1.5 w-1.5 rounded-full",
                                                        emp.status === 'Active' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-300"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        emp.status === 'Active' ? "text-emerald-600" : "text-slate-400"
                                                    )}>
                                                        {emp.status}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users className="h-8 w-8 text-slate-100" />
                                                <p className="text-sm font-bold text-slate-400">No personnel authorized for this node yet.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* --- INVITATION WELD: Pass the active node role if needed --- */}
            <InviteEmployeeModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                defaultRole="manager"
                businessId={activeBusinessId} // Ensure the modal knows which business node Jimmy is inviting to
            />
        </>
    );
}