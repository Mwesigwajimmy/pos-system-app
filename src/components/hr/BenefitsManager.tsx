'use client';

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";

export interface BenefitEntry {
  id: string;
  benefit: string;
  coverage: string;
  availableTo: string;
  entity: string;
  country: string;
  type: "pension" | "insurance" | "allowance" | "other";
  status: "offered" | "ended";
}

interface BenefitsManagerProps {
    initialBenefits: BenefitEntry[];
}

export default function BenefitsManager({ initialBenefits }: BenefitsManagerProps) {
  const [options, setOptions] = useState<BenefitEntry[]>(initialBenefits);
  
  // Local state for the "Add" form
  const [benefit, setBenefit] = useState('');
  const [coverage, setCoverage] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [entity, setEntity] = useState('');
  const [country, setCountry] = useState('');
  const [type, setType] = useState("pension");

  const addOption = () => {
    // In a real system, invoke a Server Action here
    if (!benefit || !coverage) return;
    const newItem: BenefitEntry = {
        id: Math.random().toString(36).slice(2),
        benefit, coverage, availableTo, entity, country, 
        type: type as BenefitEntry["type"], 
        status: "offered"
    };
    setOptions([...options, newItem]);
    setBenefit(""); setCoverage(""); 
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benefits/Governance Manager</CardTitle>
        <CardDescription>
          Pension, health, incentive & allowance programs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Simple Add Form */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input className="w-32" placeholder="Benefit" value={benefit} onChange={e => setBenefit(e.target.value)}/>
          <Input className="w-32" placeholder="Coverage" value={coverage} onChange={e => setCoverage(e.target.value)}/>
          <Input className="w-32" placeholder="Eligibility" value={availableTo} onChange={e => setAvailableTo(e.target.value)}/>
          <Input className="w-24" placeholder="Entity" value={entity} onChange={e => setEntity(e.target.value)}/>
          <Input className="w-24" placeholder="Country" value={country} onChange={e => setCountry(e.target.value)}/>
          <select className="border rounded px-2" value={type} onChange={e => setType(e.target.value)}>
            <option value="pension">Pension</option>
            <option value="insurance">Insurance</option>
            <option value="allowance">Allowance</option>
            <option value="other">Other</option>
          </select>
          <Button variant="secondary" onClick={addOption}><Plus className="w-4 h-4"/></Button>
        </div>

        <ScrollArea className="h-56">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Benefit</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {options.length === 0
                ? <TableRow><TableCell colSpan={7}>No benefit programs listed.</TableCell></TableRow>
                : options.map(b => (
                    <TableRow key={b.id}>
                        <TableCell>{b.benefit}</TableCell>
                        <TableCell>{b.coverage}</TableCell>
                        <TableCell>{b.availableTo}</TableCell>
                        <TableCell>{b.entity}</TableCell>
                        <TableCell>{b.country}</TableCell>
                        <TableCell className="capitalize">{b.type}</TableCell>
                        <TableCell>
                        {b.status === "offered"
                            ? <span className="text-green-800">Offered</span>
                            : <span className="text-red-900">Ended</span>}
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