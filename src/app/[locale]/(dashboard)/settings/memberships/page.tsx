'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    Building2, ArrowRightLeft, ShieldCheck, 
    Globe, Loader2, CheckCircle2, UserCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from '@/components/core/BrandingProvider';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { cn } from '@/lib/utils';

const supabase = createClient();

/**
 * MY SOVEREIGN MEMBERSHIPS PAGE
 * The global registry for multi-tenant identity management.
 */
export default function MyMembershipsPage() {
    const queryClient = useQueryClient();
    const { branding, refreshBranding } = useBranding();

    // --- 1. SOVEREIGN MEMBERSHIP DISCOVERY ---
    const { data: memberships, isLoading } = useQuery({
        queryKey: ['my_full_memberships'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // Query the unified membership view we audited in the backend
            const { data, error } = await supabase
                .from('view_my_memberships')
                .select('*')
                .eq('user_id', user.id);
            
            if (error) {
                console.error("IDENTITY_DISCOVERY_ERROR:", error);
                throw error;
            }
            return data || [];
        }
    });

    // --- 2. THE IDENTITY WELD PROTOCOL ---
    // Executing the cross-business context swap for all nodes
    const handleSwitch = async (bizId: string, bizName: string) => {
        if (bizId === branding?.business_id) return; 

        const toastId = toast.loading(`Swapping Identity to ${bizName}...`);
        
        try {
            // STEP A: IDENTITY COOKIE INJECTION
            // The Middleware reads this to prevent the "Logout Loop"
            Cookies.set('bbu1_active_business_id', bizId, { 
                expires: 30, 
                path: '/',
                sameSite: 'lax'
            });

            // STEP B: UPDATE AUTH METADATA
            // Synchronize the user's permanent session data
            const { error: authError } = await supabase.auth.updateUser({
                data: { 
                    business_id: bizId,
                    active_biz_id: bizId 
                }
            });

            if (authError) throw authError;

            // STEP C: SESSION REFRESH
            // Forces the generation of a new JWT with the updated role/context
            await supabase.auth.refreshSession();

            // STEP D: ATOMIC CACHE WIPE
            await queryClient.clear(); 

            // STEP E: BROADCAST REFRESH
            refreshBranding();

            toast.success(`Identity Successfully Morphed to ${bizName}`, { id: toastId });

            // STEP F: NEURAL RELOAD
            // Forces the Middleware and RLS to pick up the new session state
            setTimeout(() => {
                window.location.reload(); 
            }, 600);

        } catch (err: any) {
            console.error("IDENTITY_SWAP_FAILURE:", err);
            toast.error(`Swap Failed: ${err.message}`, { id: toastId });
        }
    };

    return (
        <div className="p-4 md:p-12 space-y-10 bg-slate-50/30 min-h-screen animate-in fade-in duration-1000">
            {/* PAGE HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <UserCircle size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                            My Sovereign Identity
                        </h1>
                    </div>
                    <p className="text-slate-400 font-black mt-1 uppercase text-[10px] tracking-[0.4em] ml-1">
                        Global Authorization Registry & Access Nodes
                    </p>
                </div>
                <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold px-4 py-1.5 rounded-full bg-white">
                    VERIFIED SECURE SESSION
                </Badge>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* --- ACTIVE NODE CARD --- */}
                <Card className="lg:col-span-4 border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] rounded-[3rem] bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck size={120} />
                    </div>
                    <CardContent className="p-12 space-y-8 relative z-10">
                        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-600/40">
                            <ShieldCheck size={40} className="text-white" />
                        </div>
                        
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Currently Switched Node</p>
                            <h2 className="text-3xl font-black uppercase tracking-tighter leading-tight">
                                {branding?.legal_name || "BBU1 Sovereign"}
                            </h2>
                        </div>

                        <div className="pt-8 border-t border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Active Authorization</p>
                                <Badge className="bg-white/10 hover:bg-white/20 text-white border-none font-black px-4 py-1.5 uppercase tracking-widest text-[10px]">
                                    {branding?.ceo_role || "MEMBER"}
                                </Badge>
                            </div>
                            <CheckCircle2 className="text-emerald-500 h-8 w-8" />
                        </div>
                    </CardContent>
                </Card>

                {/* --- MEMBERSHIP GRID --- */}
                <Card className="lg:col-span-8 border-none shadow-2xl shadow-slate-200/60 rounded-[3rem] bg-white overflow-hidden">
                    <CardHeader className="p-10 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">Authorized Nodes</CardTitle>
                                <CardDescription className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mt-1">
                                    Click any entity to morph your identity and access its ledger
                                </CardDescription>
                            </div>
                            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 border-none">
                                        <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Business Entity</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Role Context</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Node Status</TableHead>
                                        <TableHead className="text-right px-10 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Identity Swap</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {memberships?.map((m: any) => {
                                        const isActive = m.business_id === branding?.business_id;
                                        
                                        return (
                                            <TableRow 
                                                key={m.business_id} 
                                                className={cn(
                                                    "transition-all duration-300 border-slate-50",
                                                    isActive ? "bg-blue-50/40" : "hover:bg-slate-50/80"
                                                )}
                                            >
                                                <TableCell className="px-10 py-8">
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-14 w-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden p-1 group-hover:scale-105 transition-transform">
                                                            {m.logo_url ? (
                                                                <img src={m.logo_url} className="h-full w-full object-contain" alt="Logo" />
                                                            ) : (
                                                                <Building2 className="text-slate-200" size={24}/>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 uppercase tracking-tighter text-base">
                                                                {m.business_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-400 uppercase tracking-widest px-2">
                                                                    <Globe size={10} className="mr-1 opacity-50"/> {m.currency_code}
                                                                </Badge>
                                                                {m.is_primary && (
                                                                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em]">Primary Node</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                
                                                <TableCell>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={cn(
                                                            "font-black border-slate-200 uppercase text-[10px] tracking-widest px-3 py-1 rounded-lg",
                                                            isActive ? "text-blue-600 bg-white shadow-sm border-blue-100" : "text-slate-500 bg-slate-50"
                                                        )}
                                                    >
                                                        {m.assigned_role?.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    {isActive ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                            <span className="font-black text-emerald-600 text-[10px] uppercase tracking-widest">Live Session</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-slate-300 text-[10px] uppercase tracking-widest">Authorized</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right px-10">
                                                    {isActive ? (
                                                        <Button disabled size="sm" className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-none">
                                                            Current Identity
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            size="sm" 
                                                            variant="default" 
                                                            onClick={() => handleSwitch(m.business_id, m.business_name)}
                                                            className="bg-slate-900 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 group"
                                                        >
                                                            Swap Node <ArrowRightLeft size={12} className="ml-2 group-hover:rotate-180 transition-transform duration-500"/>
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}