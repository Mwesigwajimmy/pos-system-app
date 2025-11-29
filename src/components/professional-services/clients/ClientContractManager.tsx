'use client';

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, FileText, Plus } from "lucide-react";

interface TenantContext { tenantId: string }

interface Contract {
  id: string;
  client_id: string;
  title: string;
  body: string;
  created_at: string;
}

const contractSchema = z.object({
  clientId: z.string().min(1, "Client ID required"),
  title: z.string().min(3, "Title required"),
  body: z.string().min(10, "Terms must be detailed"),
});

type ContractFormValues = z.infer<typeof contractSchema>;

async function fetchContracts(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from("client_contracts").select("*").eq("tenant_id", tenantId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Contract[];
}

export default function ClientContractManager({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: contracts, isLoading } = useQuery({ 
    queryKey: ["client-contracts", tenant.tenantId], 
    queryFn: () => fetchContracts(tenant.tenantId) 
  });

  const form = useForm({
    resolver: zodResolver(contractSchema),
    defaultValues: { clientId: '', title: '', body: '' }
  });

  const mutation = useMutation({ 
    mutationFn: async (val: ContractFormValues) => {
      const db = createClient();
      const { error } = await db.from("client_contracts").insert({
        client_id: val.clientId, 
        title: val.title, 
        body: val.body, 
        tenant_id: tenant.tenantId
      });
      if (error) throw error;
    },
    onSuccess: () => { 
      toast.success("Contract added successfully"); 
      form.reset(); 
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["client-contracts", tenant.tenantId] }); 
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add contract")
  });

  return (
    <Card className="h-full border-t-4 border-t-blue-600">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600"/> Contracts</CardTitle>
          <CardDescription>Manage client agreements and terms.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2"/> Add Contract</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => mutation.mutate(d as ContractFormValues))} className="space-y-4">
                <FormField control={form.control} name="clientId" render={({field}) => (
                  <FormItem><FormLabel>Client ID</FormLabel><FormControl><Input {...field} value={field.value as string}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="title" render={({field}) => (
                  <FormItem><FormLabel>Contract Title</FormLabel><FormControl><Input {...field} value={field.value as string}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="body" render={({field}) => (
                  <FormItem><FormLabel>Terms & Conditions</FormLabel><FormControl><Textarea {...field} value={field.value as string}/></FormControl><FormMessage/></FormItem>
                )}/>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2"/>} Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : contracts?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.client_id}</TableCell>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}