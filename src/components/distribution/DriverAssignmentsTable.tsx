'use client';

import React, { useState, useTransition, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Search, X, Plus, Trash2, Globe, Truck } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge"; 
import { toast } from "sonner"; // Assuming you use sonner or similar
import { addDriverAssignmentAction, removeDriverAssignmentAction } from "@/lib/actions/distribution"; // Correct import path

// Types matching the DB
export interface DriverAssignment {
  id: string;
  driver_name: string;
  route_name: string;
  vehicle_reg: string;
  region: string;
  country_code: string;
  currency_code: string;
  status: string;
  assigned_at: string;
  business_id: string;
}

interface Props {
  initialData: DriverAssignment[];
}

export default function DriverAssignmentsTable({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    driverName: '', route: '', vehicle: '', region: '', country: '', currency: 'USD'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filtered = useMemo(() => initialData.filter(d => 
    d.driver_name.toLowerCase().includes(filter.toLowerCase()) ||
    d.route_name.toLowerCase().includes(filter.toLowerCase()) ||
    d.region.toLowerCase().includes(filter.toLowerCase())
  ), [initialData, filter]);

  const handleAdd = () => {
    if (!formData.driverName || !formData.route || !formData.vehicle) {
      toast.error("Please fill in Driver, Route, and Vehicle.");
      return;
    }

    startTransition(async () => {
      const form = new FormData();
      Object.entries(formData).forEach(([k, v]) => form.append(k, v));
      
      const result = await addDriverAssignmentAction(form);
      
      if (result.success) {
        toast.success(result.message);
        setFormData({ driverName: '', route: '', vehicle: '', region: '', country: '', currency: 'USD' });
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const result = await removeDriverAssignmentAction(id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  return (
    <Card className="h-full border-t-4 border-t-primary shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary"/> 
                    Driver Assignments
                </CardTitle>
                <CardDescription>Enterprise Fleet & Route Management</CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1">
                {initialData.length} Active
            </Badge>
        </div>
        
        <div className="relative mt-2 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input 
            placeholder="Search drivers or routes..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8 bg-muted/30"
          />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 cursor-pointer text-muted-foreground" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Quick Add Form Row */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-4 p-3 bg-muted/10 border rounded-lg items-end">
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Driver</span>
                <Input name="driverName" value={formData.driverName} onChange={handleInputChange} placeholder="Name" className="h-8 bg-white"/>
            </div>
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Route</span>
                <Input name="route" value={formData.route} onChange={handleInputChange} placeholder="Route" className="h-8 bg-white"/>
            </div>
            <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground ml-1">Vehicle</span>
                <Input name="vehicle" value={formData.vehicle} onChange={handleInputChange} placeholder="Reg No." className="h-8 bg-white"/>
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
                <span className="text-xs font-medium text-muted-foreground ml-1">Currency</span>
                <Input name="currency" value={formData.currency} onChange={handleInputChange} placeholder="Ex. USD" className="h-8 bg-white"/>
            </div>
            <button 
                onClick={handleAdd} 
                disabled={isPending}
                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center justify-center gap-1 text-sm font-medium transition-all"
            >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            </button>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Driver Info</TableHead>
                <TableHead>Route & Region</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">No assignments found.</TableCell></TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/5">
                    <TableCell>
                        <div className="font-semibold text-sm">{row.driver_name}</div>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm">{row.route_name}</div>
                        <div className="text-xs text-muted-foreground">{row.region}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.vehicle_reg}</TableCell>
                    <TableCell>
                         <div className="flex items-center gap-1 text-xs bg-secondary/30 w-fit px-2 py-1 rounded">
                            <Globe className="w-3 h-3"/> {row.country_code}
                         </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.assigned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
                            {row.status}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => handleRemove(row.id)}
                        disabled={isPending}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}