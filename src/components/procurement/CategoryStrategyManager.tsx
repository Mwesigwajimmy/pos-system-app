"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X, PlusCircle, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

// ENTERPRISE TYPE ALIGNMENT: Matches DB columns 1:1
interface CategoryStrategy {
  id: string;
  category_name: string; // Updated from 'category' to match SQL schema
  owner: string;
  priority: "core" | "leverage" | "bottleneck" | "non-critical";
  budget: number;
  currency: string; // Added to match SQL schema
  strategy: string;
  review_date: string;
  entity: string;
  country: string;
}

interface Props {
  tenantId?: string;
}

export default function CategoryStrategyManager({ tenantId }: Props) {
  const [categories, setCategories] = useState<CategoryStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Form states aligned with DB Schema
  const [cat, setCat] = useState('');
  const [owner, setOwner] = useState('');
  const [priority, setPriority] = useState("core");
  const [budget, setBudget] = useState('');
  const [strategy, setStrategy] = useState('');
  const [entity, setEntity] = useState('');
  const [country, setCountry] = useState('');
  const [reviewDate, setReviewDate] = useState('');

  useEffect(() => {
    if(!tenantId) return;

    const fetchData = async () => {
      const { data } = await supabase
        .from('procurement_category_strategies')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (data) setCategories(data as any);
      setLoading(false);
    };

    fetchData();
  }, [tenantId, supabase]);

  const addCategory = async () => {
    if (!tenantId || !cat || !owner || !budget) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('procurement_category_strategies')
      .insert({
        tenant_id: tenantId,
        category_name: cat, // Mapped to DB column 'category_name'
        owner,
        priority,
        budget: parseFloat(budget),
        currency: "USD", // Defaulting to USD for enterprise consistency
        strategy: strategy || "Standard Strategic Sourcing Plan",
        review_date: reviewDate || new Date().toISOString().split('T')[0],
        entity,
        country
      })
      .select()
      .single();

    if (!error && data) {
      setCategories(prev => [data as any, ...prev]);
      // Reset form
      setCat(''); setOwner(''); setBudget(''); setStrategy(''); setEntity(''); setCountry(''); setReviewDate('');
    }
    setLoading(false);
  };

  const [filter, setFilter] = useState('');
  const filtered = useMemo(
    () => categories.filter(c =>
      (c.category_name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (c.owner || '').toLowerCase().includes(filter.toLowerCase())
    ),
    [categories, filter]
  );

  return (
    <Card className="shadow-lg border-t-4 border-t-purple-500">
      <CardHeader>
        <CardTitle>Procurement Category Strategy</CardTitle>
        <CardDescription>
          Manage strategies and budgets for spend categories.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Input placeholder="Filter..." value={filter} onChange={e=>setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3 flex-wrap bg-slate-50 p-3 rounded-lg">
          <Input placeholder="Category" value={cat} onChange={e=>setCat(e.target.value)} className="w-32" />
          <Input placeholder="Owner" value={owner} onChange={e=>setOwner(e.target.value)} className="w-32" />
          <select className="border p-2 rounded text-sm bg-white" value={priority} onChange={e=>setPriority(e.target.value)}>
            <option value="core">Core</option>
            <option value="leverage">Leverage</option>
            <option value="bottleneck">Bottleneck</option>
            <option value="non-critical">Non-Critical</option>
          </select>
          <Input placeholder="Budget" type="number" value={budget} onChange={e=>setBudget(e.target.value)} className="w-24"/>
          <Input placeholder="Entity" value={entity} onChange={e=>setEntity(e.target.value)} className="w-24" />
          <Button variant="default" className="bg-purple-600 hover:bg-purple-700" onClick={addCategory} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-5 w-5"/>}
          </Button>
        </div>

        {loading
          ? <div className="flex py-8 justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>
          : <ScrollArea className="h-64 rounded-md border">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={6} className="text-center py-4">No strategies defined.</TableCell></TableRow>
                    : filtered.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-semibold text-purple-900">{c.category_name}</TableCell>
                          <TableCell>{c.owner}</TableCell>
                          <TableCell className="capitalize">{c.priority}</TableCell>
                          <TableCell className="font-mono">{c.currency || 'USD'} {Number(c.budget).toLocaleString()}</TableCell>
                          <TableCell>{c.review_date}</TableCell>
                          <TableCell className="text-xs flex items-center gap-1 mt-2">
                             <Globe className="h-3 w-3" /> {c.country} / {c.entity}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
        }
      </CardContent>
    </Card>
  );
}