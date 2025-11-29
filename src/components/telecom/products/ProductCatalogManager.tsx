'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, Plus, X } from "lucide-react";

interface TelecomProduct { 
    id: string; 
    name: string; 
    type: 'AIRTIME' | 'DATA' | 'SIM' | 'DEVICE' | 'VAS'; 
    currency: string; 
    price: number; 
    status: 'ACTIVE' | 'INACTIVE'; 
    regions: string[]; 
}

async function fetchProducts(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('telecom_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) throw error; 
  return data as TelecomProduct[];
}

async function addProduct(product: any) {
  const db = createClient();
  const { error } = await db.from('telecom_products').insert([product]);
  if (error) throw new Error(error.message);
}

export function ProductCatalogManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  
  // Form State
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('AIRTIME');
  const [price, setPrice] = React.useState('');
  const [currency, setCurrency] = React.useState('USD');
  const [currentRegion, setCurrentRegion] = React.useState('');
  const [regions, setRegions] = React.useState<string[]>([]);

  const { data, isLoading } = useQuery({ 
      queryKey: ['tc-products', tenantId], 
      queryFn: () => fetchProducts(tenantId) 
  });

  const mutation = useMutation({ 
      mutationFn: () => addProduct({ 
          name, 
          type, 
          price: parseFloat(price), 
          regions, 
          status: "ACTIVE", 
          currency, 
          tenant_id: tenantId 
      }),
      onSuccess: () => {
          toast.success('Product added to catalog');
          setName('');
          setPrice('');
          setRegions([]);
          queryClient.invalidateQueries({ queryKey: ['tc-products', tenantId] });
      },
      onError: (e) => toast.error(e.message || "Failed to add product") 
  });

  const handleAddRegion = () => {
      if (currentRegion && !regions.includes(currentRegion)) {
          setRegions([...regions, currentRegion]);
          setCurrentRegion('');
      }
  };

  const handleRemoveRegion = (reg: string) => {
      setRegions(regions.filter(r => r !== reg));
  };

  return (
    <Card className="h-full border-t-4 border-t-purple-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-600"/> Product Catalog
          </CardTitle>
          <CardDescription>Manage SKUs, bundles, and pricing tiers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Add Product Form */}
        <div className="p-4 bg-slate-50 border rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} />
                
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AIRTIME">Airtime</SelectItem>
                        <SelectItem value="DATA">Data Bundle</SelectItem>
                        <SelectItem value="SIM">SIM Card</SelectItem>
                        <SelectItem value="DEVICE">Device / Handset</SelectItem>
                        <SelectItem value="VAS">Value Added Service</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex gap-2">
                    <Input 
                        placeholder="Price" 
                        type="number" 
                        value={price} 
                        onChange={e => setPrice(e.target.value)}
                        className="flex-1"
                    />
                    <Input 
                        placeholder="Curr" 
                        value={currency} 
                        onChange={e => setCurrency(e.target.value)} 
                        className="w-20"
                    />
                </div>
            </div>

            <div className="flex gap-2 items-center">
                <Input 
                    placeholder="Add Region (e.g. Kampala)" 
                    value={currentRegion} 
                    onChange={e => setCurrentRegion(e.target.value)} 
                    className="max-w-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddRegion}>
                    <Plus className="w-4 h-4 mr-2"/> Region
                </Button>
                
                <div className="flex gap-2 flex-wrap ml-2">
                    {regions.map(r => (
                        <Badge key={r} variant="secondary" className="flex items-center gap-1">
                            {r} 
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => handleRemoveRegion(r)}/>
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <Button 
                    onClick={() => mutation.mutate()} 
                    disabled={!name || !price || mutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Save Product"}
                </Button>
            </div>
        </div>

        {/* Product Table */}
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No products found.</TableCell></TableRow>
                ) : (
                    data.map((prod) => (
                    <TableRow key={prod.id}>
                        <TableCell className="font-medium">{prod.name}</TableCell>
                        <TableCell><Badge variant="outline">{prod.type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {prod.regions?.length > 0 ? prod.regions.join(", ") : "Global"}
                        </TableCell>
                        <TableCell>
                            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                <span className="w-2 h-2 rounded-full bg-green-600"/> Active
                            </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                            {prod.currency} {prod.price.toLocaleString()}
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