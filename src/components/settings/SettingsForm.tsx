'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Landmark, MapPin, Phone, Receipt as ReceiptIcon, Save, Loader2, 
    ShieldCheck, Building2, User, Mail, Hash, Landmark as BankIcon,
    PenTool, Globe // <--- FIXED: Replaced Signature with PenTool
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsForm() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchNeuralIdentity() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Resolve Sovereign Identity context
      const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
      
      if (profile?.business_id) {
        setBusinessId(profile.business_id);
        
        // Fetch from our audited High-Performance View
        const { data: identity } = await supabase
            .from('view_bbu1_corporate_identity')
            .select('*')
            .eq('business_id', profile.business_id)
            .single();

        if (identity) {
          setSettings({
            name: identity.legal_name,
            phone: identity.official_phone,
            currency_code: identity.currency_code,
            tin_number: identity.tin_number,
            plot_number: identity.plot_number,
            po_box: identity.po_box,
            official_email: identity.official_email,
            receipt_footer: identity.receipt_footer,
            address: identity.physical_address,
            ceo_name: identity.ceo_name,
            ceo_designation: identity.ceo_designation,
            payment_instructions: identity.payment_instructions
          });
        }
      }
      setLoading(false);
    }
    fetchNeuralIdentity();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);

    try {
      // 2. ATOMIC BROADCAST: Update both Tenants (Global) and Locations (Primary)
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({
          name: settings.name,
          phone: settings.phone,
          currency_code: settings.currency_code,
          tin_number: settings.tin_number,
          plot_number: settings.plot_number,
          po_box: settings.po_box,
          official_email: settings.official_email,
          receipt_footer: settings.receipt_footer,
          ceo_name: settings.ceo_name,
          ceo_designation: settings.ceo_designation,
          payment_instructions: settings.payment_instructions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (tenantErr) throw tenantErr;

      // Update primary location address for receipt localization
      const { error: locErr } = await supabase
        .from('locations')
        .update({ address: settings.address })
        .eq('business_id', businessId)
        .eq('is_primary', true);

      if (locErr) throw locErr;

      toast.success('Corporate Identity Sealed and Synchronized Successfully!');
    } catch (error: any) {
      toast.error(`Identity Sync Failure: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-[0.4em]">
        Waking BBU1 Identity Engine...
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-10 animate-in fade-in duration-1000 pb-20">
        <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-10 border-b border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/20 transform -rotate-3 hover:rotate-0 transition-transform">
                            <Building2 size={40}/>
                        </div>
                        <div>
                            <CardTitle className="text-4xl font-black uppercase tracking-tighter">Identity Terminal</CardTitle>
                            <CardDescription className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mt-2 italic">Official BBU1 Corporate Configuration Node</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Identity Master Sync Active</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-12 space-y-12">
                {/* SECTION 1: FISCAL & LEGAL REGISTRATION */}
                <div className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                        <ShieldCheck size={16} className="text-blue-600"/> 1. Legal & Fiscal Registration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Registered Legal Entity Name</Label>
                            <Input name="name" value={settings.name || ''} onChange={e => setSettings({...settings, name: e.target.value})} className="h-14 font-black rounded-2xl border-slate-200 text-lg shadow-sm" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-orange-500">Corporate TIN Identifier</Label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-5 h-4 w-4 text-slate-300"/>
                                <Input name="tin_number" value={settings.tin_number || ''} onChange={e => setSettings({...settings, tin_number: e.target.value})} className="h-14 pl-12 font-black rounded-2xl border-slate-200 text-lg font-mono shadow-sm" placeholder="e.g. 1001234567" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: STATIONERY SPECIFICATIONS */}
                <div className="space-y-8 pt-8 border-t border-slate-100">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                        <MapPin size={16} className="text-blue-600"/> 2. Corporate Stationery Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Plot Number / Street</Label>
                            <Input name="plot_number" value={settings.plot_number || ''} onChange={e => setSettings({...settings, plot_number: e.target.value})} className="h-12 font-bold rounded-xl bg-slate-50 border-slate-200 shadow-inner" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1">P.O. Box Reference</Label>
                            <Input name="po_box" value={settings.po_box || ''} onChange={e => setSettings({...settings, po_box: e.target.value})} className="h-12 font-bold rounded-xl bg-slate-50 border-slate-200 shadow-inner" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Functional Currency</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-4 h-4 w-4 text-slate-300"/>
                                <Input name="currency_code" value={settings.currency_code || ''} onChange={e => setSettings({...settings, currency_code: e.target.value})} className="h-12 pl-10 font-black rounded-xl bg-blue-50 border-blue-100 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Official Corporate Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-4 h-4 w-4 text-slate-300"/>
                                <Input name="official_email" value={settings.official_email || ''} onChange={e => setSettings({...settings, official_email: e.target.value})} className="h-12 pl-10 font-bold rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1">HQ Support Contact</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-4 h-4 w-4 text-slate-300"/>
                                <Input name="phone" value={settings.phone || ''} onChange={e => setSettings({...settings, phone: e.target.value})} className="h-12 pl-10 font-bold rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: SIGNATORY & DISBURSEMENT PROTOCOLS */}
                <div className="space-y-8 pt-8 border-t border-slate-100">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                        <PenTool size={16} className="text-blue-600"/> 3. Formal Signatory & Disbursement Instructions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Authorized Representative (CEO)</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-4 h-4 w-4 text-slate-300"/>
                                <Input name="ceo_name" value={settings.ceo_name || ''} onChange={e => setSettings({...settings, ceo_name: e.target.value})} className="h-12 pl-10 font-black rounded-xl border-slate-200 shadow-sm" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Official Executive Role</Label>
                            <Input name="ceo_designation" value={settings.ceo_designation || ''} onChange={e => setSettings({...settings, ceo_designation: e.target.value})} className="h-12 font-black rounded-xl" />
                        </div>
                        <div className="col-span-full space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                                <BankIcon size={12}/> Global Settlement Instructions (Appears on Quotes/Invoices)
                            </Label>
                            <Textarea name="payment_instructions" value={settings.payment_instructions || ''} onChange={e => setSettings({...settings, payment_instructions: e.target.value})} className="min-h-[120px] font-bold rounded-[1.5rem] border-slate-200 p-6 text-xs bg-slate-50 focus:bg-white shadow-inner transition-all" placeholder="Enter Bank specifications, Branch codes, and Mobile Money Merchant identifiers..." />
                        </div>
                    </div>
                </div>

                {/* SECTION 4: DOCUMENT FOOTER */}
                <div className="space-y-3 pt-8 border-t border-slate-100">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-blue-500">Master Receipt / Invoice Footer</Label>
                    <div className="relative">
                        <ReceiptIcon className="absolute left-4 top-4.5 h-5 w-5 text-blue-400"/>
                        <Input name="receipt_footer" value={settings.receipt_footer || ''} onChange={e => setSettings({...settings, receipt_footer: e.target.value})} className="h-14 pl-12 italic font-bold text-slate-500 rounded-2xl border-blue-100 bg-blue-50/20" placeholder="Thank you for choosing Sovereign ERP." />
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-10 border-t flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                    <div className="h-10 w-10 rounded-2xl bg-blue-100 flex items-center justify-center border border-blue-200 shadow-sm"><ShieldCheck className="text-blue-600 h-6 w-6" /></div>
                    Sovereign Protocol Synchronization Active
                </div>
                <Button type="submit" disabled={saving} className="h-16 px-20 font-black bg-slate-900 hover:bg-blue-600 text-white shadow-2xl rounded-2xl transition-all uppercase tracking-[0.2em] text-sm transform hover:scale-105 active:scale-95">
                    {saving ? <><Loader2 className="animate-spin mr-3 h-6 w-6"/> SEALING...</> : "Seal Identity Protocol"}
                </Button>
            </CardFooter>
        </Card>
    </form>
  );
}