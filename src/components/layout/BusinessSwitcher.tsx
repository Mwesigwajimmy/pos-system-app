'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Check, ChevronsUpDown, Building2, 
    PlusCircle, Landmark, ShieldCheck
} from "lucide-react";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useBranding } from '@/components/core/BrandingProvider';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

const supabase = createClient();

export default function BusinessSwitcher() {
    const router = useRouter();
    const { branding, refreshBranding } = useBranding();

    // 1. FETCH ALL MEMBERSHIPS (Companies I belong to)
    const { data: memberships, isLoading } = useQuery({
        queryKey: ['my_memberships'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const { data } = await supabase.from('view_my_memberships').select('*').eq('user_id', user.id);
            return data || [];
        }
    });

    // 2. SWITCH IDENTITY PROTOCOL
    const handleSwitch = async (bizId: string) => {
        // Broadcast the new identity to Supabase Auth metadata
        const { error } = await supabase.auth.updateUser({
            data: { business_id: bizId }
        });

        if (error) {
            console.error("Identity Swap Failed:", error);
            return;
        }

        // Trigger global UI re-weld
        refreshBranding();
        router.refresh(); 
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-4 p-3 rounded-[1.25rem] hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100 group animate-in fade-in duration-500">
                    <div className="h-11 w-11 flex-shrink-0 relative">
                        {branding?.logo_url ? (
                            <img src={branding.logo_url} className="h-11 w-11 object-contain rounded-xl shadow-sm bg-white border border-slate-50" alt="Identity" />
                        ) : (
                            <div className="h-11 w-11 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm">
                                {branding?.legal_name?.charAt(0).toUpperCase() || "B"}
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 h-3 w-3 rounded-full border-2 border-white shadow-sm" />
                    </div>
                    
                    <div className="flex flex-col truncate text-left flex-1">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tighter truncate leading-none">
                            {branding?.company_name_display || branding?.legal_name || "Sovereign OS"}
                        </span>
                        <Badge variant="outline" className="w-fit text-[8px] font-black uppercase tracking-widest mt-1.5 py-0 px-1.5 border-blue-100 text-blue-600 bg-blue-50/50">
                            {branding?.ceo_role || "ADMINISTRATOR"}
                        </Badge>
                    </div>
                    <ChevronsUpDown size={14} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-72 rounded-[2rem] p-3 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] border-none bg-white ml-2" align="start" sideOffset={10}>
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-4 py-3 tracking-[0.2em] flex items-center gap-2">
                    <ShieldCheck size={12}/> Switch Sovereign Identity
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-50 mx-2" />
                
                <div className="space-y-1 py-2">
                    {memberships?.map((biz) => (
                        <DropdownMenuItem 
                            key={biz.business_id} 
                            onClick={() => handleSwitch(biz.business_id)}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all focus:bg-slate-50",
                                branding?.business_id === biz.business_id ? "bg-blue-50/50 border border-blue-100" : "border border-transparent"
                            )}
                        >
                            <div className="h-10 w-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                                {biz.logo_url ? <img src={biz.logo_url} className="object-contain p-1" /> : <Building2 size={16} className="text-slate-300"/>}
                            </div>
                            <div className="flex-1 flex flex-col">
                                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">{biz.business_name}</span>
                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{biz.assigned_role}</span>
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
                <DropdownMenuItem className="p-4 rounded-2xl cursor-pointer text-blue-600 font-black text-[10px] uppercase tracking-widest gap-3 hover:bg-blue-50 focus:bg-blue-50">
                    <PlusCircle size={18} /> Register Additional Business
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}