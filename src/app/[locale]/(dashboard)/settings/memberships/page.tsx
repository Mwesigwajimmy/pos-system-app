'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    Building2, ArrowRightLeft, ShieldCheck, 
    Clock, LogOut, ExternalLink, Globe 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { useBranding } from '@/components/core/BrandingProvider';

const supabase = createClient();

export default function MyMembershipsPage() {
    const { branding } = useBranding();

    // 1. Fetch all businesses this specific user belongs to
    const { data: memberships, isLoading } = useQuery({
        queryKey: ['my_full_memberships'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase
                .from('view_my_memberships')
                .select('*')
                .eq('user_id', user?.id);
            return data || [];
        }
    });

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen animate-in fade-in duration-700">
            <header className="border-b pb-8">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">My Sovereign Memberships</h1>
                <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-[0.3em]">Global Identity Registry</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Active Session Info */}
                <Card className="lg:col-span-4 border-none shadow-xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden">
                    <CardContent className="p-10 space-y-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Currently Active Ledger</p>
                            <h2 className="text-2xl font-black mt-1 uppercase">{branding?.legal_name}</h2>
                        </div>
                        <div className="pt-6 border-t border-white/10">
                            <p className="text-[10px] font-bold text-blue-400 uppercase">Access Level</p>
                            <Badge className="mt-2 bg-white/10 text-white border-none font-black px-4">{branding?.ceo_role}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Membership List */}
                <Card className="lg:col-span-8 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
                    <CardHeader className="p-8 bg-slate-50/50 border-b">
                        <CardTitle className="text-xl font-black text-slate-800">Authorized Business Nodes</CardTitle>
                        <CardDescription className="font-bold text-slate-400">List of all businesses linked to your BBU1 identity.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 border-none">
                                    <TableHead className="px-8 py-5 font-black text-[10px] uppercase tracking-widest">Business Entity</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Your Role</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-right px-8 font-black text-[10px] uppercase tracking-widest">Decision</TableHead>
                                </TableRow>
                            </TableHeader>
                            <tbody className="divide-y divide-slate-50">
                                {memberships?.map((m: any) => (
                                    <TableRow key={m.business_id} className="hover:bg-blue-50/30 transition-all">
                                        <TableCell className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                                                    {m.logo_url ? <img src={m.logo_url} className="object-contain p-1" /> : <Building2 className="text-slate-300" size={16}/>}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 uppercase tracking-tighter">{m.business_name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase"><Globe size={8}/> {m.currency_code}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-black border-slate-200 text-slate-500 uppercase text-[9px]">{m.assigned_role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {m.business_id === branding?.business_id ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px]">CURRENTLY_ACTIVE</Badge>
                                            ) : (
                                                <Badge variant="ghost" className="text-slate-300 font-bold text-[9px]">INACTIVE</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right px-8">
                                            {m.business_id !== branding?.business_id && (
                                                <Button size="sm" variant="ghost" className="text-blue-600 font-black text-[10px] uppercase hover:bg-blue-50">
                                                    Switch <ArrowRightLeft size={12} className="ml-2"/>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </tbody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}