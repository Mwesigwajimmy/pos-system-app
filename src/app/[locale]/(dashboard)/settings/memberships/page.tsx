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
 * IDENTITY MANAGEMENT PAGE
 * The global registry for managing access across multiple business units.
 */
export default function MyMembershipsPage() {
    const queryClient = useQueryClient();
    const { branding, refreshBranding } = useBranding();

    // --- 1. BUSINESS ACCESS DISCOVERY ---
    const { data: memberships, isLoading } = useQuery({
        queryKey: ['my_full_memberships'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('view_my_memberships')
                .select('*')
                .eq('user_id', user.id);
            
            if (error) {
                console.error("ACCESS_DISCOVERY_ERROR:", error);
                throw error;
            }
            return data || [];
        }
    });

    // --- 2. IDENTITY SWITCH PROTOCOL ---
    // Executing the cross-business context switch
    const handleSwitch = async (bizId: string, bizName: string) => {
        if (bizId === branding?.business_id) return; 

        const toastId = toast.loading(`Switching to ${bizName}...`);
        
        try {
            // STEP A: COOKIE UPDATES
            Cookies.set('bbu1_active_business_id', bizId, { 
                expires: 30, 
                path: '/',
                sameSite: 'lax'
            });

            // STEP B: UPDATE AUTH METADATA
            const { error: authError } = await supabase.auth.updateUser({
                data: { 
                    business_id: bizId,
                    active_biz_id: bizId 
                }
            });

            if (authError) throw authError;

            // STEP C: SESSION REFRESH
            await supabase.auth.refreshSession();

            // STEP D: CLEAR CACHE
            await queryClient.clear(); 

            // STEP E: REFRESH BRANDING
            refreshBranding();

            toast.success(`Access successfully switched to ${bizName}`, { id: toastId });

            // STEP F: SYSTEM RELOAD
            setTimeout(() => {
                window.location.reload(); 
            }, 600);

        } catch (err: any) {
            console.error("SWITCH_FAILURE:", err);
            toast.error(`Switch Failed: ${err.message}`, { id: toastId });
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
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                            Identity Management
                        </h1>
                    </div>
                    <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-[0.4em] ml-1">
                        Global Access Registry & Business Units
                    </p>
                </div>
                <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold px-4 py-1.5 rounded-full bg-white">
                    SECURE ACTIVE SESSION
                </Badge>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* --- ACTIVE BUSINESS CARD --- */}
                <Card className="lg:col-span-4 border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] rounded-[3rem] bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShieldCheck size={120} />
                    </div>
                    <CardContent className="p-12 space-y-8 relative z-10">
                        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-600/40">
                            <ShieldCheck size={40} className="text-white" />
                        </div>
                        
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Current Active Branch</p>
                            <h2 className="text-3xl font-black uppercase tracking-tighter leading-tight">
                                {branding?.legal_name || "Active Business"}
                            </h2>
                        </div>

                        <div className="pt-8 border-t border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Assigned Role</p>
                                <Badge className="bg-white/10 hover:bg-white/20 text-white border-none font-bold px-4 py-1.5 uppercase tracking-widest text-[10px]">
                                    {branding?.ceo_role || "MEMBER"}
                                </Badge>
                            </div>
                            <CheckCircle2 className="text-emerald-500 h-8 w-8" />
                        </div>
                    </CardContent>
                </Card>

                {/* --- BUSINESS UNIT LIST --- */}
                <Card className="lg:col-span-8 border-none shadow-2xl shadow-slate-200/60 rounded-[3rem] bg-white overflow-hidden">
                    <CardHeader className="p-10 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">Verified Business Access</CardTitle>
                                <CardDescription className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mt-1">
                                    Select any business unit below to switch your current workspace
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
                                        <TableHead className="px-10 py-6 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Business Unit</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Your Role</TableHead>
                                        <TableHead className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Status</TableHead>
                                        <TableHead className="text-right px-10 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Action</TableHead>
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
                                                        <div className="h-14 w-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden p-1">
                                                            {m.logo_url ? (
                                                                <img src={m.logo_url} className="h-full w-full object-contain" alt="Logo" />
                                                            ) : (
                                                                <Building2 className="text-slate-200" size={24}/>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 uppercase tracking-tighter text-base">
                                                                {m.business_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="text-[9px] font-bold border-slate-200 text-slate-400 uppercase tracking-widest px-2">
                                                                    <Globe size={10} className="mr-1 opacity-50"/> {m.currency_code}
                                                                </Badge>
                                                                {m.is_primary && (
                                                                    <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">Main Branch</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                
                                                <TableCell>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={cn(
                                                            "font-bold border-slate-200 uppercase text-[10px] tracking-widest px-3 py-1 rounded-lg",
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
                                                            <span className="font-bold text-emerald-600 text-[10px] uppercase tracking-widest">Active Session</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-slate-300 text-[10px] uppercase tracking-widest">Access Verified</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right px-10">
                                                    {isActive ? (
                                                        <Button disabled size="sm" className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-none">
                                                            Currently Using
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            size="sm" 
                                                            variant="default" 
                                                            onClick={() => handleSwitch(m.business_id, m.business_name)}
                                                            className="bg-slate-900 hover:bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 group"
                                                        >
                                                            Switch Business <ArrowRightLeft size={12} className="ml-2 group-hover:rotate-180 transition-transform duration-500"/>
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