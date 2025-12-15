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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Clock, Plus, Loader2 } from "lucide-react";

// Schema includes volunteer_id selection now
const hoursSchema = z.object({
  volunteer_id: z.string().min(1, "Select a volunteer"),
  desc: z.string().min(3, "Description required"),
  hours: z.coerce.number().min(0.5, "Min 0.5 hours"),
});

interface VolunteerHourLog {
  id: string;
  desc: string;
  hours: number;
  date: string;
  volunteers: { name: string } | null; // Join relation
}

// Named Export
export function VolunteerHoursTracker({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const db = createClient();

  // 1. Fetch recent global logs for the tenant
  const { data: logs, isLoading: loadingLogs } = useQuery({ 
    queryKey: ['vol-hours-logs', tenantId], 
    queryFn: async () => {
      const { data, error } = await db
        .from('volunteer_hours')
        .select('*, volunteers(name)')
        .eq('tenant_id', tenantId)
        .order('date', {ascending:false})
        .limit(10);
      if (error) throw error; 
      return data as unknown as VolunteerHourLog[];
    }
  });

  // 2. Fetch volunteers for the dropdown
  const { data: volunteers } = useQuery({
    queryKey: ['volunteers-list', tenantId],
    queryFn: async () => {
      const { data } = await db.from('volunteers').select('id, name').eq('tenant_id', tenantId);
      return data || [];
    }
  });

  const form = useForm({
    resolver: zodResolver(hoursSchema),
    defaultValues: { volunteer_id: '', desc: '', hours: 0 }
  });

  const mutation = useMutation({
    mutationFn: async (val: z.infer<typeof hoursSchema>) => {
      const { error } = await db.from('volunteer_hours').insert([{ 
        tenant_id: tenantId, 
        volunteer_id: val.volunteer_id, 
        hours: val.hours, 
        desc: val.desc, 
        date: new Date().toISOString()
      }]);
      if(error) throw error;
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['vol-hours-logs', tenantId] });
      toast.success("Hours logged successfully");
    },
    onError: (err) => toast.error("Failed to log hours: " + err.message)
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600"/> Hours Tracker
        </CardTitle>
        <CardDescription>Log activity for volunteers and view recent history.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6">
        
        {/* Log Form */}
        <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-100">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-3">
              <div className="flex gap-3">
                <FormField 
                    control={form.control} 
                    name="volunteer_id" 
                    render={({field}) => (
                    <FormItem className="w-[180px]">
                        {/* Explicit cast to string for Select value */}
                        <Select onValueChange={field.onChange} value={field.value as string}>
                            <FormControl>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select Volunteer" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {volunteers?.map(v => (
                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]"/>
                    </FormItem>
                    )}
                />
                
                <FormField 
                    control={form.control} 
                    name="desc" 
                    render={({field}) => (
                    <FormItem className="flex-1">
                        <FormControl>
                        {/* Explicit cast to string for Input value */}
                        <Input 
                            className="bg-white" 
                            placeholder="Activity (e.g. Sorting)" 
                            {...field} 
                            value={field.value as string}
                        />
                        </FormControl>
                        <FormMessage className="text-[10px]"/>
                    </FormItem>
                    )}
                />
                
                <FormField 
                    control={form.control} 
                    name="hours" 
                    render={({field}) => (
                    <FormItem className="w-20">
                        <FormControl>
                        {/* Explicit cast to number and safe parsing for onChange */}
                        <Input 
                            className="bg-white" 
                            type="number" 
                            step="0.5" 
                            placeholder="Hrs" 
                            {...field}
                            value={field.value as number}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                field.onChange(isNaN(val) ? 0 : val);
                            }}
                        />
                        </FormControl>
                        <FormMessage className="text-[10px]"/>
                    </FormItem>
                    )}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={mutation.isPending} size="sm">
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4 mr-2"/>}
                Log Activity
              </Button>
            </form>
          </Form>
        </div>

        {/* History Table */}
        <div className="rounded-md border flex-1">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Volunteer</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Hrs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingLogs ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-slate-400"/></TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-sm">No recent activity.</TableCell>
                </TableRow>
              ) : (
                logs?.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium text-sm">
                      {h.volunteers?.name || "Unknown"}
                      <div className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell className="text-sm">{h.desc}</TableCell>
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