'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Search, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export default function FleetManagement({ initialAssignments }: FleetManagementProps) {
  const [assignments, setAssignments] = useState<FleetAssignment[]>(initialAssignments);
  const [filter, setFilter] = useState('');
  
  // Local state for the "Add Assignment" form
  const [vehicle, setVehicle] = useState('');
  const [plate, setPlate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');

  const filtered = useMemo(
    () => assignments.filter(a =>
      a.vehicle.toLowerCase().includes(filter.toLowerCase()) ||
      a.plate.toLowerCase().includes(filter.toLowerCase()) ||
      a.assignedTo.toLowerCase().includes(filter.toLowerCase()) ||
      a.entity.toLowerCase().includes(filter.toLowerCase()) ||
      a.country.toLowerCase().includes(filter.toLowerCase())
    ),
    [assignments, filter]
  );

  const assignVehicle = () => {
    // In real app: Server Action
    if (!vehicle || !plate || !assignedTo) return;
    
    const newAssignment: FleetAssignment = {
        id: Math.random().toString(36).slice(2),
        vehicle, plate, assignedTo, employeeEmail, driverLicense, licenseExpiry,
        insuranceExpiry, 
        country: 'UG', // Default
        entity: 'Logistics', // Default
        assignmentDate: new Date().toISOString().slice(0,10),
        status: "active",
    };
    
    setAssignments([newAssignment, ...assignments]);
    
    // Reset Form
    setVehicle(""); setPlate(""); setAssignedTo(""); setEmployeeEmail("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Management & Assignment</CardTitle>
        <CardDescription>
          Assign, track, and monitor company vehicles by employee/country.
        </CardDescription>
        <div className="relative mt-3 mb-2 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input
            placeholder="Filter by vehicle/employee..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-8"
          />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        {/* Assignment Form */}
        <div className="flex gap-2 mb-3 flex-wrap p-4 bg-muted/20 rounded-md">
          <Input className="w-32" placeholder="Vehicle" value={vehicle} onChange={e => setVehicle(e.target.value)} />
          <Input className="w-28" placeholder="Plate" value={plate} onChange={e => setPlate(e.target.value)} />
          <Input className="w-32" placeholder="Driver Name" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
          <Input className="w-32" placeholder="License No." value={driverLicense} onChange={e => setDriverLicense(e.target.value)} />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground ml-1">License Exp.</span>
            <Input className="w-36" type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)}/>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground ml-1">Insurance Exp.</span>
            <Input className="w-36" type="date" value={insuranceExpiry} onChange={e => setInsuranceExpiry(e.target.value)}/>
          </div>
          <Button onClick={assignVehicle} className="mt-4" variant="secondary"><Plus className="w-4 h-4 mr-2" /> Assign</Button>
        </div>

        <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Driver License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiries</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={8} className="text-center p-4">No vehicle assignments found.</TableCell></TableRow>
                  : filtered.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.vehicle}</TableCell>
                        <TableCell>{a.plate}</TableCell>
                        <TableCell>
                            <div>{a.assignedTo}</div>
                            <div className="text-xs text-muted-foreground">{a.employeeEmail}</div>
                        </TableCell>
                        <TableCell>{a.driverLicense}</TableCell>
                        <TableCell>
                          {a.status === "active"
                            ? <span className="text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/>Active</span>
                            : <span className="text-muted-foreground capitalize">{a.status}</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                             <div className={new Date(a.licenseExpiry) < new Date() ? "text-red-600 font-bold" : ""}>
                                Lic: {a.licenseExpiry}
                             </div>
                             <div className={new Date(a.insuranceExpiry) < new Date() ? "text-red-600 font-bold" : "text-muted-foreground"}>
                                Ins: {a.insuranceExpiry}
                             </div>
                          </div>
                        </TableCell>
                        <TableCell>
                            {a.assignmentDate}
                            {a.returnDate && <div className="text-xs text-muted-foreground">Ret: {a.returnDate}</div>}
                        </TableCell>
                        <TableCell>{a.country} <span className="text-xs text-muted-foreground">({a.entity})</span></TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}