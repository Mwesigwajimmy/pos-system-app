'use client';

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Gift, AlertCircle, Plus } from "lucide-react";

interface Recognition {
  id: string;
  employee: string;
  award: string;
  type: "Bonus" | "Award" | "Milestone" | "Gift";
  description: string;
  value?: number;
  entity: string;
  country: string;
  date: string;
  tenantId: string;
}

export default function RewardsRecognition() {
  const [rewards, setRewards] = useState<Recognition[]>([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState('');
  const [award, setAward] = useState('');
  const [type, setType] = useState("Bonus");
  const [desc, setDesc] = useState('');
  const [value, setValue] = useState('');
  const [entity, setEntity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setRewards([
        {
          id: "rec-001",
          employee: "Maya Okoth",
          award: "Q3 Top Performer",
          type: "Award",
          description: "Outstanding month-end close performance",
          entity: "Main Comp Ltd.",
          country: "UG",
          date: "2025-11-10",
          tenantId: "tenant-001"
        },
        {
          id: "rec-002",
          employee: "Liam Smith",
          award: "On-Time Driver",
          type: "Milestone",
          description: "Completed 100+ deliveries on-time",
          entity: "Global Branch AU",
          country: "AU",
          date: "2025-10-21",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 320);
  }, []);

  const addReward = () => {
    if (!employee || !award || !type || !entity || !country) return;
    setRewards(rs => [
      ...rs,
      {
        id: Math.random().toString(36).slice(2),
        employee, award, type: type as Recognition["type"], description: desc, value: value?+value:undefined, entity, country, date: (new Date()).toISOString().slice(0,10), tenantId: "tenant-auto"
      }
    ]);
    setEmployee(""); setAward(""); setType("Bonus"); setDesc(""); setValue(""); setEntity(""); setCountry("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards & Recognition</CardTitle>
        <CardDescription>
          Celebrate great performance—bonuses, gifts, and awards, tracked for audit and equity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input placeholder="Employee" value={employee} onChange={e => setEmployee(e.target.value)}/>
          <Input placeholder="Award" value={award} onChange={e => setAward(e.target.value)}/>
          <select className="border rounded" value={type} onChange={e => setType(e.target.value)}>
            <option>Bonus</option><option>Award</option><option>Milestone</option><option>Gift</option>
          </select>
          <Input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)}/>
          <Input type="number" placeholder="Value (if any)" value={value} onChange={e => setValue(e.target.value)}/>
          <Input placeholder="Entity" value={entity} onChange={e => setEntity(e.target.value)}/>
          <Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)}/>
          <Button onClick={addReward} variant="secondary"><Plus className="w-4 h-4"/></Button>
        </div>
        {loading
          ? <div className="flex justify-center py-7"><AlertCircle className="h-7 w-7 animate-spin"/></div>
          : <ScrollArea className="h-56">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Award</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.length === 0
                    ? <TableRow><TableCell colSpan={8}>No rewards found.</TableCell></TableRow>
                    : rewards.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.employee}</TableCell>
                          <TableCell>{r.award}</TableCell>
                          <TableCell>
                            {r.type === "Bonus" ? <Star className="text-yellow-700 w-4 h-4 inline"/> : null}
                            {r.type === "Gift" ? <Gift className="text-green-700 w-4 h-4 inline"/> : null}
                            <span className="ml-1">{r.type}</span>
                          </TableCell>
                          <TableCell>{r.description}</TableCell>
                          <TableCell>{r.value ? r.value.toLocaleString() : ""}</TableCell>
                          <TableCell>{r.entity}</TableCell>
                          <TableCell>{r.country}</TableCell>
                          <TableCell>{r.date}</TableCell>
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