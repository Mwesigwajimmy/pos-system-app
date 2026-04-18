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

      toast.success('Business settings updated successfully.');
    } catch (error: any) {
      if (error.code === '23505') {
          toast.error('Data Conflict: This TIN or Contact is already registered to another entity.');
      } else {
          toast.error(`Update Failure: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
            Loading Profile Settings...
        </p>
    </div>
  );

  return (
    <form onSubmit={handleSave} className="max-w-6xl mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-500">
        <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            
            {/* PROFESSIONAL HEADER */}
            <CardHeader className="bg-white border-b border-slate-100 p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-600">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Organization Settings</CardTitle>
                            <CardDescription className="text-sm text-slate-500 mt-1">
                                Manage your general ledger accounts, bank accounts, and financial structure.
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Session Secure</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 space-y-12">
                
                {/* SECTION 1: LEGAL IDENTITY */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-3">
                            <ShieldCheck size={18} className="text-blue-500"/> 1. Legal Registration
                        </h3>
                        <Badge variant="outline" className="text-[10px] font-bold border-blue-100 text-blue-600 px-3 py-1">Verified Profile</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">Official Legal Entity Name</Label>
                            <Input 
                                name="name" 
                                value={settings.name || ''} 
                                onChange={e => setSettings({...settings, name: e.target.value})} 
                                className="h-11 rounded-lg border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-blue-500/10" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">Tax Identification Number (TIN)</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    name="tin_number" 
                                    value={settings.tin_number || ''} 
                                    onChange={e => setSettings({...settings, tin_number: e.target.value})} 
                                    className="h-11 pl-10 rounded-lg border-slate-200 text-sm font-mono tracking-wider" 
                                    placeholder="Enter registration number" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: STATIONERY DNA */}
                <div className="space-y-6 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-3">
                        <MapPin size={18} className="text-blue-500"/> 2. Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">Physical Address / Plot</Label>
                            <Input 
                                name="plot_number" 
                                value={settings.plot_number || ''} 
                                onChange={e => setSettings({...settings, plot_number: e.target.value})} 
                                className="h-11 rounded-lg bg-slate-50/50 border-slate-200 text-sm" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">P.O. Box</Label>
                            <Input 
                                name="po_box" 
                                value={settings.po_box || ''} 
                                onChange={e => setSettings({...settings, po_box: e.target.value})} 
                                className="h-11 rounded-lg bg-slate-50/50 border-slate-200 text-sm" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">Standard Currency</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400"/>
                                <Input 
                                    name="currency_code" 
                                    value={settings.currency_code || ''} 
                                    onChange={e => setSettings({...settings, currency_code: e.target.value})} 
                                    className="h-11 pl-10 rounded-lg border-slate-200 text-sm font-bold uppercase" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">Official Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    name="official_email" 
                                    value={settings.official_email || ''} 
                                    onChange={e => setSettings({...settings, official_email: e.target.value})} 
                                    className="h-11 pl-10 rounded-lg border-slate-200 text-sm" 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">Contact Phone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    name="phone" 
                                    value={settings.phone || ''} 
                                    onChange={e => setSettings({...settings, phone: e.target.value})} 
                                    className="h-11 pl-10 rounded-lg border-slate-200 text-sm" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: SIGNATORY PROTOCOLS */}
                <div className="space-y-6 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-3">
                        <PenTool size={18} className="text-blue-500"/> 3. Authorization & Settlement
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">Authorized Representative</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    name="ceo_name" 
                                    value={settings.ceo_name || ''} 
                                    onChange={e => setSettings({...settings, ceo_name: e.target.value})} 
                                    className="h-11 pl-10 rounded-lg border-slate-200 text-sm font-medium" 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 ml-1">Official Designation</Label>
                            <Input 
                                name="ceo_designation" 
                                value={settings.ceo_designation || ''} 
                                onChange={e => setSettings({...settings, ceo_designation: e.target.value})} 
                                className="h-11 rounded-lg border-slate-200 text-sm bg-slate-50/50" 
                            />
                        </div>
                        <div className="col-span-full space-y-3">
                            <Label className="text-xs font-semibold text-slate-600 ml-1 flex items-center gap-2">
                                <BankIcon size={14} className="text-blue-600"/> Payment Instructions (Display on Invoices)
                            </Label>
                            <Textarea 
                                name="payment_instructions" 
                                value={settings.payment_instructions || ''} 
                                onChange={e => setSettings({...settings, payment_instructions: e.target.value})} 
                                className="min-h-[140px] rounded-xl border-slate-200 p-6 text-sm bg-slate-50/30 focus:bg-white transition-all leading-relaxed" 
                                placeholder="List bank details, branch codes, and payment methods..." 
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 4: DOCUMENT FOOTER */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                    <Label className="text-xs font-bold uppercase tracking-widest text-blue-600 ml-1">Document Footer Text</Label>
                    <div className="relative">
                        <ReceiptIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300"/>
                        <Input 
                            name="receipt_footer" 
                            value={settings.receipt_footer || ''} 
                            onChange={e => setSettings({...settings, receipt_footer: e.target.value})} 
                            className="h-14 pl-12 rounded-xl border-blue-100 bg-blue-50/10 text-sm font-medium text-slate-600" 
                            placeholder="e.g. Thank you for your business." 
                        />
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <ShieldCheck className="text-slate-300 h-5 w-5" />
                    Data Synchronization Active
                </div>
                <Button 
                    type="submit" 
                    disabled={saving} 
                    className="bg-[#2557D6] hover:bg-[#1e44a8] text-white font-bold px-10 h-12 rounded-lg transition-all shadow-md flex items-center gap-3"
                >
                    {saving ? (
                        <><Loader2 className="animate-spin h-4 w-4"/> Saving Changes...</>
                    ) : (
                        <><Save className="h-4 w-4" /> Save Business Profile</>
                    )}
                </Button>
            </CardFooter>
        </Card>

        {/* COMPLIANCE FOOTER */}
        <div className="flex justify-center items-center gap-4 py-6 opacity-30">
            <div className="h-[1px] w-12 bg-slate-400" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                ERP System Settings • Version 10.2.4
            </p>
            <div className="h-[1px] w-12 bg-slate-400" />
        </div>
    </form>
  );
}