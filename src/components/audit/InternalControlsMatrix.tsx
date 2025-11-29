'use client';

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, Plus, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ControlRow {
  id: string;
  control_name: string;
  process: string;
  entity: string;
  country: string;
  owner: string;
  frequency: string;
  effectiveness: string;
  last_tested: string;
  last_evidence: string;
}

export default function InternalControlsMatrix() {
  const supabase = createClient();
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [newControl, setNewControl] = useState({
    control_name: "", process: "", entity: "", country: "", owner: "", frequency: "Monthly", effectiveness: "Effective"
  });

  const fetchControls = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('internal_controls').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setControls(data || []);
    } catch (err) {
      toast.error("Failed to load controls");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchControls(); }, [fetchControls]);

  const handleCreate = async () => {
    if (!newControl.control_name || !newControl.process) return toast.error("Name and Process are required");
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('internal_controls').insert([newControl]);
      if (error) throw error;
      toast.success("Control added successfully");
      setIsDialogOpen(false);
      fetchControls();
      setNewControl({ control_name: "", process: "", entity: "", country: "", owner: "", frequency: "Monthly", effectiveness: "Effective" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => controls.filter(c =>
    (c.control_name?.toLowerCase() || "").includes(filter.toLowerCase()) ||
    (c.entity?.toLowerCase() || "").includes(filter.toLowerCase()) ||
    (c.process?.toLowerCase() || "").includes(filter.toLowerCase())
  ), [controls, filter]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Internal Controls Matrix</CardTitle>
                <CardDescription>Map of core controls, owners, and audit effectiveness.</CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="sm"><Plus className="w-4 h-4 mr-2"/> Add Control</Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search controls..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8" />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 cursor-pointer" onClick={() => setFilter('')} />}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> : 
          <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Freq</TableHead>
                    <TableHead>Effectiveness</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? <TableRow><TableCell colSpan={6}>No controls found.</TableCell></TableRow> : 
                    filtered.map(ctrl => (
                        <TableRow key={ctrl.id}>
                          <TableCell className="font-medium">{ctrl.control_name}</TableCell>
                          <TableCell>{ctrl.process}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{ctrl.owner}</TableCell>
                          <TableCell>{ctrl.frequency}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ctrl.effectiveness === 'Effective' ? 'bg-green-100 text-green-700' : 
                                ctrl.effectiveness === 'Ineffective' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{ctrl.effectiveness}</span>
                          </TableCell>
                          <TableCell>{ctrl.entity} ({ctrl.country})</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </ScrollArea>
        }
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Add Internal Control</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Control Name</Label><Input value={newControl.control_name} onChange={e => setNewControl({...newControl, control_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Process</Label><Input value={newControl.process} onChange={e => setNewControl({...newControl, process: e.target.value})} /></div>
                    <div className="grid gap-2"><Label>Owner Email</Label><Input value={newControl.owner} onChange={e => setNewControl({...newControl, owner: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Entity</Label><Input value={newControl.entity} onChange={e => setNewControl({...newControl, entity: e.target.value})} /></div>
                    <div className="grid gap-2"><Label>Country</Label><Input value={newControl.country} onChange={e => setNewControl({...newControl, country: e.target.value})} /></div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}