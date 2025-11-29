'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, FileText, Trash2, Edit2, Copy } from 'lucide-react';

interface TenantContext { tenantId: string; }

export interface DocumentTemplate {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

async function fetchTemplates(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('document_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) throw error; 
  return data as DocumentTemplate[];
}

async function saveTemplate({ tenantId, title, body, id }: { tenantId: string, title: string, body: string, id?: string }) {
  const db = createClient();
  const payload = { tenant_id: tenantId, title, body, updated_at: new Date().toISOString() };
  
  let error;
  if (id) {
    ({ error } = await db.from('document_templates').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('document_templates').insert([payload]));
  }
  
  if (error) throw error;
}

async function deleteTemplate(id: string) {
    const db = createClient();
    const { error } = await db.from('document_templates').delete().eq('id', id);
    if (error) throw error;
}

export default function TemplateManager({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: templates, isLoading } = useQuery({ 
    queryKey: ['templates', tenant.tenantId], 
    queryFn: () => fetchTemplates(tenant.tenantId) 
  });

  const saveMutation = useMutation({ 
    mutationFn: () => saveTemplate({ tenantId: tenant.tenantId, title, body, id: editingId || undefined }),
    onSuccess: () => {
      toast.success(editingId ? "Template updated" : "Template created");
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['templates', tenant.tenantId] });
    },
    onError: (e) => toast.error(e.message || 'Failed to save template')
  });

  const deleteMutation = useMutation({
      mutationFn: deleteTemplate,
      onSuccess: () => {
          toast.success("Template deleted");
          queryClient.invalidateQueries({ queryKey: ['templates', tenant.tenantId] });
      },
      onError: (e) => toast.error("Could not delete template")
  });

  const resetForm = () => {
      setTitle('');
      setBody('');
      setEditingId(null);
  };

  const handleEdit = (t: DocumentTemplate) => {
      setTitle(t.title);
      setBody(t.body);
      setEditingId(t.id);
      setIsOpen(true);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Template body copied to clipboard");
  }

  return (
    <Card className="h-full border-t-4 border-t-indigo-600 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Template Manager</CardTitle>
            <CardDescription>Standardize your client contracts and proposals.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2"/> New Template</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                    <DialogDescription>Define the structure using standard text or markdown.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input placeholder="e.g. Standard NDA" value={title} onChange={e=>setTitle(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Body Content</label>
                        <Textarea 
                            className="h-[200px] font-mono text-sm" 
                            placeholder="# Agreement Title..." 
                            value={body} 
                            onChange={e=>setBody(e.target.value)} 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={() => saveMutation.mutate()} disabled={!title || !body || saveMutation.isPending}>
                        {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
                ) : templates?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No templates found.</TableCell></TableRow>
                ) : (
                templates?.map((t) => (
                    <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono truncate max-w-[200px]">
                            {t.body.substring(0, 50)}...
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(t.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleCopy(t.body)} title="Copy Content">
                                    <Copy className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} title="Edit">
                                    <Edit2 className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => { if(confirm('Delete template?')) deleteMutation.mutate(t.id) }} title="Delete">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}