'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Promotion {
  id: string;
  code: string;
  label: string;
  type: "Discount" | "Shipping" | "BOGO" | "Gift";
  value: string;
  currency?: string;
  region: string;
  active: boolean;
  validFrom: string;
  validTo: string;
  tenantId: string;
}

export default function PromotionManager() {
  const [promos, setPromos] = useState<Promotion[]>([
    {
      id: "promo-001",
      code: "BLACKFRI",
      label: "Black Friday 12% Off",
      type: "Discount",
      value: "12%",
      currency: "",
      region: "ALL",
      active: true,
      validFrom: "2025-11-24",
      validTo: "2025-11-30",
      tenantId: "tenant-001"
    },
    {
      id: "promo-002",
      code: "UGX-FREEDEL",
      label: "Uganda Free Delivery",
      type: "Shipping",
      value: "0",
      currency: "UGX",
      region: "UG",
      active: true,
      validFrom: "2025-10-01",
      validTo: "2025-12-31",
      tenantId: "tenant-001"
    }
  ]);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState("Discount");
  const [newValue, setNewValue] = useState('');
  const [newCurrency, setNewCurrency] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');

  const addPromo = () => {
    if (!newCode || !newLabel || !newType || !newValue || !newRegion || !newFrom || !newTo) return;
    setPromos(ps => [
      ...ps,
      {
        id: Math.random().toString(36).slice(2),
        code: newCode,
        label: newLabel,
        type: newType as Promotion["type"],
        value: newValue,
        currency: newCurrency,
        region: newRegion,
        active: true,
        validFrom: newFrom,
        validTo: newTo,
        tenantId: "tenant-new"
      }
    ]);
    setNewCode(""); setNewLabel(""); setNewType("Discount"); setNewValue(""); setNewCurrency(""); setNewRegion(""); setNewFrom(""); setNewTo("");
  };
  const removePromo = (id: string) => setPromos(ps => ps.filter(p => p.id !== id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promotion & Coupon Manager</CardTitle>
        <CardDescription>
          Manage multi-region discount, shipping or gift promotions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Code" value={newCode} onChange={e => setNewCode(e.target.value)}/>
          <Input placeholder="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)}/>
          <select
            className="border p-1 rounded"
            value={newType}
            onChange={e => setNewType(e.target.value)}>
            <option>Discount</option><option>Shipping</option><option>BOGO</option><option>Gift</option>
          </select>
          <Input placeholder="Value (e.g. 10%, 1000)" value={newValue} onChange={e => setNewValue(e.target.value)}/>
          <Input placeholder="Region/Country" value={newRegion} onChange={e => setNewRegion(e.target.value)}/>
          <Input placeholder="Currency" value={newCurrency} onChange={e => setNewCurrency(e.target.value)}/>
          <Input type="date" value={newFrom} onChange={e => setNewFrom(e.target.value)}/>
          <Input type="date" value={newTo} onChange={e => setNewTo(e.target.value)}/>
          <Button onClick={addPromo} variant="secondary"><Plus className="w-4 h-4"/></Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Valid From</TableHead>
              <TableHead>Valid To</TableHead>
              <TableHead>Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promos.length === 0
              ? <TableRow><TableCell colSpan={9}>No promotions.</TableCell></TableRow>
              : promos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.code}</TableCell>
                    <TableCell>{p.label}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>{p.value}{p.currency}</TableCell>
                    <TableCell>{p.region}</TableCell>
                    <TableCell>{p.active ? "Yes" : "No"}</TableCell>
                    <TableCell>{p.validFrom}</TableCell>
                    <TableCell>{p.validTo}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="destructive" onClick={() => removePromo(p.id)}><Trash2 className="w-4 h-4"/></Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}