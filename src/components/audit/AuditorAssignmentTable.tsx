'use client';

import React, { useState, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Auditor {
  id: string;
  email: string;
  role: string;
  assigned_entity: string;
  assigned_country: string;
  active: boolean;
}

export default function AuditorAssignmentTable() {
  const supabase = createClient();
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inline add state (sometimes inline is faster for assignment lists)
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Internal Auditor");
  const [newEntity, setNewEntity] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchAuditors = async () => {
    const { data, error } = await supabase.from('auditor_assignments').select('*').eq('active', true);
    if (!error) setAuditors(data as Auditor[]);
    setLoading(false);
  };

  useEffect(() => { fetchAuditors(); }, []);

  const handleAdd = async () => {
    if (!newEmail || !newEntity) return toast.error("Email and Entity are required");
    setAdding(true);
    try {
        const { error } = await supabase.from('auditor_assignments').insert([{
            email: newEmail, role: newRole, assigned_entity: newEntity, active: true
        }]);
        if (error) throw error;
        toast.success("Auditor assigned");
        setNewEmail(""); setNewEntity("");
        fetchAuditors();
    } catch(e) { toast.error("Failed to assign"); }
    finally { setAdding(false); }
  };

  const handleRemove = async (id: string) => {
    // Soft delete (set active = false)
    const { error } = await supabase.from('auditor_assignments').update({ active: false }).eq('id', id);
    if (error) toast.error("Failed to remove");
    else {
        toast.success("Auditor unassigned");
        setAuditors(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditor Assignments</CardTitle>
        <CardDescription>Manage active internal and external auditors.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 p-4 bg-slate-50 rounded-lg border">
          <Input placeholder="Email Address" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="bg-white" />
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="w-[180px] bg-white"><SelectValue/></SelectTrigger>
            <SelectContent>
                <SelectItem value="Internal Auditor">Internal Auditor</SelectItem>
                <SelectItem value="External Auditor">External Auditor</SelectItem>
                <SelectItem value="Consultant">Consultant</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Entity Assignment" value={newEntity} onChange={e => setNewEntity(e.target.value)} className="bg-white" />
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin"/> : <UserPlus className="w-4 h-4 mr-2"/>} Assign
          </Button>
        </div>
        
        {loading ? <div className="text-center py-4 text-muted-foreground">Loading roster...</div> :
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditors.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.role}</TableCell>
                  <TableCell>{a.assigned_entity}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemove(a.id)}>
                        <Trash2 className="w-4 h-4"/>
                    </Button>
                  </TableCell>
                </TableRow>
            ))}
            {auditors.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No active assignments</TableCell></TableRow>}
          </TableBody>
        </Table>
        }
      </CardContent>
    </Card>
  );
}