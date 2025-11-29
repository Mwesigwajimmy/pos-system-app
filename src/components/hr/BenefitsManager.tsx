'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Gift, Plus } from "lucide-react";

interface BenefitEntry {
  id: string;
  benefit: string;
  coverage: string;
  availableTo: string;
  entity: string;
  country: string;
  type: "pension" | "insurance" | "allowance" | "other";
  status: "offered" | "ended";
  tenantId: string;
}

export default function BenefitsManager() {
  const [options, setOptions] = useState<BenefitEntry[]>([]);
  const [benefit, setBenefit] = useState('');
  const [coverage, setCoverage] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [entity, setEntity] = useState('');
  const [country, setCountry] = useState('');
  const [type, setType] = useState("pension");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setOptions([
        {
          id: "ben-001",
          benefit: "Pension Contribution",
          coverage: "Employer 10%, Employee 5%",
          availableTo: "All full-time staff",
          entity: "Main Comp Ltd.",
          country: "UG",
          type: "pension",
          status: "offered",
          tenantId: "tenant-001"
        },
        {
          id: "ben-002",
          benefit: "Private Health Insurance",
          coverage: "UGX 30 million yearly, up to 4 family",
          availableTo: "Permanent, Managers",
          entity: "Global Branch AU",
          country: "AU",
          type: "insurance",
          status: "offered",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 320);
  }, []);

  const addOption = () => {
    if (!benefit || !coverage || !availableTo || !entity || !country) return;
    setOptions(os => [
      ...os,
      {
        id: Math.random().toString(36).slice(2),
        benefit, coverage, availableTo, entity, country, type: type as BenefitEntry["type"], status: "offered", tenantId: "tenant-new"
      }
    ]);
    setBenefit(""); setCoverage(""); setAvailableTo(""); setEntity(""); setCountry(""); setType("pension");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benefits/Governance Manager</CardTitle>
        <CardDescription>
          Pension, health, incentive & allowance programs—filter, view, administer all options by region/entity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Benefit" value={benefit} onChange={e => setBenefit(e.target.value)}/>
          <Input placeholder="Coverage" value={coverage} onChange={e => setCoverage(e.target.value)}/>
          <Input placeholder="Available To" value={availableTo} onChange={e => setAvailableTo(e.target.value)}/>
          <Input placeholder="Entity" value={entity} onChange={e => setEntity(e.target.value)}/>
          <Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)}/>
          <select className="border rounded" value={type} onChange={e => setType(e.target.value)}>
            <option value="pension">Pension</option>
            <option value="insurance">Insurance</option>
            <option value="allowance">Allowance</option>
            <option value="other">Other</option>
          </select>
          <Button variant="secondary" onClick={addOption}><Plus className="w-4 h-4"/></Button>
        </div>
        {loading
          ? <div className="flex justify-center py-6"><Gift className="h-7 w-7 animate-spin" /></div>
          : <ScrollArea className="h-56">
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
                          <TableCell>{b.type}</TableCell>
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
        }
      </CardContent>
    </Card>
  );
}