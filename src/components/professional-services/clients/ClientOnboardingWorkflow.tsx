'use client';

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2, UserPlus, PlayCircle } from "lucide-react";

interface TenantContext { tenantId: string }

interface Onboarding {
  id: string;
  client_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  created_at: string;
}

const onboardSchema = z.object({
  clientId: z.string().min(1, "Client ID required"),
  description: z.string().min(5, "Description required"),
});

type OnboardFormValues = z.infer<typeof onboardSchema>;

async function fetchOnboardings(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.from("client_onboardings").select("*").eq("tenant_id", tenantId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Onboarding[];
}

export default function ClientOnboardingWorkflow({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: onboardings, isLoading } = useQuery({ 
    queryKey: ["client-onboard", tenant.tenantId], 
    queryFn: () => fetchOnboardings(tenant.tenantId) 
  });

  const form = useForm({
    resolver: zodResolver(onboardSchema),
    defaultValues: { clientId: '', description: '' }
  });

  const mutation = useMutation({ 
    mutationFn: async (val: OnboardFormValues) => {
      const db = createClient();
      const { error } = await db.from("client_onboardings").insert({
        client_id: val.clientId,
        description: val.description,
        status: "pending",
        tenant_id: tenant.tenantId
      });
      if (error) throw error;
    },
    onSuccess: () => { 
      toast.success("Onboarding workflow started"); 
      form.reset(); 
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["client-onboard", tenant.tenantId] }); 
    },
    onError: (e: Error) => toast.error(e.message || "Failed to start workflow")
  });

  return (
    <Card className="h-full border-t-4 border-t-orange-500">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-orange-600"/> Onboarding</CardTitle>
          <CardDescription>Track new client setup progress.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><PlayCircle className="w-4 h-4 mr-2"/> Start Onboarding</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Initiate Onboarding</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => mutation.mutate(d as OnboardFormValues))} className="space-y-4">
                <FormField control={form.control} name="clientId" render={({field}) => (
                  <FormItem><FormLabel>Client ID</FormLabel><FormControl><Input {...field} value={field.value as string}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({field}) => (
                  <FormItem><FormLabel>Notes / Requirements</FormLabel><FormControl><Textarea {...field} value={field.value as string}/></FormControl><FormMessage/></FormItem>
                )}/>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2"/>} Start
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
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto animate-spin"/></TableCell></TableRow>
              ) : onboardings?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.client_id}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'completed' ? 'default' : 'secondary'} className="uppercase">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}