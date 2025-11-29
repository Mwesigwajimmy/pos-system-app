'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Receipt, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Tariff { 
    id: string; 
    name: string; 
    plan_type: 'PREPAID' | 'POSTPAID' | 'HYBRID'; 
    region: string; 
    price: number; 
    unit: string; 
    status: 'ACTIVE' | 'ARCHIVED'; 
}

async function fetchTariffs(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('tariffs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) throw error; 
  return data as Tariff[];
}

async function addTariff(tariff: any) {
  const db = createClient();
  const { error } = await db.from('tariffs').insert([tariff]); 
  if (error) throw new Error(error.message);
}

export function TariffPlansManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  
  const [name, setName] = React.useState('');
  const [planType, setPlanType] = React.useState('PREPAID');
  const [region, setRegion] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [unit, setUnit] = React.useState('USD');

  const { data, isLoading } = useQuery({ 
      queryKey: ['tariffs', tenantId], 
      queryFn: () => fetchTariffs(tenantId) 
  });

  const mutation = useMutation({ 
      mutationFn: () => addTariff({ 
          name, 
          plan_type: planType, 
          region, 
          price: parseFloat(price), 
          unit, 
          status: "ACTIVE", 
          tenant_id: tenantId 
      }),
      onSuccess: () => {
          toast.success('Tariff plan created');
          setName(''); 
          setPrice(''); 
          setRegion('');
          queryClient.invalidateQueries({ queryKey: ['tariffs', tenantId] });
      },
      onError: (e) => toast.error(e.message || "Creation failed")
  });

  return (
    <Card className="h-full border-t-4 border-t-pink-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-pink-600"/> Tariff Configuration
          </CardTitle>
          <CardDescription>Set billing rates and subscription plan details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Creation Form */}
        <div className="p-3 bg-slate-50 border rounded-lg flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium mb-1 block">Plan Name</label>
                <Input placeholder="e.g. Gold Saver" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="w-[140px]">
                <label className="text-xs font-medium mb-1 block">Type</label>
                <Select value={planType} onValueChange={setPlanType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PREPAID">Prepaid</SelectItem>
                        <SelectItem value="POSTPAID">Postpaid</SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex-1 min-w-[120px]">
                <label className="text-xs font-medium mb-1 block">Region</label>
                <Input placeholder="e.g. National" value={region} onChange={e => setRegion(e.target.value)} />
            </div>
            <div className="w-[100px]">
                <label className="text-xs font-medium mb-1 block">Price</label>
                <Input type="number" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)}/>
            </div>
            <div className="w-[80px]">
                <label className="text-xs font-medium mb-1 block">Currency</label>
                <Input value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
            <Button 
                onClick={() => mutation.mutate()} 
                disabled={!name || !price || mutation.isPending}
                className="bg-pink-600 hover:bg-pink-700 text-white"
            >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            </Button>
        </div>

        {/* Tariff Table */}
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Rate / Cost</TableHead>
                <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No active tariffs.</TableCell></TableRow>
                ) : (
                    data.map((tar) => (
                    <TableRow key={tar.id}>
                        <TableCell className="font-medium">{tar.name}</TableCell>
                        <TableCell><Badge variant="outline">{tar.plan_type}</Badge></TableCell>
                        <TableCell>{tar.region}</TableCell>
                        <TableCell className="text-right font-mono">
                            {tar.unit} {tar.price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                            <Badge className="bg-green-600">{tar.status}</Badge>
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  )
}