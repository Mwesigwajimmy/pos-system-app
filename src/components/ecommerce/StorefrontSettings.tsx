'use client';

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function StorefrontSettings() {
  const [storeName, setStoreName] = useState("Acme Online Store");
  const [themeColor, setThemeColor] = useState("#1288fa");
  const [currency, setCurrency] = useState("UGX");
  const [seoTitle, setSeoTitle] = useState("Acme Online Shop – Best Deals Anywhere!");
  const [seoDesc, setSeoDesc] = useState("Largest multi-region selection. Fast delivery. Best prices.");
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storefront Settings</CardTitle>
        <CardDescription>
          Change appearance, supported currency, basic SEO and marketing options.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <Input placeholder="Store Name" value={storeName} onChange={e => setStoreName(e.target.value)}/>
        </div>
        <div className="mb-3 flex gap-2">
          <label className="mr-2 text-sm font-medium">Theme Color</label>
          <input
            type="color"
            value={themeColor}
            onChange={e => setThemeColor(e.target.value)}
            className="w-12 h-8 align-middle border rounded"
          />
        </div>
        <div className="mb-3">
          <Input placeholder="Currency" value={currency} onChange={e => setCurrency(e.target.value)} />
        </div>
        <div className="mb-3">
          <Input placeholder="SEO Title" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} />
        </div>
        <div className="mb-3">
          <Input placeholder="SEO Description" value={seoDesc} onChange={e => setSeoDesc(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}