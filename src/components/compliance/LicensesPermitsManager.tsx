'use client';

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { differenceInDays } from "date-fns";

interface License {
  id: string;
  type: string;
  number: string;
  entity: string;
  country: string;
  issued_date: string;
  expires_date: string;
  status: string;
}

export default function LicensesPermitsManager() {
  const supabase = createClient();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetch = async () => {
        const { data } = await supabase.from('licenses').select('*').order('expires_date', { ascending: true });
        setLicenses(data as License[] || []);
        setLoading(false);
    };
    fetch();
  }, []);

  const getStatusColor = (date: string) => {
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return "text-red-600 font-bold bg-red-50 px-2 rounded";
    if (days < 60) return "text-orange-600 font-bold bg-orange-50 px-2 rounded";
    return "text-green-600";
  };

  const filtered = useMemo(() => licenses.filter(l => 
    l.type.toLowerCase().includes(filter.toLowerCase()) || l.entity.toLowerCase().includes(filter.toLowerCase())
  ), [licenses, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Licenses & Permits</CardTitle>
        <CardDescription>Expiry tracking for operating licenses.</CardDescription>
        <div className="relative mt-2 max-w-sm">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground"/>
            <Input className="pl-8" placeholder="Filter licenses..." value={filter} onChange={e => setFilter(e.target.value)}/>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin"/></div> :
        <ScrollArea className="h-[350px]">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>License #</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.map(l => (
                <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.type}</TableCell>
                    <TableCell className="font-mono text-xs">{l.number}</TableCell>
                    <TableCell>{l.entity} ({l.country})</TableCell>
                    <TableCell>{l.expires_date}</TableCell>
                    <TableCell className={getStatusColor(l.expires_date)}>
                        {differenceInDays(new Date(l.expires_date), new Date()) < 0 ? 'Expired' : 
                         differenceInDays(new Date(l.expires_date), new Date()) < 60 ? 'Expiring Soon' : 'Active'}
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