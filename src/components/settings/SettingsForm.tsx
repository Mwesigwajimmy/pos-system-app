// src/components/settings/SettingsForm.tsx
'use client'; // <-- This is crucial! It marks the component as a Client Component.

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import toast from 'react-hot-toast';

// This interface defines the shape of your settings data
interface StoreSettings {
    name: string;
    address: string;
    phone_number: string;
    currency_symbol: string;
    receipt_footer: string;
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<Partial<StoreSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      // Assuming your settings are in a table called 'stores' and the ID is 1
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        toast.error("Failed to load store settings.");
        console.error(error);
      } else if (data) {
        setSettings(data);
      }
      setLoading(false);
    }
    fetchSettings();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('stores')
      .update({
        name: settings.name,
        address: settings.address,
        phone_number: settings.phone_number,
        currency_symbol: settings.currency_symbol,
        receipt_footer: settings.receipt_footer,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1); // Make sure to only update your specific store

    if (error) {
      toast.error(`Failed to save settings: ${error.message}`);
    } else {
      toast.success('Settings saved successfully!');
    }
    setSaving(false);
  };

  // Helper to handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setSettings(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Settings</CardTitle>
        <CardDescription>Update your store information and receipt details here.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Store Name</label>
            <Input id="name" name="name" value={settings.name || ''} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium">Address</label>
            <Input id="address" name="address" value={settings.address || ''} onChange={handleInputChange} />
          </div>
           <div className="space-y-2">
            <label htmlFor="phone_number" className="text-sm font-medium">Phone Number</label>
            <Input id="phone_number" name="phone_number" value={settings.phone_number || ''} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <label htmlFor="currency_symbol" className="text-sm font-medium">Currency Symbol</label>
            <Input id="currency_symbol" name="currency_symbol" value={settings.currency_symbol || ''} onChange={handleInputChange} placeholder="e.g., UGX" />
          </div>
           <div className="space-y-2">
            <label htmlFor="receipt_footer" className="text-sm font-medium">Receipt Footer</label>
            <Input id="receipt_footer" name="receipt_footer" value={settings.receipt_footer || ''} onChange={handleInputChange} placeholder="Thank you for your business!" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}