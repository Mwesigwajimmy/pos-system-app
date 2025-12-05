'use client';

import React, { useState, useTransition, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, Wrench, Plus, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { addMaintenanceLogAction } from "@/lib/actions/distribution";

export interface MaintenanceLog {
  id: string;
  vehicle_reg: string;
  issue_description: string;
  service_performed: string;
  cost: number;
  currency_code: string;
  service_provider: string;
  serviced_at: string;
  next_due: string;
  country_code: string;
}

interface Props {
  initialLogs: MaintenanceLog[];
}

export default function FleetMaintenanceLogs({ initialLogs }: Props) {
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    vehicle: '', issue: '', service: '', cost: '', currency: 'USD', provider: '', date: '', nextDue: '', country: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filtered = useMemo(() => initialLogs.filter(l =>
    l.vehicle_reg.toLowerCase().includes(filter.toLowerCase()) ||
    l.issue_description.toLowerCase().includes(filter.toLowerCase())
  ), [initialLogs, filter]);

  const handleAdd = () => {
    if (!formData.vehicle || !formData.service) {
        toast.error("Vehicle and Service details are required");
        return;
    }
    startTransition(async () => {
        const form = new FormData();
        Object.entries(formData).forEach(([k,v]) => form.append(k,v));
        const res = await addMaintenanceLogAction(form);
        if (res.success) {
            toast.success(res.message);
            setFormData({ vehicle: '', issue: '', service: '', cost: '', currency: 'USD', provider: '', date: '', nextDue: '', country: ''});
        } else {
            toast.error(res.message);
        }
    });
  };

  return (
    <Card className="h-full border-t-4 border-t-orange-500 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500"/> Fleet Maintenance
        </CardTitle>
        <CardDescription>Service tracking and cost management.</CardDescription>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input placeholder="Filter by vehicle/issue..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8"/>
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Form */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 p-3 bg-muted/10 border rounded-lg items-end">
            <Input name="vehicle" value={formData.vehicle} onChange={handleInputChange} placeholder="Vehicle Reg" className="h-8 bg-white"/>
            <Input name="issue" value={formData.issue} onChange={handleInputChange} placeholder="Issue" className="h-8 bg-white"/>
            <Input name="service" value={formData.service} onChange={handleInputChange} placeholder="Service Done" className="h-8 bg-white"/>
            <div className="flex gap-1">
                <Input name="cost" type="number" value={formData.cost} onChange={handleInputChange} placeholder="Cost" className="h-8 bg-white w-2/3"/>
                <Input name="currency" value={formData.currency} onChange={handleInputChange} placeholder="USD" className="h-8 bg-white w-1/3"/>
            </div>
            <Input name="provider" value={formData.provider} onChange={handleInputChange} placeholder="Mechanic/Shop" className="h-8 bg-white"/>
            <Input name="date" type="date" value={formData.date} onChange={handleInputChange} className="h-8 bg-white"/>
            <Input name="nextDue" type="date" value={formData.nextDue} onChange={handleInputChange} className="h-8 bg-white"/>
            <Input name="country" value={formData.country} onChange={handleInputChange} placeholder="Country" className="h-8 bg-white"/>
            <button onClick={handleAdd} disabled={isPending} className="h-8 bg-orange-600 hover:bg-orange-700 text-white rounded-md flex items-center justify-center gap-1 text-sm font-medium col-span-2 md:col-span-1">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <>Log Service <Plus className="w-4 h-4"/></>}
            </button>
        </div>

        <ScrollArea className="h-[400px] border rounded-md">
            <Table>
            <TableHeader className="bg-muted/40 sticky top-0">
                <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Issue & Service</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Country</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No logs found.</TableCell></TableRow> :
                filtered.map(l => (
                    <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.vehicle_reg}</TableCell>
                        <TableCell>
                            <div className="text-sm font-semibold">{l.issue_description}</div>
                            <div className="text-xs text-muted-foreground">{l.service_performed}</div>
                        </TableCell>
                        <TableCell className="font-mono">{l.currency_code} {l.cost.toLocaleString()}</TableCell>
                        <TableCell>{l.service_provider}</TableCell>
                        <TableCell className="text-xs">
                            <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400"/> Done: {new Date(l.serviced_at).toLocaleDateString()}</div>
                            <div className="flex items-center gap-1 font-semibold text-orange-700"><Calendar className="w-3 h-3"/> Next: {new Date(l.next_due).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell>{l.country_code}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}