'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import toast from 'react-hot-toast';
import { Mail, CalendarIcon, Shield, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

// --- Configuration ---
const PERMISSIONS = [
  { id: 'view_gl', label: 'View General Ledger' },
  { id: 'view_reports', label: 'View Financial Reports' },
  { id: 'view_invoices', label: 'View Invoices & Receipts' },
  { id: 'export_data', label: 'Export Data (CSV/PDF)' },
] as const;

// --- Schema ---
// FIX: Removed invalid 'required_error' object. Zod dates are required by default.
const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  expiresAt: z.date(), 
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// --- Component ---
export function InviteAuditorForm({ tenantId }: { tenantId: string }) {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      expiresAt: addMonths(new Date(), 1), // Default 1 month access
      permissions: ['view_gl', 'view_reports'],
      message: ''
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const db = createClient();
      
      // 1. Authenticate & Get Context
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) throw new Error("You must be logged in to invite auditors.");

      // 2. Insert Invite Record
      const { error } = await db.from('auditor_invites').insert({
        tenant_id: tenantId,
        email: data.email,
        permissions: data.permissions,
        expires_at: data.expiresAt.toISOString(),
        message: data.message,
        status: 'PENDING',
        invited_by: user.id, 
        created_at: new Date().toISOString()
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Secure invitation sent to auditor.");
      form.reset({
        email: '',
        expiresAt: addMonths(new Date(), 1),
        permissions: ['view_gl', 'view_reports'],
        message: ''
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to send invitation.");
    }
  });

  const generateAIMessage = () => {
    const currentExpiry = form.getValues('expiresAt');
    const msg = `Dear Auditor,\n\nYou have been granted temporary, read-only access to our financial records.\n\nAccess expires on: ${format(currentExpiry, 'PPP')}.\n\nPlease click the link in the invitation email to authenticate securely via magic link.`;
    form.setValue('message', msg);
    toast.success("Message generated successfully");
  };

  return (
    <Card className="max-w-2xl mx-auto border-t-4 border-t-purple-600 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-600"/> Auditor Access Control
        </CardTitle>
        <CardDescription>
          Grant temporary, read-only access to external auditors or accountants.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex gap-3 text-amber-800 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>Auditors will receive a secure magic link. Access is strictly read-only and automatically revokes on the expiry date.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auditor Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="auditor@firm.com" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Access Expiration</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Permissions Scope</FormLabel>
                    <CardDescription>Select specific data modules the auditor can access.</CardDescription>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PERMISSIONS.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-white"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer w-full select-none">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Welcome Message (Optional)</FormLabel>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={generateAIMessage} 
                      className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Sparkles className="w-3 h-3 mr-1"/> AI Generate
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter specific instructions for the audit team..." 
                      className="resize-none min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CardFooter className="px-0 pt-4">
              <Button 
                type="submit" 
                className="w-full bg-purple-700 hover:bg-purple-800 transition-colors" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Mail className="mr-2 h-4 w-4"/>}
                Send Secure Invitation
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}