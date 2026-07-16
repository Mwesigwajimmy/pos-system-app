'use client';

/**
 * --- BBU1 SOVEREIGN SETTINGS FORM ---
 * VERSION: v10.3 OMEGA (INDUSTRIAL CONTACT WELD)
 * Use: Master organization control, financial stationery, and communication nodes.
 * Logic: Real-time synchronization with Tenants and Locations registries.
 */

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
    PenTool, Globe, AlertTriangle, Send, Clock, Activity, CheckCircle2,
    MessageSquare // Logic: Added for WhatsApp branding
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
  useEffect(() => {
    async function fetchNeuralIdentity() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
      
      if (profile?.business_id) {
        setBusinessId(profile.business_id);
        
        // Logic: Fetch identity from the master view
        const { data: identity } = await supabase
            .from('tenants') // Directly hitting tenants to ensure we get the fresh whatsapp_number
            .select('*')
            .eq('id', profile.business_id)
            .single();

        if (identity) {
          setSettings({
            name: identity.name,
            phone: identity.phone,
            whatsapp_number: identity.whatsapp_number, // THE MISSING WELD
            currency_code: identity.currency_code,
            tin_number: identity.tin_number,
            plot_number: identity.plot_number,
            po_box: identity.po_box,
            official_email: identity.official_email,
            receipt_footer: identity.receipt_footer,
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
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);

    try {
      // Step A: Synchronize Tenant Table (Including the new WhatsApp identity)
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({
          name: settings.name,
          phone: settings.phone,
          whatsapp_number: settings.whatsapp_number, // SAVING THE DISPATCH NODE
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

      // --- THE CRITICAL WELD: REFRESH SYSTEM CACHE ---
      await queryClient.invalidateQueries({ queryKey: ['bbu1_corporate_identity'] });
      await queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant_identity'] });
      
      refreshBranding();
      toast.success('Business identity nodes synchronized.');
    } catch (error: any) {
      toast.error(`Update Failure: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">
            Accessing Sovereign Node...
        </p>
    </div>
  );

  return (
    <form onSubmit={handleSave} className="max-w-6xl mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-500">
        <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            
            <CardHeader className="bg-white border-b border-slate-100 p-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-2xl">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black uppercase tracking-tight text-slate-900">Organization Registry</CardTitle>
                            <CardDescription className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                                Manage industrial identity and communication nodes.
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Ledger Handshake Active</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-10 space-y-16">
                
                {/* SECTION 1: LEGAL IDENTITY */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                            <ShieldCheck size={18} className="text-blue-500"/> 1. Legal Identity Registry
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Official Legal Name</Label>
                            <Input 
                                value={settings.name || ''} 
                                onChange={e => setSettings({...settings, name: e.target.value})} 
                                className="h-12 rounded-xl border-slate-200 font-bold text-slate-900 focus:ring-blue-500" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tax ID (TIN)</Label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    value={settings.tin_number || ''} 
                                    onChange={e => setSettings({...settings, tin_number: e.target.value})} 
                                    className="h-12 pl-12 rounded-xl border-slate-200 font-mono font-bold tracking-widest" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: STATIONERY DNA */}
                <div className="space-y-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                        <MapPin size={18} className="text-blue-500"/> 2. Global Communication Nodes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Physical Address</Label>
                            <Input 
                                value={settings.plot_number || ''} 
                                onChange={e => setSettings({...settings, plot_number: e.target.value})} 
                                className="h-12 rounded-xl border-slate-200 font-medium" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">P.O. Box</Label>
                            <Input 
                                value={settings.po_box || ''} 
                                onChange={e => setSettings({...settings, po_box: e.target.value})} 
                                className="h-12 rounded-xl border-slate-200 font-medium" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Base Currency</Label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500"/>
                                <Input 
                                    value={settings.currency_code || ''} 
                                    onChange={e => setSettings({...settings, currency_code: e.target.value})} 
                                    className="h-12 pl-12 rounded-xl border-slate-200 font-black uppercase" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Forensic Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    value={settings.official_email || ''} 
                                    onChange={e => setSettings({...settings, official_email: e.target.value})} 
                                    className="h-12 pl-12 rounded-xl border-slate-200 font-medium" 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Office Phone</Label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    value={settings.phone || ''} 
                                    onChange={e => setSettings({...settings, phone: e.target.value})} 
                                    className="h-12 pl-12 rounded-xl border-slate-200 font-bold" 
                                />
                            </div>
                        </div>

                        {/* THE WHATSAPP DISPATCH NODE WELD */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">WhatsApp Identity</Label>
                            <div className="relative group">
                                <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500"/>
                                <Input 
                                    placeholder="+256..."
                                    value={settings.whatsapp_number || ''} 
                                    onChange={e => setSettings({...settings, whatsapp_number: e.target.value})} 
                                    className="h-12 pl-12 rounded-xl border-emerald-100 bg-emerald-50/10 font-black text-emerald-700 focus:ring-emerald-500 shadow-inner" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: SIGNATORY PROTOCOLS */}
                <div className="space-y-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                        <PenTool size={18} className="text-blue-500"/> 3. Authorization Signatories
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Principal Representative</Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
                                <Input 
                                    value={settings.ceo_name || ''} 
                                    onChange={e => setSettings({...settings, ceo_name: e.target.value})} 
                                    className="h-12 pl-12 rounded-xl border-slate-200 font-bold" 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Official Designation</Label>
                            <Input 
                                value={settings.ceo_designation || ''} 
                                onChange={e => setSettings({...settings, ceo_designation: e.target.value})} 
                                className="h-12 rounded-xl border-slate-200 bg-slate-50/30" 
                            />
                        </div>
                        <div className="col-span-full space-y-3">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <BankIcon size={14} className="text-blue-600"/> Fiduciary Payment Instructions
                            </Label>
                            <Textarea 
                                value={settings.payment_instructions || ''} 
                                onChange={e => setSettings({...settings, payment_instructions: e.target.value})} 
                                className="min-h-[160px] rounded-3xl border-slate-200 p-8 text-sm bg-slate-50/20 font-medium leading-relaxed focus:bg-white transition-all shadow-inner" 
                                placeholder="Bank details, branches, and authorized payment channels..." 
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 4: DOCUMENT FOOTER */}
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Stationery Footer Logic</Label>
                    <div className="relative">
                        <ReceiptIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300"/>
                        <Input 
                            value={settings.receipt_footer || ''} 
                            onChange={e => setSettings({...settings, receipt_footer: e.target.value})} 
                            className="h-16 pl-14 rounded-2xl border-blue-50 bg-blue-50/10 text-sm font-bold text-slate-600 shadow-sm" 
                            placeholder="e.g. Authorized Digital Document • Handshake Confirmed" 
                        />
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    <ShieldCheck className="text-blue-500 h-5 w-5" />
                    System Node Integrity Sealed
                </div>
                <Button 
                    type="submit" 
                    disabled={saving} 
                    className="bg-slate-900 hover:bg-black text-white font-black px-16 h-14 rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center gap-4 uppercase tracking-widest text-xs"
                >
                    {saving ? (
                        <><Loader2 className="animate-spin h-5 w-5"/> Synchronizing Node...</>
                    ) : (
                        <><Save className="h-5 w-5" /> Authorize & Save Profile</>
                    )}
                </Button>
            </CardFooter>
        </Card>

        {/* SYSTEM FOOTER */}
        <div className="flex justify-center items-center gap-6 py-10 opacity-20">
            <div className="h-[1px] w-20 bg-slate-400" />
            <p className="text-[8px] font-black text-slate-900 uppercase tracking-[0.5em]">
                BBU1 Sovereign Architecture • Global Settings Node
            </p>
            <div className="h-[1px] w-20 bg-slate-400" />
        </div>
    </form>
  );
}