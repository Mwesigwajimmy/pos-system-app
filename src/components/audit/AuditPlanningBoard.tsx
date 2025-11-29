'use client';

import React, { useState, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Loader2, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditPlan {
  id: string;
  title: string;
  entity: string;
  country: string;
  start_date: string;
  end_date: string;
  lead_auditor: string;
  status: "planned" | "in progress" | "complete";
}

export default function AuditPlanningBoard() {
  const supabase = createClient();
  const [plans, setPlans] = useState<AuditPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "", entity: "", country: "", start_date: "", end_date: "", lead_auditor: ""
  });

  const fetchPlans = async () => {
    const { data, error } = await supabase.from('audit_plans').select('*').order('start_date', { ascending: true });
    if (!error) setPlans(data as AuditPlan[]);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleAdd = async () => {
    if (!form.title || !form.start_date) return toast.error("Title and Start Date required");
    setSubmitting(true);
    try {
        const { error } = await supabase.from('audit_plans').insert([form]);
        if (error) throw error;
        toast.success("Audit planned successfully");
        setIsDialogOpen(false);
        fetchPlans();
        setForm({ title: "", entity: "", country: "", start_date: "", end_date: "", lead_auditor: "" });
    } catch (e: any) {
        toast.error("Failed to plan audit");
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Audit Planning Board</CardTitle>
            <CardDescription>Schedule and assign audits globally.</CardDescription>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}><Plus className="w-4 h-4 mr-2"/> New Audit</Button>
      </CardHeader>
      <CardContent>
        {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin"/></div> :
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timeline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? <TableRow><TableCell colSpan={5}>No audits planned.</TableCell></TableRow> :
              plans.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.entity} <span className="text-xs text-muted-foreground">({p.country})</span></TableCell>
                  <TableCell>{p.lead_auditor}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                        p.status === 'complete' ? 'bg-green-100 text-green-700' :
                        p.status === 'in progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{p.status}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.start_date ? format(new Date(p.start_date), "MMM d") : "?"} - {p.end_date ? format(new Date(p.end_date), "MMM d, yyyy") : "?"}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        }
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Schedule Audit</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2"><Label>Audit Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Q4 Statutory Audit"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}/></div>
                    <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2"><Label>Entity</Label><Input value={form.entity} onChange={e => setForm({...form, entity: e.target.value})}/></div>
                     <div className="space-y-2"><Label>Lead Auditor</Label><Input value={form.lead_auditor} onChange={e => setForm({...form, lead_auditor: e.target.value})}/></div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Schedule</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}