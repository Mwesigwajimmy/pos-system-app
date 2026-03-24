'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Landmark, MapPin, Phone, Receipt as ReceiptIcon, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface StoreSettings {
    name: string;
    address: string;
    phone: string;
    currency_code: string;
    receipt_footer: string;
    tax_number: string; // UPGRADE: Required for Global Mandate
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<Partial<StoreSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      
      // 1. Resolve Sovereign Identity
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
        setBusinessId(profile.business_id);
        
        // 2. Fetch Multi-Tenant Data from Tenants and Locations
        const [tenantRes, locationRes] = await Promise.all([
          supabase.from('tenants').select('*').eq('id', profile.business_id).single(),
          supabase.from('locations').select('address').eq('business_id', profile.business_id).eq('is_primary', true).single()
        ]);

        if (tenantRes.data) {
          setSettings({
            name: tenantRes.data.name,
            phone: tenantRes.data.phone,
            currency_code: tenantRes.data.currency_code,
            tax_number: tenantRes.data.tax_number,
            receipt_footer: tenantRes.data.receipt_footer || 'Thank you for your business!',
            address: locationRes.data?.address || ''
          });
        }
      }
      setLoading(false);
    }
    fetchSettings();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);

    try {
      // 3. ATOMIC MULTI-TABLE UPDATE (The Sovereign Weld)
      const updateTenant = supabase
        .from('tenants')
        .update({
          name: settings.name,
          phone: settings.phone,
          currency_code: settings.currency_code,
          tax_number: settings.tax_number,
          receipt_footer: settings.receipt_footer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      const updateLocation = supabase
        .from('locations')
        .update({ address: settings.address })
        .eq('business_id', businessId)
        .eq('is_primary', true);

      const [tenantErr, locationErr] = await Promise.all([updateTenant, updateLocation]);

      if (tenantErr.error) throw tenantErr.error;
      if (locationErr.error) throw locationErr.error;

      toast.success('Business Identity Synchronized Successfully!');
    } catch (error: any) {
      toast.error(`Forensic Sync Failed: ${error.message}`);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setSettings(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 italic">
            <Loader2 className="animate-spin mb-2" />
            Initializing System Metadata...
        </div>
    );
  }

  return (
    <Card className="shadow-xl border-none bg-white">
      <CardHeader className="border-b bg-slate-50/50">
        <CardTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
            <Landmark className="text-blue-600" /> Business Identity
        </CardTitle>
        <CardDescription className="font-medium text-slate-500">
            Configure the legal metadata that appears on receipts, invoices, and tax filings.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Legal Business Name</Label>
                <Input id="name" name="name" value={settings.name || ''} onChange={handleInputChange} className="h-11" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tax_number" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tax ID / TIN Number</Label>
                <Input id="tax_number" name="tax_number" value={settings.tax_number || ''} onChange={handleInputChange} placeholder="e.g. 100XXXXXXX" className="h-11 font-mono" />
              </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                <MapPin className="w-3 h-3 text-red-500"/> Physical Headquarters Address
            </Label>
            <Input id="address" name="address" value={settings.address || ''} onChange={handleInputChange} className="h-11" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    <Phone className="w-3 h-3 text-green-600"/> Contact Phone
                </Label>
                <Input id="phone" name="phone" value={settings.phone || ''} onChange={handleInputChange} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency_code" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">System Currency</Label>
                <Input id="currency_code" name="currency_code" value={settings.currency_code || ''} onChange={handleInputChange} placeholder="e.g., UGX" className="h-11 font-mono font-bold" />
              </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_footer" className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                <ReceiptIcon className="w-3 h-3 text-blue-500"/> Global Receipt Footer
            </Label>
            <Input id="receipt_footer" name="receipt_footer" value={settings.receipt_footer || ''} onChange={handleInputChange} placeholder="Thank you for your business!" className="h-11 italic text-slate-500" />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={saving} className="min-w-[180px] h-12 bg-slate-900 text-white font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
              {saving ? <><Loader2 className="animate-spin mr-2"/> SYNCING...</> : <><Save className="mr-2 w-4 h-4"/> Seal Settings</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}