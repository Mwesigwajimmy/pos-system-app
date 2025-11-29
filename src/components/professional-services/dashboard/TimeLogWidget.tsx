'use client';

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Customer {
    id: string;
    name: string;
}

export function TimeLogWidget() {
    const supabase = createClient();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingClients, setFetchingClients] = useState(true);

    // Form State
    const [selectedCustomer, setSelectedCustomer] = useState<string>("");
    const [hours, setHours] = useState<string>("");
    const [description, setDescription] = useState<string>("");

    // Fetch Clients on Mount
    useEffect(() => {
        const fetchClients = async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name')
                .eq('status', 'ACTIVE') // Ensure we only get active clients
                .order('name');
            
            if (!error && data) {
                setCustomers(data);
            }
            setFetchingClients(false);
        };
        fetchClients();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!selectedCustomer) {
            toast.error("Please select a client");
            return;
        }
        if (!hours || parseFloat(hours) <= 0) {
            toast.error("Please enter valid hours");
            return;
        }
        if (!description.trim()) {
            toast.error("Description is required");
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) throw new Error("Not authenticated");

            // Insert into DB
            const { error } = await supabase.from('time_logs').insert({
                tenant_id: user.user_metadata?.tenant_id, // Assuming tenant_id in metadata
                user_id: user.id,
                customer_id: selectedCustomer,
                duration_hours: parseFloat(hours),
                description: description,
                log_date: new Date().toISOString(),
                status: 'UNBILLED'
            });

            if (error) throw error;

            toast.success("Time logged successfully");
            
            // Reset Form
            setHours("");
            setDescription("");
            setSelectedCustomer("");
            
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to log time");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-t-4 border-t-indigo-600 shadow-sm h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-indigo-600" />
                    Quick Time Log
                </CardTitle>
                <CardDescription>Record billable hours instantly.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Client Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="client" className="text-xs font-semibold uppercase text-muted-foreground">Client</Label>
                        <Select value={selectedCustomer} onValueChange={setSelectedCustomer} disabled={fetchingClients}>
                            <SelectTrigger>
                                <SelectValue placeholder={fetchingClients ? "Loading clients..." : "Select a client"} />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                                {customers.length === 0 && !fetchingClients && (
                                    <div className="p-2 text-sm text-muted-foreground text-center">No active clients found</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Hours & Description */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1 space-y-2">
                            <Label htmlFor="hours" className="text-xs font-semibold uppercase text-muted-foreground">Hours</Label>
                            <Input 
                                id="hours" 
                                type="number" 
                                step="0.25" 
                                placeholder="0.0" 
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                className="font-mono"
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="desc" className="text-xs font-semibold uppercase text-muted-foreground">Description</Label>
                            <Input 
                                id="desc" 
                                placeholder="e.g. Weekly meeting" 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Log Billable Time
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}