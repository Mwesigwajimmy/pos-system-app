'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Loader2, Search, BrainCircuit, UserCheck, Briefcase } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  title: string;
  skills: string[]; // JSONB array in Supabase
  availability_status: 'AVAILABLE' | 'BUSY' | 'ON_LEAVE';
}

// REAL: Uses Postgres JSONB operator to find matches efficiently
async function findMatchingEmployees(tenantId: string, skill: string) {
  const db = createClient();
  
  // The @> operator checks if the JSON array contains the specific skill
  const { data, error } = await db
    .from('employees')
    .select('id, name, title, skills, availability_status')
    .eq('tenant_id', tenantId)
    .contains('skills', JSON.stringify([skill])); // Proper JSONB syntax
  
  if (error) throw error;
  return data as Employee[];
}

// In a real app, these should be fetched from a 'skills' taxonomy table
const SKILL_TAXONOMY = [
  'React', 'Node.js', 'Python', 'Accounting', 'Tax Law', 
  'Project Management', 'UI/UX Design', 'Auditing', 'Data Analysis'
];

export default function SkillMatchingEngine({ tenantId }: { tenantId: string }) {
  const [selectedSkill, setSelectedSkill] = useState<string>('');

  const { data: matches, isLoading } = useQuery({
    queryKey: ['skill-match', tenantId, selectedSkill],
    queryFn: () => findMatchingEmployees(tenantId, selectedSkill),
    enabled: !!selectedSkill // Only fetch when a skill is selected
  });

  const handleAssign = (empName: string) => {
    // In a full implementation, this would open a modal to create a resource_allocation record
    toast.success(`Initiated assignment for ${empName}`);
  };

  return (
    <Card className="h-full border-t-4 border-t-purple-500 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-purple-600"/> Intelligent Staffing
        </CardTitle>
        <CardDescription>Match project requirements with employee skills and availability.</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Required Capability</label>
          <Select onValueChange={setSelectedSkill} value={selectedSkill}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a skill to search..." />
            </SelectTrigger>
            <SelectContent>
              {SKILL_TAXONOMY.map(skill => (
                <SelectItem key={skill} value={skill}>{skill}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-[300px]">
          {!selectedSkill ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50">
              <Search className="w-10 h-10 mb-2 opacity-20"/>
              <p>Select a skill above to find matching talent.</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2"/>
              <p className="text-sm text-slate-500">Searching employee database...</p>
            </div>
          ) : matches?.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-lg border">
              <Briefcase className="w-10 h-10 mx-auto text-slate-300 mb-2"/>
              <p className="text-slate-700 font-medium">No matches found</p>
              <p className="text-sm text-slate-500">No employees currently have the tag "{selectedSkill}".</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-500">Found {matches?.length} qualified experts:</p>
              <div className="grid grid-cols-1 gap-3">
                {matches?.map(emp => (
                  <div key={emp.id} className="p-4 border rounded-lg hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between transition-colors bg-white shadow-sm">
                    <div className="mb-3 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{emp.name}</p>
                        <Badge variant="outline" className={
                          emp.availability_status === 'AVAILABLE' ? 'text-green-600 border-green-200 bg-green-50' : 
                          'text-amber-600 border-amber-200 bg-amber-50'
                        }>
                          {emp.availability_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{emp.title}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {emp.skills.slice(0, 4).map(s => (
                          <Badge 
                            key={s} 
                            variant="secondary" 
                            className={`text-[10px] ${s === selectedSkill ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}`}
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Button size="sm" onClick={() => handleAssign(emp.name)} className="shrink-0">
                      <UserCheck className="w-4 h-4 mr-2"/> Assign
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}