'use client';

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from "lucide-react";

interface PaymentProvider {
  id: string;
  name: string;
  type: "Mobile Money" | "Credit Card" | "Bank" | "Voucher" | "Other";
  region: string;
  entity: string;
  active: boolean;
  currency: string;
  tenantId: string;
}

export default function PaymentProviderManager() {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Mobile Money');
  const [newRegion, setNewRegion] = useState('');
  const [newEntity, setNewEntity] = useState('');
  const [newCurrency, setNewCurrency] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setProviders([
        {
          id: "pay-001",
          name: "MTN Mobile Money",
          type: "Mobile Money",
          region: "UG",
          entity: "Main Comp Ltd.",
          active: true,
          currency: "UGX",
          tenantId: "tenant-001"
        },
        {
          id: "pay-002",
          name: "Stripe Credit Card",
          type: "Credit Card",
          region: "AU",
          entity: "Global Branch AU",
          active: true,
          currency: "AUD",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 340);
  }, []);

  const addProvider = () => {
    if (!newName || !newType || !newRegion || !newEntity || !newCurrency) return;
    setProviders(ps => [
      ...ps,
      {
        id: Math.random().toString(36).slice(2),
        name: newName,
        type: newType as PaymentProvider["type"],
        region: newRegion,
        entity: newEntity,
        active: true,
        currency: newCurrency,
        tenantId: "tenant-auto"
      }
    ]);
    setNewName(""); setNewType("Mobile Money"); setNewRegion(""); setNewEntity(""); setNewCurrency("");
  };
  const removeProvider = (id: string) => setProviders(ps => ps.filter(p => p.id !== id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Provider Manager</CardTitle>
        <CardDescription>
          Manage payment gateways — local and cross-border, per region/entity/currency.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <input className="border rounded px-2" placeholder="Provider Name" value={newName} onChange={e => setNewName(e.target.value)} />
          <select className="border p-1 rounded" value={newType} onChange={e => setNewType(e.target.value)}>
            <option>Mobile Money</option><option>Credit Card</option><option>Bank</option><option>Voucher</option><option>Other</option>
          </select>
          <input className="border rounded px-2" placeholder="Region" value={newRegion} onChange={e => setNewRegion(e.target.value)} />
          <input className="border rounded px-2" placeholder="Entity" value={newEntity} onChange={e => setNewEntity(e.target.value)} />
          <input className="border rounded px-2" placeholder="Currency" value={newCurrency} onChange={e => setNewCurrency(e.target.value)} />
          <Button onClick={addProvider} variant="secondary"><Plus className="w-4 h-4"/></Button>
        </div>
        {loading
          ? <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin"/></div>
          : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.length === 0
                  ? <TableRow><TableCell colSpan={7}>No payment providers.</TableCell></TableRow>
                  : providers.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.type}</TableCell>
                        <TableCell>{p.region}</TableCell>
                        <TableCell>{p.entity}</TableCell>
                        <TableCell>{p.currency}</TableCell>
                        <TableCell>{p.active ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" onClick={() => removeProvider(p.id)}><Trash2 className="w-4 h-4"/></Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
        }
      </CardContent>
    </Card>
  );
}