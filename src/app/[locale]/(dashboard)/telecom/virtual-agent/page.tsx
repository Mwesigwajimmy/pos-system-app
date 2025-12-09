'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form'; // Assuming you use react-hook-form, standard in enterprise

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Smartphone, Send } from 'lucide-react';

interface VirtualAgentFormData {
    full_name: string;
    phone_number: string;
    email: string;
    location_details: string;
    initial_float_amount: number;
}

export default function VirtualAgentPage() {
    const supabase = createClient();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<VirtualAgentFormData>();

    const { mutate: submitRequest, isPending } = useMutation({
        mutationFn: async (data: VirtualAgentFormData) => {
            const { error } = await supabase.rpc('submit_virtual_agent_application', { 
                p_full_name: data.full_name,
                p_phone: data.phone_number,
                p_email: data.email,
                p_location: data.location_details,
                p_initial_deposit: data.initial_float_amount
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Application submitted successfully.");
            reset();
        },
        onError: (err: Error) => toast.error(`Submission failed: ${err.message}`),
    });

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Virtual Agent Application</h1>
                <p className="text-muted-foreground">Register new virtual agents and assign initial float parameters.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Smartphone className="mr-2 h-5 w-5"/> Agent Details</CardTitle>
                    <CardDescription>Enter the KYC and operational details for the new virtual agent.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit((data) => submitRequest(data))} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input id="full_name" placeholder="John Doe" {...register("full_name", { required: true })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" placeholder="+256..." {...register("phone_number", { required: true })} />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" placeholder="agent@example.com" {...register("email", { required: true })} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="float">Initial Float Deposit</Label>
                            <Input id="float" type="number" placeholder="500000" {...register("initial_float_amount", { required: true, min: 0 })} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location / Territory</Label>
                            <Textarea id="location" placeholder="Describe the operating area..." {...register("location_details")} />
                        </div>

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                            Submit Application
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}