// src/app/[locale]/(dashboard)/settings/accounting/page.tsx
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChartOfAccounts from "@/components/accounting/ChartOfAccounts";
import GeneralJournalTable from "@/components/accounting/GeneralJournalTable";
import { 
    Calculator, BookCopy, ShieldCheck, 
    ArrowLeft, Landmark, Zap 
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function AccountingSettingsPage({ params: { locale } }: { params: { locale: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Resolve Sovereign Identity
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, business_name")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  // 2. Fetch initial journal data for the component
  const { data: initialJournals } = await supabase
    .from('accounting_transactions')
    .select(`
        *,
        lines: accounting_journal_entries(
            id, description, debit, credit, 
            account:accounting_accounts(name, code)
        )
    `)
    .eq('business_id', profile.business_id)
    .order('date', { ascending: false })
    .limit(5);

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6 animate-in fade-in duration-700">
      
      {/* HEADER: Matches your Invoicing/Compliance design */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link href={`/${locale}/settings`} className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">
            <ArrowLeft size={12} className="mr-2" /> Back to Settings
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-3 rounded-2xl shadow-xl text-white">
              <Calculator size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Accounting Hub</h1>
              <p className="text-slate-500 font-medium mt-1">Configure financial infrastructure for <span className="text-blue-600 font-bold">{profile.business_name}</span></p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 shadow-sm">
           <Zap size={16} className="text-blue-600 animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Engine Status</span>
             <span className="text-xs font-bold text-blue-700">Enterprise Ledger Active</span>
           </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="space-y-12">
        
        {/* 1. Chart of Accounts Section */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <Landmark size={18} className="text-slate-400" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Chart of Accounts Registry</h2>
            </div>
            <ChartOfAccounts businessId={profile.business_id} />
        </div>

        {/* 2. Journal Registry Section */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <BookCopy size={18} className="text-slate-400" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">General Journal Operations</h2>
            </div>
            <GeneralJournalTable 
                initialEntries={initialJournals || []} 
                businessId={profile.business_id} 
                userId={user.id} 
            />
        </div>
      </div>

      {/* FOOTER VERIFICATION */}
      <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center opacity-30">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Sovereign Ledger Protocol v10.2</p>
        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
            <ShieldCheck size={12} /> Forensic Integrity Verified
        </div>
      </div>
    </div>
  );
}