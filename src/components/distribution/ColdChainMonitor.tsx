'use client';

import React, { useState, useTransition, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { Loader2, Thermometer, Search, X, AlertTriangle, CheckCircle2, Plus, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { logColdChainEntryAction } from "@/lib/actions/distribution";

// DB Type Definition
export interface ColdChainEntry {
  id: string;
  vehicle_reg: string;
  driver_name: string;
  region: string;
  recorded_at: string;
  min_temp: number;
  max_temp: number;
  status: "ok" | "alert";
  country_code: string;
}

interface Props {
  initialData: ColdChainEntry[];
}

export default function ColdChainMonitor({ initialData }: Props) {
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  
  // Manual Entry Form State
  const [formData, setFormData] = useState({
    vehicle: '', driver: '', region: '', country: '', minTemp: '', maxTemp: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filtered = useMemo(
    () => initialData.filter(
      c =>
        c.driver_name.toLowerCase().includes(filter.toLowerCase()) ||
        c.vehicle_reg.toLowerCase().includes(filter.toLowerCase()) ||
        c.region?.toLowerCase().includes(filter.toLowerCase())
    ),
    [initialData, filter]
  );

  const handleAddLog = () => {
    if (!formData.vehicle || !formData.driver || !formData.minTemp || !formData.maxTemp) {
      toast.error("Please fill in required fields (Vehicle, Driver, Temps)");
      return;
    }

    startTransition(async () => {
      const form = new FormData();
      Object.entries(formData).forEach(([k, v]) => form.append(k, v));

      const result = await logColdChainEntryAction(form);
      
      if (result.success) {
        toast.success(result.message);
        setFormData({ vehicle: '', driver: '', region: '', country: '', minTemp: '', maxTemp: '' });
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card className="h-full shadow-sm border-t-4 border-t-blue-500">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-blue-500"/>
                    Cold Chain Monitor
                </CardTitle>
                <CardDescription>
                Real-time temperature tracking and breach alerts.
                </CardDescription>
            </div>
            <div className="flex gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {initialData.length} Logs
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {initialData.filter(x => x.status === 'alert').length} Alerts
                </Badge>
            </div>
        </div>

        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input 
            placeholder="Search logs by vehicle, driver..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8 bg-muted/20"
          />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {/* Manual Log Form (Simulating IoT Ingress or Manual Check) */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-4 p-3 bg-muted/10 border rounded-lg items-end">
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Vehicle</span>
                <Input name="vehicle" value={formData.vehicle} onChange={handleInputChange} placeholder="Reg No." className="h-8 bg-white"/>
            </div>
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Driver</span>
                <Input name="driver" value={formData.driver} onChange={handleInputChange} placeholder="Name" className="h-8 bg-white"/>
            </div>
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Region</span>
                <Input name="region" value={formData.region} onChange={handleInputChange} placeholder="Region" className="h-8 bg-white"/>
            </div>
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Country</span>
                <Input name="country" value={formData.country} onChange={handleInputChange} placeholder="Code" className="h-8 bg-white"/>
            </div>
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Min °C</span>
                <Input type="number" name="minTemp" value={formData.minTemp} onChange={handleInputChange} placeholder="0.0" className="h-8 bg-white"/>
            </div>
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Max °C</span>
                <Input type="number" name="maxTemp" value={formData.maxTemp} onChange={handleInputChange} placeholder="0.0" className="h-8 bg-white"/>
            </div>
            <button 
                onClick={handleAddLog} 
                disabled={isPending}
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-1 text-sm font-medium transition-all"
            >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            </button>
        </div>

        <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0">
                <TableRow>
                  <TableHead>Vehicle & Driver</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Min Temp</TableHead>
                  <TableHead>Max Temp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No cold chain records found.</TableCell></TableRow>
                  : filtered.map(c => (
                      <TableRow key={c.id} className="hover:bg-muted/5">
                        <TableCell>
                            <div className="font-semibold">{c.vehicle_reg}</div>
                            <div className="text-xs text-muted-foreground">{c.driver_name}</div>
                        </TableCell>
                        <TableCell>{c.region || 'N/A'}</TableCell>
                        <TableCell className="text-xs font-mono">
                            {new Date(c.recorded_at).toLocaleDateString()} <br/>
                            {new Date(c.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </TableCell>
                        <TableCell className="font-mono">{c.min_temp.toFixed(1)}°C</TableCell>
                        <TableCell className="font-mono">{c.max_temp.toFixed(1)}°C</TableCell>
                        <TableCell>
                          {c.status === "ok"
                            ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex w-fit gap-1"><CheckCircle2 className="w-3 h-3"/> OK</Badge>
                            : <Badge variant="destructive" className="flex w-fit gap-1"><AlertTriangle className="w-3 h-3"/> ALERT</Badge>
                          }
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1 text-xs">
                                <Globe className="w-3 h-3 text-muted-foreground"/> {c.country_code}
                            </div>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}