'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query'; 
import { useBranding } from '@/components/core/BrandingProvider'; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
    Landmark, MapPin, Phone, Receipt as ReceiptIcon, Save, Loader2, 
    ShieldCheck, Building2, User, Mail, Hash, Landmark as BankIcon,
    PenTool, Globe, AlertTriangle, Send, Clock, Activity, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsForm() {
  const queryClient = useQueryClient();
  const { refreshBranding } = useBranding(); 
  
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const supabase = createClient();

  // --- 1. DEEP IDENTITY DISCOVERY ---
  // Fetches the current state of the business from the audited forensic view
  useEffect(() => {
    async function fetchNeuralIdentity() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
      
      if (profile?.business_id) {
        setBusinessId(profile.business_id);
        
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

  // --- 2. THE SOVEREIGN BROADCAST PROTOCOL ---
  // This function saves the data and immediately tells the rest of the system to update
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);

    try {
      // Step A: Synchronize Tenant Table
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

      // Step B: Synchronize Primary Location Table
      const { error: locErr } = await supabase
        .from('locations')
        .update({ address: settings.address })
        .eq('business_id', businessId)
        .eq('is_primary', true);

      if (locErr) throw locErr;

      // --- THE CRITICAL WELD: FORCE GLOBAL IDENTITY REFRESH ---
      // This invalidates all caches so the Sidebar and Header update immediately
      await queryClient.invalidateQueries({ queryKey: ['bbu1_corporate_identity'] });
      await queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
      
      // Trigger the context provider to refetch
      refreshBranding();

      toast.success('Identity Protocol Sealed: Global Broadcast Synchronized');
    } catch (error: any) {
      if (error.code === '23505') {
          toast.error('Data Conflict: This TIN or Contact is already registered to another entity.');
      } else {
          toast.error(`Sync Failure: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-24 text-center animate-pulse flex flex-col items-center gap-6">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="font-black text-slate-300 uppercase tracking-[0.5em] text-sm">
            Waking BBU1 Identity Engine...
        </p>
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-32 max-w-7xl mx-auto">
        <Card className="border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] rounded-[4rem] overflow-hidden bg-white">
            
            {/* LUXURY ENTERPRISE HEADER */}
            <CardHeader className="bg-slate-900 text-white p-14 border-b border-white/5 relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12">
                    <ShieldCheck size={200} />
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
                    <div className="flex items-center gap-10">
                        <div className="p-8 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-600/40 transform -rotate-3 hover:rotate-0 transition-all duration-500">
                            <Building2 size={56} className="text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-5xl font-black uppercase tracking-tighter italic leading-none">Identity Terminal</CardTitle>
                            <CardDescription className="text-blue-400 font-black uppercase tracking-[0.4em] text-[12px] mt-4 opacity-70">
                                BBU1 Sovereign Configuration & Global Broadcast Node
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 px-10 py-4 bg-white/10 rounded-[2rem] backdrop-blur-2xl border border-white/10 shadow-inner">
                        <div className="h-3.5 w-3.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-400">Identity Protocol Secured</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-16 space-y-20 bg-white">
                
                {/* SECTION 1: LEGAL IDENTITY */}
                <div className="space-y-12">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                        <h3 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-5">
                            <ShieldCheck size={22} className="text-blue-600"/> 1. Legal & Fiscal Identity
                        </h3>
                        <Badge variant="outline" className="text-[10px] font-black border-blue-100 text-blue-600 py-1.5 px-4 rounded-full bg-blue-50/30">AUDIT_LOCKED_SESSIONS</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-slate-500">Official Legal Entity Name</Label>
                            <Input 
                                name="name" 
                                value={settings.name || ''} 
                                onChange={e => setSettings({...settings, name: e.target.value})} 
                                className="h-16 font-black rounded-3xl border-slate-200 text-2xl shadow-sm focus:border-blue-600 transition-all px-10 bg-slate-50/50" 
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-orange-600">Tax Identification Number (TIN)</Label>
                            <div className="relative group">
                                <Hash className="absolute left-6 top-5.5 h-5 w-5 text-slate-300 group-focus-within:text-orange-500 transition-colors"/>
                                <Input 
                                    name="tin_number" 
                                    value={settings.tin_number || ''} 
                                    onChange={e => setSettings({...settings, tin_number: e.target.value})} 
                                    className="h-16 pl-16 font-black rounded-3xl border-slate-200 text-2xl font-mono shadow-sm bg-white focus:border-orange-500" 
                                    placeholder="e.g. 1001234567" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: STATIONERY DNA */}
                <div className="space-y-12 pt-12 border-t border-slate-100">
                    <h3 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-5">
                        <MapPin size={22} className="text-blue-600"/> 2. Corporate Stationery Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-slate-500">HQ Physical Address</Label>
                            <Input 
                                name="plot_number" 
                                value={settings.plot_number || ''} 
                                onChange={e => setSettings({...settings, plot_number: e.target.value})} 
                                className="h-16 font-bold rounded-2xl bg-slate-50 border-slate-200 shadow-inner px-8" 
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-slate-500">P.O. Box Reference</Label>
                            <Input 
                                name="po_box" 
                                value={settings.po_box || ''} 
                                onChange={e => setSettings({...settings, po_box: e.target.value})} 
                                className="h-16 font-bold rounded-2xl bg-slate-50 border-slate-200 shadow-inner px-8" 
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-blue-600">Reporting Currency</Label>
                            <div className="relative">
                                <Globe className="absolute left-6 top-5.5 h-5 w-5 text-blue-300"/>
                                <Input 
                                    name="currency_code" 
                                    value={settings.currency_code || ''} 
                                    onChange={e => setSettings({...settings, currency_code: e.target.value})} 
                                    className="h-16 pl-16 font-black rounded-2xl bg-blue-50 border-blue-200 text-blue-700 text-xl uppercase tracking-widest" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-slate-500">Corporate Email (Public)</Label>
                            <div className="relative">
                                <Mail className="absolute left-6 top-5.5 h-5 w-5 text-slate-300"/>
                                <Input 
                                    name="official_email" 
                                    value={settings.official_email || ''} 
                                    onChange={e => setSettings({...settings, official_email: e.target.value})} 
                                    className="h-16 pl-16 font-bold rounded-2xl bg-white border-slate-200" 
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-slate-500">Support Phone Contact</Label>
                            <div className="relative">
                                <Phone className="absolute left-6 top-5.5 h-5 w-5 text-slate-300"/>
                                <Input 
                                    name="phone" 
                                    value={settings.phone || ''} 
                                    onChange={e => setSettings({...settings, phone: e.target.value})} 
                                    className="h-16 pl-16 font-bold rounded-2xl bg-white border-slate-200" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: SIGNATORY PROTOCOLS */}
                <div className="space-y-12 pt-12 border-t border-slate-100">
                    <h3 className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-5">
                        <PenTool size={22} className="text-blue-600"/> 3. Formal Signatory & Settlement Protocol
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-slate-500">Authorized Personnel (CEO/MD)</Label>
                            <div className="relative">
                                <User className="absolute left-6 top-5.5 h-5 w-5 text-slate-300"/>
                                <Input 
                                    name="ceo_name" 
                                    value={settings.ceo_name || ''} 
                                    onChange={e => setSettings({...settings, ceo_name: e.target.value})} 
                                    className="h-16 pl-16 font-black rounded-2xl border-slate-200 shadow-sm text-xl" 
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-2 text-slate-500">Official Designation</Label>
                            <Input 
                                name="ceo_designation" 
                                value={settings.ceo_designation || ''} 
                                onChange={e => setSettings({...settings, ceo_designation: e.target.value})} 
                                className="h-16 font-black rounded-2xl border-slate-200 text-lg px-8 bg-slate-50/50" 
                            />
                        </div>
                        <div className="col-span-full space-y-5">
                            <Label className="text-[11px] font-black uppercase tracking-widest ml-3 flex items-center gap-3 text-blue-600">
                                <BankIcon size={16}/> 4. Universal Disbursement Instructions (Appears on Spec/Invoice)
                            </Label>
                            <Textarea 
                                name="payment_instructions" 
                                value={settings.payment_instructions || ''} 
                                onChange={e => setSettings({...settings, payment_instructions: e.target.value})} 
                                className="min-h-[180px] font-bold rounded-[2.5rem] border-slate-200 p-10 text-sm bg-slate-50 focus:bg-white shadow-inner transition-all leading-relaxed" 
                                placeholder="Clearly specify Bank Name, Branch Code, Account Numbers, and Mobile Money Merchant identifiers..." 
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 4: DOCUMENT FOOTER */}
                <div className="space-y-5 pt-12 border-t border-slate-100">
                    <Label className="text-[11px] font-black uppercase tracking-[0.3em] ml-3 text-blue-500">Global Fiscal Document Footer</Label>
                    <div className="relative group">
                        <ReceiptIcon className="absolute left-6 top-7 h-6 w-6 text-blue-300 group-focus-within:text-blue-600 transition-colors"/>
                        <Input 
                            name="receipt_footer" 
                            value={settings.receipt_footer || ''} 
                            onChange={e => setSettings({...settings, receipt_footer: e.target.value})} 
                            className="h-24 pl-16 italic font-bold text-slate-600 rounded-[2.5rem] border-blue-100 bg-blue-50/20 text-xl shadow-sm" 
                            placeholder="Thank you for choosing Sovereign ERP." 
                        />
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-14 border-t flex flex-col sm:flex-row items-center justify-between gap-12">
                <div className="flex items-center gap-6 text-[12px] font-black text-slate-500 uppercase tracking-[0.4em]">
                    <div className="h-14 w-14 rounded-3xl bg-blue-100 flex items-center justify-center border border-blue-200 shadow-[0_15px_30px_rgba(37,99,235,0.2)]">
                        <ShieldCheck className="text-blue-600 h-8 w-8" />
                    </div>
                    Sovereign Identity Sync Active
                </div>
                <Button 
                    type="submit" 
                    disabled={saving} 
                    className="h-24 px-28 font-black bg-slate-900 hover:bg-blue-600 text-white shadow-[0_30px_60px_-12px_rgba(15,23,42,0.5)] rounded-[2rem] transition-all uppercase tracking-[0.3em] text-xl transform hover:scale-105 active:scale-95 group"
                >
                    {saving ? (
                        <><Loader2 className="animate-spin mr-5 h-10 w-10"/> SEALING...</>
                    ) : (
                        <div className="flex items-center gap-6">
                            <Save className="h-8 w-8 group-hover:rotate-12 transition-transform" />
                            Seal Protocol
                        </div>
                    )}
                </Button>
            </CardFooter>
        </Card>

        {/* COMPLIANCE FOOTER */}
        <div className="flex justify-center items-center gap-6 opacity-40 py-10">
            <div className="h-[1px] w-20 bg-slate-300" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em]">
                BBU1 SOVEREIGN ENGINE • IDENTITY VERSION 10.2.4
            </p>
            <div className="h-[1px] w-20 bg-slate-300" />
        </div>
    </form>
  );
}