'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FleetAssignment {
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
  tenantId: string;
}

export default function FleetManagement() {
  const [assignments, setAssignments] = useState<FleetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [plate, setPlate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [entity, setEntity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setAssignments([
        {
          id: "fhr-001",
          vehicle: "Toyota Hilux",
          plate: "UAX 229S",
          assignedTo: "Liam Smith",
          employeeEmail: "liam@ausmail.com",
          driverLicense: "AUS-X911122",
          licenseExpiry: "2026-06-30",
          insuranceExpiry: "2025-12-31",
          country: "AU",
          entity: "Global Branch AU",
          assignmentDate: "2025-10-12",
          status: "active",
          tenantId: "tenant-002"
        },
        {
          id: "fhr-002",
          vehicle: "Hino Truck",
          plate: "UAQ 330F",
          assignedTo: "Maria Kaggwa",
          employeeEmail: "maria@main.co",
          driverLicense: "UG-2017112902",
          licenseExpiry: "2026-01-27",
          insuranceExpiry: "2026-01-05",
          country: "UG",
          entity: "Main Comp Ltd.",
          assignmentDate: "2025-11-01",
          returnDate: "2025-11-24",
          status: "ended",
          notes: "Gradual brake wear reported.",
          tenantId: "tenant-001"
        }
      ]);
      setLoading(false);
    }, 400);
  }, []);

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
    if (!vehicle || !plate || !assignedTo || !employeeEmail || !entity || !country || !driverLicense || !licenseExpiry || !insuranceExpiry) return;
    setAssignments(asgs => [
      ...asgs,
      {
        id: Math.random().toString(36).slice(2),
        vehicle, plate, assignedTo, employeeEmail, driverLicense, licenseExpiry,
        insuranceExpiry, country, entity,
        assignmentDate: new Date().toISOString().slice(0,10),
        status: "active",
        tenantId: "tenant-auto"
      }
    ]);
    setVehicle(""); setPlate(""); setAssignedTo(""); setEmployeeEmail("");
    setDriverLicense(""); setLicenseExpiry(""); setInsuranceExpiry(""); setEntity(""); setCountry("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Management & Assignment</CardTitle>
        <CardDescription>
          Assign, track, and monitor company vehicles by employee/country—full licensing, compliance, exit control.
        </CardDescription>
        <div className="relative mt-3 mb-2 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input
            placeholder="Filter by vehicle/employee/entity..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-8"
          />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={()=>setFilter("")}/>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input placeholder="Vehicle" value={vehicle} onChange={e => setVehicle(e.target.value)} />
          <Input placeholder="Plate" value={plate} onChange={e => setPlate(e.target.value)} />
          <Input placeholder="Assigned To" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
          <Input placeholder="Email" value={employeeEmail} onChange={e => setEmployeeEmail(e.target.value)} />
          <Input placeholder="License" value={driverLicense} onChange={e => setDriverLicense(e.target.value)} />
          <Input type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)} placeholder="License Expiry"/>
          <Input type="date" value={insuranceExpiry} onChange={e => setInsuranceExpiry(e.target.value)} placeholder="Insurance Expiry"/>
          <Input placeholder="Entity" value={entity} onChange={e => setEntity(e.target.value)} />
          <Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} />
          <Button onClick={assignVehicle} variant="secondary"><Plus className="w-4 h-4" /></Button>
        </div>
        {loading
          ? <div className="flex py-8 justify-center"><AlertTriangle className="h-6 w-6 animate-spin" /></div>
          : <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Driver License</TableHead>
                  <TableHead>License Expiry</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={13}>No vehicle assignments found.</TableCell></TableRow>
                  : filtered.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{a.vehicle}</TableCell>
                        <TableCell>{a.plate}</TableCell>
                        <TableCell>{a.assignedTo}</TableCell>
                        <TableCell>{a.employeeEmail}</TableCell>
                        <TableCell>{a.driverLicense}</TableCell>
                        <TableCell>
                          {a.licenseExpiry}
                          {new Date(a.licenseExpiry) < new Date() && (
                            <span className="ml-1 text-xs text-red-800">EXPIRED</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a.insuranceExpiry}
                          {new Date(a.insuranceExpiry) < new Date() && (
                            <span className="ml-1 text-xs text-red-700">EXPIRED</span>
                          )}
                        </TableCell>
                        <TableCell>{a.assignmentDate}</TableCell>
                        <TableCell>{a.returnDate || ""}</TableCell>
                        <TableCell>
                          {a.status === "active"
                            ? <span className="text-green-800 flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/>Active</span>
                            : a.status === "ended"
                              ? <span className="text-yellow-800">Ended</span>
                              : a.status === "overdue"
                                ? <span className="text-red-800">Overdue</span>
                                : <span className="text-neutral-700">Out of Service</span>
                          }
                        </TableCell>
                        <TableCell>{a.notes || ""}</TableCell>
                        <TableCell>{a.entity}</TableCell>
                        <TableCell>{a.country}</TableCell>
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