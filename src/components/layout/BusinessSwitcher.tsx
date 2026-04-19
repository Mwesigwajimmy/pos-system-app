'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Check, ChevronsUpDown, Building2, 
    PlusCircle, Landmark, ShieldCheck, Loader2
} from "lucide-react";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useBranding } from '@/components/core/BrandingProvider';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const supabase = createClient();

/**
 * SOVEREIGN BUSINESS SWITCHER
 * Core component for multi-tenant identity morphing.
 */
export default function BusinessSwitcher() {
    const router = useRouter();
    const queryClient = useQueryClient(); 
    const { branding, refreshBranding } = useBranding();

    // --- 1. SOVEREIGN MEMBERSHIP DISCOVERY ---
    // Fetches every business ledger the user is authorized to access via the validated view.
    const { data: memberships, isLoading } = useQuery({
        queryKey: ['my_business_memberships'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            
            const { data, error } = await supabase
                .from('view_my_memberships')
                .select('*')
                .eq('user_id', user.id);
                
            if (error) {
                console.error("MEMBERSHIP_FETCH_ERROR:", error);
                return [];
            }
            return data || [];
        }
    });

    // --- 2. THE IDENTITY WELD PROTOCOL ---
    // Executing the cross-business context swap with full state neutralization.
    const handleSwitch = async (bizId: string, bizName: string) => {
        // Safety: Prevent redundant protocol execution
        if (bizId === branding?.business_id) return; 

        const toastId = toast.loading(`Executing Sovereign Identity Swap to ${bizName}...`);
        
        try {
            // STEP A: GRACEFUL REALTIME DISCONNECT
            // Manually killing all active WebSocket channels to prevent the 
            // "WebSocket is closed before connection is established" error.
            await supabase.removeAllChannels();

            // STEP B: IDENTITY COOKIE INJECTION
            // Sets the cookie that the Middleware reads BEFORE the page renders.
            Cookies.set('bbu1_active_business_id', bizId, { 
                expires: 30, 
                path: '/',
                sameSite: 'lax'
            });

            // STEP C: UPDATE AUTH METADATA
            // Update the user's metadata in the Supabase Auth session.
            // This is the trigger for the 'get_user_context' RPC morphing.
            const { error: authError } = await supabase.auth.updateUser({
                data: { 
                    business_id: bizId,
                    active_biz_id: bizId 
                }
            });

            if (authError) throw authError;

            // STEP D: SESSION REFRESH
            // Forces Supabase to generate a new JWT containing the updated context.
            await supabase.auth.refreshSession();

            // STEP E: ATOMIC CACHE WIPE
            // Purge all stale data from the previous business node.
            await queryClient.clear(); 

            // STEP F: BROADCAST REFRESH
            refreshBranding();

            toast.success("Identity Morphed Successfully", { id: toastId });

            // STEP G: NEURAL ROUTE RELOAD
            // We redirect to /dashboard specifically. The Middleware will catch this,
            // see the new role (e.g., Accountant) and send the user to the 
            // correct industry-specific dashboard automatically.
            setTimeout(() => {
                window.location.href = '/dashboard'; 
            }, 500);

        } catch (err: any) {
            console.error("IDENTITY_SWAP_CRITICAL_BREACH:", err);
            toast.error(`Swap Failed: ${err.message}`, { id: toastId });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-4 p-3 rounded-[1.25rem] hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100 group animate-in fade-in duration-500">
                    <div className="h-11 w-11 flex-shrink-0 relative">
                        {branding?.logo_url ? (
                            <img 
                                src={branding.logo_url} 
                                className="h-11 w-11 object-contain rounded-xl shadow-sm bg-white border border-slate-50 p-0.5" 
                                alt="Active Node Logo" 
                            />
                        ) : (
                            <div className="h-11 w-11 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg">
                                {branding?.legal_name?.charAt(0).toUpperCase() || "B"}
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm" />
                    </div>
                    
                    <div className="flex flex-col truncate text-left flex-1">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tighter truncate leading-none">
                            {branding?.company_name_display || branding?.legal_name || "Sovereign OS"}
                        </span>
                        <Badge variant="outline" className="w-fit text-[8px] font-black uppercase tracking-widest mt-1.5 py-0 px-2 border-blue-100 text-blue-600 bg-blue-50/50">
                            {branding?.ceo_role || "ADMINISTRATOR"}
                        </Badge>
                    </div>
                    <ChevronsUpDown size={14} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-72 rounded-[2.5rem] p-3 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border-none bg-white ml-2 animate-in slide-in-from-top-2 duration-300" align="start" sideOffset={10}>
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-4 py-3 tracking-[0.2em] flex items-center gap-2">
                    <ShieldCheck size={12} className="text-blue-600" /> Authorized Nodes
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-50 mx-2" />
                
                <div className="space-y-1 py-2 max-h-96 overflow-y-auto scrollbar-hide">
                    {isLoading ? (
                        <div className="p-4 flex justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                    ) : memberships?.map((biz) => (
                        <DropdownMenuItem 
                            key={biz.business_id} 
                            onClick={() => handleSwitch(biz.business_id, biz.business_name)}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all focus:bg-slate-50 group",
                                branding?.business_id === biz.business_id ? "bg-blue-50/50 border border-blue-100" : "border border-transparent"
                            )}
                        >
                            <div className="h-10 w-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-300 transition-all">
                                {biz.logo_url ? (
                                    <img src={biz.logo_url} className="object-contain p-1" alt="Node Logo" />
                                ) : (
                                    <Building2 size={16} className="text-slate-300"/>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col">
                                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter truncate w-40">
                                    {biz.business_name}
                                </span>
                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                                    {biz.assigned_role}
                                </span>
                            </div>
                            {branding?.business_id === biz.business_id && (
                                <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                                    <Check size={14} strokeWidth={3} />
                                </div>
                            )}
                        </DropdownMenuItem>
                    ))}
                </div>

                <DropdownMenuSeparator className="bg-slate-50 mx-2" />
                <DropdownMenuItem className="p-4 rounded-2xl cursor-pointer text-blue-600 font-black text-[10px] uppercase tracking-widest gap-3 hover:bg-blue-50 focus:bg-blue-50 outline-none">
                    <PlusCircle size={20} /> Register Additional Entity
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}