"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Badge } from '@/components/ui/badge';

interface FiscalPosition {
  id: string;
  entity: string;
  country: string;
  description: string;
  vat_category: string;
  applies_to: string;
  active: boolean;
}

interface Props {
  tenantId?: string;
}

export default function FiscalPositionsTable({ tenantId: propTenantId }: Props) {
  // FIX: Destructure 'data' from the hook result, as it returns a UseQueryResult
  const { data: tenant } = useTenant();
  
  // FIX: Access the ID from the tenant data object
  const tenantId = propTenantId || tenant?.id;
  
  const [positions, setPositions] = useState<FiscalPosition[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;

    const fetchPositions = async () => {
      const { data } = await supabase
        .from('accounting_fiscal_positions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('country', { ascending: true });

      if (data) setPositions(data as any);
      setLoading(false);
    };

    fetchPositions();
  }, [tenantId, supabase]);

  const filtered = useMemo(
    () =>
      positions.filter(
        p =>
          (p.entity || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.country || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.vat_category || '').toLowerCase().includes(filter.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(filter.toLowerCase())
      ),
    [positions, filter]
  );

  // While loading the tenant ID or the data
  if (loading && !positions.length && !tenantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fiscal Positions</CardTitle>
          <CardDescription>Loading global tax configurations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiscal Positions</CardTitle>
        <CardDescription>
          Map VAT/GST by region/country, manage compliance for all global transactions.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter regions..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8" 
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setFilter('')}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 border rounded-md">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No fiscal positions found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.entity}</TableCell>
                    <TableCell>{p.country}</TableCell>
                    <TableCell>{p.description}</TableCell>
                    <TableCell>{p.vat_category}</TableCell>
                    <TableCell className="capitalize">{p.applies_to}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? 'default' : 'secondary'}>
                        {p.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}