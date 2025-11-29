// src/components/audit/AuditActionWorkflow.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from '@/lib/supabase/client'; // Ensure you have this helper
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent 
} from "@/components/ui/card";
import { 
  Loader2, CheckCircle2, FileEdit, X, Search, Plus, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner"; // Or your preferred toast library

// --- Types ---
interface Action {
  id: string;
  finding_id: string;
  description: string;
  assigned_to: string;
  due_date: string;
  status: "open" | "in progress" | "done" | "overdue";
  closed_at?: string;
  entity: string;
  country: string;
}

// --- Initial Form State ---
const INITIAL_FORM = {
  finding_id: "",
  description: "",
  assigned_to: "",
  due_date: "",
  entity: "",
  country: "",
  status: "open"
};

export default function AuditActionWorkflow() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  
  // Modal & Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const supabase = createClient();

  // --- Data Fetching ---
  const fetchActions = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('audit_actions')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      setActions(data as Action[]);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Failed to load audit actions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // --- Handlers ---

  const handleCreate = async () => {
    // Basic Validation
    if (!formData.description || !formData.assigned_to || !formData.due_date) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('audit_actions')
        .insert([{
            finding_id: formData.finding_id,
            description: formData.description,
            assigned_to: formData.assigned_to,
            due_date: formData.due_date,
            entity: formData.entity,
            country: formData.country,
            status: 'open'
        }]);

      if (error) throw error;

      toast.success("Action item created successfully");
      setIsDialogOpen(false);
      setFormData(INITIAL_FORM); // Reset form
      fetchActions(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || "Failed to create action");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAction = async (id: string) => {
    const confirm = window.confirm("Are you sure you want to close this action?");
    if (!confirm) return;

    // Optimistic Update (Update UI immediately for speed)
    const previousActions = [...actions];
    setActions(curr => curr.map(a => 
      a.id === id ? { ...a, status: 'done', closed_at: new Date().toISOString() } : a
    ));

    try {
      const { error } = await supabase
        .from('audit_actions')
        .update({ 
          status: 'done', 
          closed_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
      toast.success("Action closed.");
    } catch (err: any) {
      // Revert optimistic update on failure
      setActions(previousActions); 
      toast.error("Failed to close action.");
    }
  };

  const filtered = useMemo(() =>
    actions.filter(a =>
        (a.description?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (a.assigned_to?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (a.entity?.toLowerCase() || "").includes(filter.toLowerCase()) ||
        (a.finding_id?.toLowerCase() || "").includes(filter.toLowerCase())
    ),
  [actions, filter]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Audit Actions Workflow</CardTitle>
            <CardDescription className="mt-1">
              Track remediation assignments and verify closeouts globally.
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Action
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input 
            placeholder="Search findings, assignees, or entities..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8"
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setFilter("")}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2"/> Loading actions...
          </div>
        ) : error ? (
          <div className="flex h-40 items-center justify-center text-red-500 bg-red-50 rounded-md">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Finding Ref</TableHead>
                  <TableHead className="w-[300px]">Description</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      No actions found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                            a.status === "done" ? "bg-green-100 text-green-800" :
                            a.status === "overdue" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                        }`}>
                          {a.status === "done" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{a.finding_id}</TableCell>
                      <TableCell className="font-medium text-sm">{a.description}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.assigned_to}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(a.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{a.entity} <span className="text-xs text-muted-foreground">({a.country})</span></TableCell>
                      <TableCell className="text-right">
                        {a.status !== "done" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                            onClick={() => handleCloseAction(a.id)}
                          >
                            Mark Done
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* --- Add Action Dialog --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Remedial Action</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Finding ID</Label>
                <Input 
                  placeholder="e.g. AUD-2024-001"
                  value={formData.finding_id}
                  onChange={e => setFormData({...formData, finding_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date <span className="text-red-500">*</span></Label>
                <Input 
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="What action needs to be taken?"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Assigned To (Email) <span className="text-red-500">*</span></Label>
              <Input 
                type="email"
                placeholder="manager@company.com"
                value={formData.assigned_to}
                onChange={e => setFormData({...formData, assigned_to: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity</Label>
                <Input 
                  placeholder="Entity Name"
                  value={formData.entity}
                  onChange={e => setFormData({...formData, entity: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Country Code</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(val) => setFormData({...formData, country: val})}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="UG">Uganda</SelectItem>
                        <SelectItem value="KE">Kenya</SelectItem>
                        {/* Add more as needed */}
                    </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}