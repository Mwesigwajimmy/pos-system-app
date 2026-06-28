/**
 * --- PICKING OPERATIONS DETAIL ---
 * Use: Interactive picking and slip preview for a specific shipment.
 * Path: /distribution/picking/[id]
 */

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, FileText } from "lucide-react";

// Importing your two specific components
import Picklist from "@/components/distribution/Picklist";
import Pickingslip from "@/components/distribution/Pickingslip";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function PickingDetailPage({ 
    params: { locale, id } 
}: { 
    params: { locale: string; id: string } 
}) {
    // 1. Identity Handshake
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (!profile?.business_id) redirect(`/${locale}/dashboard`);

    return (
        <main className="flex-1 bg-slate-50/20 min-h-screen p-6 md:p-10 animate-in fade-in duration-700">
            <div className="max-w-[1500px] mx-auto space-y-8">
                
                {/* TOP NAVIGATION & CONTEXT */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <Link 
                        href={`/${locale}/distribution/picking`} 
                        className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Back to Queue</span>
                    </Link>
                    
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Processing Manifest</p>
                        <p className="text-xs font-black text-slate-900 uppercase">Ref: #{id.substring(0, 12)}</p>
                    </div>
                </div>

                {/* 
                    ENTERPRISE TAB SYSTEM
                    Allows the worker to toggle between the Digital Picklist 
                    and the formal Picking Slip preview.
                */}
                <Tabs defaultValue="picklist" className="space-y-6">
                    <div className="flex justify-center">
                        <TabsList className="bg-white border border-slate-200 p-1 h-12 rounded-xl shadow-sm">
                            <TabsTrigger value="picklist" className="rounded-lg px-8 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                                <ClipboardList size={14} className="mr-2" /> Digital Picklist
                            </TabsTrigger>
                            <TabsTrigger value="slip" className="rounded-lg px-8 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                                <FileText size={14} className="mr-2" /> Picking Slip
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* VIEW 1: The Interactive Picklist */}
                    <TabsContent value="picklist" className="m-0 focus-visible:outline-none">
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-2">
                             <Picklist manifestId={id} businessId={profile.business_id} />
                        </div>
                    </TabsContent>

                    {/* VIEW 2: The Formal Picking Slip */}
                    <TabsContent value="slip" className="m-0 focus-visible:outline-none">
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 min-h-[800px]">
                             {/* 
                                We pass the same data. 
                                Pickingslip usually formats this for printing. 
                             */}
                             <Pickingslip manifestId={id} businessId={profile.business_id} />
                        </div>
                    </TabsContent>
                </Tabs>
                
            </div>
        </main>
    );
}