'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Clock, Plus, Loader2 } from "lucide-react";

// Schema for hours
const hoursSchema = z.object({
  desc: z.string().min(3, "Description required"),
  hours: z.coerce.number().min(0.5, "Min 0.5 hours"),
});

interface VolunteerHour {
  id: string;
  desc: string;
  hours: number;
  date: string;
}

async function fetchHours(tenantId: string, volunteerId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('volunteer_hours')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('volunteer_id', volunteerId)
    .order('date', {ascending:false});
  
  if (error) throw error; 
  return data as VolunteerHour[];
}

export function VolunteerHoursTracker({ tenantId, volunteerId }: { tenantId: string; volunteerId: string }) {
  const queryClient = useQueryClient();
  const { data: hours, isLoading } = useQuery({ 
    queryKey: ['vol-hours', tenantId, volunteerId], 
    queryFn: () => fetchHours(tenantId, volunteerId) 
  });

  // Removed explicit generic to allow flexible coercion types
  const form = useForm({
    resolver: zodResolver(hoursSchema),
    defaultValues: { desc: '', hours: 0 }
  });

  const mutation = useMutation({
    mutationFn: async (val: z.infer<typeof hoursSchema>) => {
      const db = createClient();
      const { error } = await db.from('volunteer_hours').insert([{ 
        tenant_id: tenantId, 
        volunteer_id: volunteerId, 
        hours: val.hours, 
        desc: val.desc, 
        date: new Date().toISOString()
      }]);
      if(error) throw error;
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['vol-hours', tenantId, volunteerId] });
      toast.success("Hours logged successfully");
    },
    onError: () => toast.error("Failed to log hours")
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600"/> Hours Tracker
        </CardTitle>
        <CardDescription>Log and view volunteer activity history.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Inline Form */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="flex gap-3 items-start">
              <FormField 
                control={form.control} 
                name="desc" 
                render={({field}) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        placeholder="Activity Description (e.g. Food Bank Sorting)" 
                        {...field} 
                        value={field.value as string} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs mt-1"/>
                  </FormItem>
                )}
              />
              
              <FormField 
                control={form.control} 
                name="hours" 
                render={({field}) => (
                  <FormItem className="w-24">
                    <FormControl>
                      {/* FIX: Manually handle number input props */}
                      <Input 
                        type="number" 
                        step="0.5" 
                        placeholder="Hrs" 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        value={field.value as number}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage className="text-xs mt-1"/>
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4 mr-1"/>}
                Log
              </Button>
            </form>
          </Form>
        </div>

        {/* History Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400"/>
                  </TableCell>
                </TableRow>
              ) : hours?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No hours logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                hours?.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(h.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{h.desc}</TableCell>
                    <TableCell className="text-right font-bold text-slate-700">
                      {h.hours}
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