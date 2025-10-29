'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormState, useFormStatus } from 'react-dom';
import { inviteAuditorAction, FormState } from '@/lib/actions';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, CalendarIcon, Sparkles, ShieldCheck, BookOpen, BarChart3, Wallet } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

const permissionsList = [
  { id: 'view_gl', label: 'View General Ledger', Icon: BookOpen },
  { id: 'view_reports', label: 'View Financial Reports', Icon: BarChart3 },
  { id: 'view_expenses', label: 'View Expense Records', Icon: Wallet },
  { id: 'view_payroll', label: 'View Payroll Data', Icon: ShieldCheck, isSensitive: true },
];

const formSchema = z.object({
  email: z.string().email(),
  expiresAt: z.date(),
  permissions: z.array(z.string()).min(1),
  welcomeMessage: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Sending Invitation...' : <><Send className="mr-2 h-4 w-4" /> Send Secure Invitation</>}
        </Button>
    );
}

export function InviteAuditorForm() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const { register, handleSubmit, control, setValue, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            expiresAt: addMonths(new Date(), 3),
            permissions: ['view_gl', 'view_reports'],
            welcomeMessage: "Welcome to our BBU1 portal. You have been granted temporary, read-only access to our financial records for audit purposes. Please let us know if you have any questions."
        },
    });

    const initialState: FormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(inviteAuditorAction, initialState);

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ title: "Success!", description: formState.message });
                reset();
            } else {
                toast({ title: "Error", description: formState.message, variant: 'destructive' });
            }
        }
    }, [formState, toast, reset]);
    
    const onFormSubmit = (data: FormData) => {
        const formData = new FormData(formRef.current!);
        formData.set('expires_at', data.expiresAt.toISOString());
        formAction(formData);
    };
    
    const generateWelcomeMessage = () => {
        setValue('welcomeMessage', "This is an AI-generated welcome message. You have been granted secure, time-limited access to our company's financial records on the BBU1 platform for the purpose of conducting your audit. Your access is read-only and will expire automatically. Please feel free to explore the provided sections. Should you require any assistance, do not hesitate to contact us.");
        toast({ title: "AI Generated", description: "Welcome message has been generated." });
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">Auditor's Email Address</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="auditor@kpmg.com" className="pl-9" {...register("email")} />
                </div>
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="expiresAt" className="font-semibold">Access Expiry Date</Label>
                <Controller
                    control={control}
                    name="expiresAt"
                    render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                    )}
                />
                {errors.expiresAt && <p className="text-sm text-destructive mt-1">{errors.expiresAt.message}</p>}
            </div>

            <div className="space-y-3">
                <Label className="font-semibold">Grant Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border p-4">
                    {permissionsList.map((item) => (
                        <Controller
                            key={item.id}
                            control={control}
                            name="permissions"
                            render={({ field }) => (
                                <div className={cn("flex items-center space-x-3 rounded-md p-3", item.isSensitive && "bg-destructive/10")}>
                                    <Checkbox
                                        id={item.id}
                                        value={item.id}
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(field.value?.filter((value) => value !== item.id));
                                        }}
                                    />
                                    <Label htmlFor={item.id} className="flex items-center gap-2 font-normal cursor-pointer">
                                        <item.Icon className="h-5 w-5" />
                                        {item.label}
                                    </Label>
                                </div>
                            )}
                        />
                    ))}
                </div>
                 {errors.permissions && <p className="text-sm text-destructive mt-1">{errors.permissions.message}</p>}
            </div>

            <div className="space-y-2">
                 <div className="flex justify-between items-center">
                    <Label htmlFor="welcomeMessage" className="font-semibold">Personalized Welcome Message (Optional)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={generateWelcomeMessage}>
                        <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
                    </Button>
                </div>
                <Textarea id="welcomeMessage" placeholder="Include a welcome message in the invitation email..." className="min-h-[120px]" {...register("welcomeMessage")} />
            </div>

            <SubmitButton />
        </form>
    );
}