'use client';

import * as React from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2, Save } from "lucide-react";

export function MultiCountrySettingsPanel({ tenantId }: { tenantId: string }) {
  const [country, setCountry] = useState('UG');
  const [currency, setCurrency] = useState('UGX');
  const [timezone, setTimezone] = useState('Africa/Kampala');
  const [locale, setLocale] = useState('en-UG');
  const [saving, setSaving] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const db = createClient();
      // Using upsert to handle both insert and update
      const { error } = await db
        .from('tenant_settings')
        .upsert({ 
            tenant_id: tenantId, 
            country_iso: country, 
            currency_code: currency, 
            timezone, 
            locale_code: locale 
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
      toast.success("Regional settings updated successfully.");
    } catch(e: any) { 
        toast.error("Failed to save settings."); 
        console.error(e);
    }
    setSaving(false);
  };

  return (
    <Card className="h-full border-t-4 border-t-orange-500 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500"/> Regional Configuration
          </CardTitle>
          <CardDescription>Configure localization settings for multi-country operations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Country (ISO)</label>
                <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="UG">Uganda (UG)</SelectItem>
                        <SelectItem value="KE">Kenya (KE)</SelectItem>
                        <SelectItem value="TZ">Tanzania (TZ)</SelectItem>
                        <SelectItem value="RW">Rwanda (RW)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="UGX">Ugandan Shilling (UGX)</SelectItem>
                        <SelectItem value="KES">Kenyan Shilling (KES)</SelectItem>
                        <SelectItem value="TZS">Tanzanian Shilling (TZS)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Timezone</label>
            <Input 
                value={timezone} 
                onChange={e => setTimezone(e.target.value)} 
                placeholder="e.g. Africa/Nairobi" 
            />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">System Locale</label>
            <Input 
                value={locale} 
                onChange={e => setLocale(e.target.value)} 
                placeholder="e.g. en-GB" 
            />
        </div>

        <div className="pt-2">
            <Button 
                onClick={saveSettings} 
                disabled={saving} 
                className="w-full bg-slate-900 hover:bg-slate-800"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                Save Configuration
            </Button>
        </div>

      </CardContent>
    </Card>
  );
}