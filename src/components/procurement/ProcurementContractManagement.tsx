"use client";

import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Loader2, FileText, Upload, Download, AlertCircle, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import toast from 'react-hot-toast';

// --- 1. Schemas & Types ---

const contractSchema = z.object({
  vendor_name: z.string().min(2, "Vendor name is required"),
  contract_ref: z.string().min(2, "Reference number required"),
  // Using .number() instead of .coerce to avoid "unknown" type mismatches
  value: z.number().min(0, "Value must be positive"),
  currency: z.string().min(1, "Currency is required"),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  entity: z.string().min(1, "Legal entity is required"),
  country: z.string().min(1, "Country is required"),
  status: z.enum(['draft', 'active', 'expired', 'terminated']),
});

type ContractFormValues = z.infer<typeof contractSchema>;

interface Contract {
  id: string;
  vendor_name: string;
  contract_ref: string;
  start_date: string;
  end_date: string;
  value: number;
  currency: string;
  entity: string;
  country: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  file_url?: string;
  created_at: string;
}

interface Props {
  tenantId: string;
}

// --- 2. Data Fetching ---

async function fetchContracts(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('procurement_contracts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('end_date', { ascending: true });
  
  if (error) throw error;
  return data as Contract[];
}

// --- 3. Component ---

export default function ProcurementContractManagement({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Queries
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['procurement-contracts', tenantId],
    queryFn: () => fetchContracts(tenantId),
    enabled: !!tenantId
  });

  // Form Setup
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      vendor_name: '',
      contract_ref: '',
      value: 0,
      currency: 'USD',
      entity: '',
      country: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 31536000000).toISOString().split('T')[0],
      status: 'active'
    }
  });

  // Mutation
  const uploadMutation = useMutation({
    mutationFn: async (values: ContractFormValues) => {
      const supabase = createClient();
      let filePath = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${tenantId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(fileName, selectedFile);
        
        if (uploadError) throw uploadError;
        filePath = fileName;
      }

      const { error: dbError } = await supabase.from('procurement_contracts').insert({
        tenant_id: tenantId,
        ...values,
        file_url: filePath,
        updated_at: new Date().toISOString()
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Contract saved successfully");
      queryClient.invalidateQueries({ queryKey: ['procurement-contracts', tenantId] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to save contract");
    }
  });

  const onSubmit = (data: ContractFormValues) => uploadMutation.mutate(data);

  return (
    <Card className="h-full border-t-4 border-t-blue-600 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Procurement Contracts</CardTitle>
          <CardDescription>Manage vendor agreements, expirations, and digital archives.</CardDescription>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Upload className="mr-2 h-4 w-4" /> Upload Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Contract</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="vendor_name" render={({field}) => (
                    <FormItem><FormLabel>Vendor Name</FormLabel><FormControl><Input placeholder="e.g. Acme Corp" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                  <FormField control={form.control} name="contract_ref" render={({field}) => (
                    <FormItem><FormLabel>Contract Reference #</FormLabel><FormControl><Input placeholder="CTR-2024-001" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="entity" render={({field}) => (
                    <FormItem><FormLabel>Legal Entity</FormLabel><FormControl><Input placeholder="Holding Co." {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                  <FormField control={form.control} name="country" render={({field}) => (
                    <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="United Kingdom" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="value" render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Contract Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="currency" render={({field}) => (
                    <FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_date" render={({field}) => (
                    <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                  <FormField control={form.control} name="end_date" render={({field}) => (
                    <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.docx,.doc,.jpg,.png"
                  />
                  <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-8 w-8 text-slate-400"/>
                    <span className="text-sm font-medium text-slate-600">
                      {selectedFile ? selectedFile.name : "Click to upload contract document"}
                    </span>
                    <span className="text-xs text-slate-400">PDF, DOCX up to 10MB</span>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={uploadMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                    {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Save Contract
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[500px] border rounded-md">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead>Vendor & Entity</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400"/></TableCell></TableRow>
              ) : contracts?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No contracts found. Add one above.</TableCell></TableRow>
              ) : (
                contracts?.map((c) => {
                  const isExpiringSoon = new Date(c.end_date) < new Date(Date.now() + 7776000000); 
                  const isExpired = new Date(c.end_date) < new Date();

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                           <FileText className="h-4 w-4 text-blue-500" />
                           {c.vendor_name}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal ml-6">
                           <Globe className="h-2 w-2"/> {c.country} / {c.entity}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.contract_ref}</TableCell>
                      <TableCell className="font-semibold">{Number(c.value).toLocaleString()} {c.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.start_date).toLocaleDateString()} &rarr; {new Date(c.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isExpired ? 'destructive' : c.status === 'active' ? 'default' : 'secondary'} className="uppercase text-[9px]">
                          {isExpired ? 'Expired' : c.status}
                        </Badge>
                        {isExpiringSoon && !isExpired && (
                          <div className="flex items-center text-amber-600 text-[10px] font-bold mt-1">
                            <AlertCircle className="w-3 h-3 mr-1" /> Expiring Soon
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.file_url ? (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Download" asChild>
                            <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/contracts/${c.file_url}`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 text-slate-600" />
                            </a>
                          </Button>
                        ) : <span className="text-xs text-slate-300 italic">No File</span>}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}