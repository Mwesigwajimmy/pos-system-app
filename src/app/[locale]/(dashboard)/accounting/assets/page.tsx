/**
 * --- FIXED ASSET REGISTRY ---
 * Use: Corporate ledger listing all company property, plant, and equipment (PPE).
 * Path: /accounting/assets
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
    PackagePlus, 
    HardHat, 
    Calculator, 
    History, 
    FileText, 
    Search,
    Plus,
    Building2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AssetRegistryPage({ params: { locale } }: { params: { locale: string } }) {
    
    // 1. Enterprise Identity Handshake
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, business_name")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) return null;

    // 2. Fetch Fixed Assets from Ledger
    const { data: assets } = await supabase
        .from('fixed_assets')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false });

    return (
        <main className="flex-1 bg-slate-50/20 min-h-screen p-6 lg:p-10 space-y-10 animate-in fade-in duration-700">
            
            {/* --- PAGE HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Building2 size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Asset Management</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fixed Asset Registry</h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Registry of all corporate property and equipment for <span className="text-slate-800 font-semibold">{profile.business_name}</span>.
                    </p>
                </div>

                <Button className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95" asChild>
                    <Link href={`/${locale}/accounting/assets/purchase`}>
                        <Plus size={16} className="mr-2" /> Record New Purchase
                    </Link>
                </Button>
            </header>

            {/* --- ASSET LEDGER TABLE --- */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow className="h-12 border-none">
                            <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Asset Identity</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-slate-500">Serial/Identifier</TableHead>
                            <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Acquisition Cost</TableHead>
                            <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500">Status</TableHead>
                            <TableHead className="pr-8 text-right font-bold text-[10px] uppercase text-slate-500">Audit Proof</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!assets || assets.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-slate-400 italic">
                                    No registered assets found in the ledger.
                                </TableCell>
                            </TableRow>
                        ) : (
                            assets.map((asset) => (
                                <TableRow key={asset.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-none">
                                    <TableCell className="pl-8 py-5">
                                        <p className="font-bold text-slate-900 text-sm">{asset.asset_name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Purchased: {new Date(asset.purchase_date).toLocaleDateString()}</p>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-slate-500">
                                        {asset.serial_number || 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-900 tabular-nums">
                                        {asset.cost_value?.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-none font-bold text-[8px] uppercase px-3 py-1">
                                            {asset.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="pr-8 text-right">
                                        {asset.purchase_receipt_url ? (
                                            <a href={asset.purchase_receipt_url} target="_blank" rel="noreferrer">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600 rounded-lg">
                                                    <FileText size={16} />
                                                </Button>
                                            </a>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300 uppercase">No Proof</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* --- SYSTEM FOOTER --- */}
            <footer className="pt-20 pb-10 flex flex-col items-center gap-4 opacity-30">
                <div className="flex items-center gap-4">
                    <div className="h-px w-16 bg-slate-300" />
                    <History size={18} className="text-slate-400" />
                    <div className="h-px w-16 bg-slate-300" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Corporate Asset Management Node • Full Audit Trail Active
                </p>
            </footer>
        </main>
    );
}