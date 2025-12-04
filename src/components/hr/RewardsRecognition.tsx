'use client';

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Gift, Plus } from "lucide-react";

export interface Recognition {
  id: string;
  employee: string;
  award: string;
  type: "Bonus" | "Award" | "Milestone" | "Gift";
  description: string;
  value?: number;
  entity: string;
  country: string;
  date: string;
}

interface RewardsRecognitionProps {
    initialRewards: Recognition[];
}

export default function RewardsRecognition({ initialRewards }: RewardsRecognitionProps) {
  const [rewards, setRewards] = useState<Recognition[]>(initialRewards);
  
  // Local Form State for adding new rewards
  const [employee, setEmployee] = useState('');
  const [award, setAward] = useState('');
  const [type, setType] = useState("Bonus");
  const [desc, setDesc] = useState('');
  const [value, setValue] = useState('');
  const [entity, setEntity] = useState('');

  const addReward = () => {
    // In a real implementation, you would call a Server Action here to save to Supabase
    if (!employee || !award) return;
    
    const newReward: Recognition = {
        id: Math.random().toString(36).slice(2),
        employee, 
        award, 
        type: type as Recognition["type"], 
        description: desc, 
        value: value ? +value : undefined, 
        entity, 
        country: 'UG', // Defaulting for the quick-add form
        date: (new Date()).toISOString().slice(0,10)
    };

    setRewards([newReward, ...rewards]);
    
    // Reset form
    setEmployee(""); setAward(""); setDesc(""); setValue("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards & Recognition</CardTitle>
        <CardDescription>
          Celebrate great performance—bonuses, gifts, and awards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Quick Add Form */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input className="w-32" placeholder="Employee" value={employee} onChange={e => setEmployee(e.target.value)}/>
          <Input className="w-32" placeholder="Award" value={award} onChange={e => setAward(e.target.value)}/>
          <select className="border rounded px-2 h-10 bg-background" value={type} onChange={e => setType(e.target.value)}>
            <option>Bonus</option><option>Award</option><option>Milestone</option><option>Gift</option>
          </select>
          <Input className="w-40" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)}/>
          <Input className="w-24" type="number" placeholder="Value" value={value} onChange={e => setValue(e.target.value)}/>
          <Input className="w-24" placeholder="Entity" value={entity} onChange={e => setEntity(e.target.value)}/>
          <Button onClick={addReward} variant="secondary"><Plus className="w-4 h-4"/></Button>
        </div>
        
        <ScrollArea className="h-[400px]">
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
                ? <TableRow><TableCell colSpan={8} className="text-center p-4">No rewards found.</TableCell></TableRow>
                : rewards.map(r => (
                    <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.employee}</TableCell>
                        <TableCell>{r.award}</TableCell>
                        <TableCell>
                            <div className="flex items-center">
                                {r.type === "Bonus" && <Star className="text-yellow-600 w-4 h-4 mr-2"/>}
                                {r.type === "Gift" && <Gift className="text-green-600 w-4 h-4 mr-2"/>}
                                <span>{r.type}</span>
                            </div>
                        </TableCell>
                        <TableCell>{r.description}</TableCell>
                        <TableCell>{r.value ? r.value.toLocaleString() : "-"}</TableCell>
                        <TableCell>{r.entity}</TableCell>
                        <TableCell>{r.country}</TableCell>
                        <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                    ))}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}