'use client';

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { assignVehicleAction } from "@/lib/hr/actions/fleet";
import { useFormStatus } from "react-dom";

export interface FleetAssignment {
  id: string;
  vehicle: string;
  plate: string;
  assignedTo: string;
  employeeEmail: string;
  driverLicense: string;
  licenseExpiry: string;
  country: string;
  entity: string;
  assignmentDate: string;
  returnDate?: string;
  insuranceExpiry: string;
  status: "active" | "ended" | "overdue" | "out-of-service";
  notes?: string;
}

interface FleetManagementProps {
    initialAssignments: FleetAssignment[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="mt-4 w-full md:w-auto" disabled={pending}>
      {pending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Processing...</> : "Assign Vehicle"}
    </Button>
  );
}

export default function FleetManagement({ initialAssignments }: FleetManagementProps) {
  const [filter, setFilter] = useState('');

  const filtered = initialAssignments.filter(a =>
    a.vehicle.toLowerCase().includes(filter.toLowerCase()) ||
    a.plate.toLowerCase().includes(filter.toLowerCase()) ||
    a.assignedTo.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Fleet Management</CardTitle>
        <CardDescription>
          Enterprise fleet tracking, assignment compliance, and history.
        </CardDescription>
        <div className="relative mt-2">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
           <Input 
             placeholder="Search fleet..." 
             className="pl-8 max-w-sm"
             value={filter}
             onChange={(e) => setFilter(e.target.value)} 
            />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        
        <form action={assignVehicleAction} className="bg-slate-50 p-4 rounded-lg border mb-4">
            <h4 className="text-sm font-semibold mb-3 text-slate-800">New Vehicle Assignment</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input required name="vehicle" placeholder="Vehicle Model (e.g. Toyota Hilux)" className="bg-white" />
                <Input required name="plate" placeholder="Plate Number" className="bg-white" />
                <Input required name="assignedTo" placeholder="Driver Name" className="bg-white" />
                <Input name="driverLicense" placeholder="License Number" className="bg-white" />
                
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">License Expiry</label>
                    <Input required name="licenseExpiry" type="date" className="bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Insurance Expiry</label>
                    <Input required name="insuranceExpiry" type="date" className="bg-white" />
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Notes / Condition</label>
                    <Input name="notes" placeholder="Vehicle condition, mileage..." className="bg-white" />
                </div>
            </div>
            <div className="flex justify-end">
                <SubmitButton />
            </div>
        </form>

        <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader className="bg-slate-100 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Vehicle Info</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignment Date</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center p-8 text-muted-foreground">No active assignments matching filter.</TableCell></TableRow>
                  : filtered.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>
                            <div className="font-medium text-slate-900">{a.vehicle}</div>
                            <div className="text-xs font-mono bg-slate-100 inline-block px-1 rounded">{a.plate}</div>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{a.assignedTo}</div>
                            <div className="text-xs text-muted-foreground">{a.employeeEmail}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                             <div className={`flex items-center gap-1 ${new Date(a.licenseExpiry) < new Date() ? "text-red-600 font-bold" : "text-slate-600"}`}>
                                <span>Lic: {a.licenseExpiry}</span>
                                {new Date(a.licenseExpiry) < new Date() && <AlertTriangle className="w-3 h-3"/>}
                             </div>
                             <div className={`flex items-center gap-1 ${new Date(a.insuranceExpiry) < new Date() ? "text-red-600 font-bold" : "text-slate-600"}`}>
                                <span>Ins: {a.insuranceExpiry}</span>
                             </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {a.status === "active"
                            ? <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium flex w-fit items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Active</span>
                            : <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded-full text-xs font-medium capitalize">{a.status}</span>
                          }
                        </TableCell>
                        <TableCell>
                            <div className="text-sm">{new Date(a.assignmentDate).toLocaleDateString()}</div>
                            {a.returnDate && <div className="text-xs text-muted-foreground">Ret: {new Date(a.returnDate).toLocaleDateString()}</div>}
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{a.country}</div>
                            <div className="text-xs text-muted-foreground">{a.entity}</div>
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