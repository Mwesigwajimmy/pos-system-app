'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, 
    Users, 
    Search, 
    UserPlus, 
    ShieldCheck, 
    AlertCircle, 
    Phone 
} from 'lucide-react';

// Types
interface Subscriber {
    id: string;
    full_name: string;
    msisdn: string;
    kyc_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
    id_type: string;
    id_number: string;
    registered_at: string;
    status: 'ACTIVE' | 'SUSPENDED';
}

// Fetcher Function
async function fetchSubscribers() {
    const supabase = createClient();
    
    // Get Tenant ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated");
    const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single();
    if (!profile?.business_id) throw new Error("No Business Context");

    // Call RPC
    const { data, error } = await supabase.rpc('get_telecom_subscribers', {
        p_tenant_id: profile.business_id
    });

    if (error) throw new Error(error.message);
    return (data || []) as Subscriber[];
}

export default function TelecomSubscribersPage() {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: subscribers, isLoading, isError, error } = useQuery({
        queryKey: ['telecomSubscribers'],
        queryFn: fetchSubscribers
    });

    // Client-side filtering
    const filteredSubscribers = subscribers?.filter(sub => 
        sub.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.msisdn.includes(searchQuery) ||
        sub.id_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isError) { 
        toast.error(`Failed to load subscribers: ${error.message}`); 
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-8 w-8 text-primary" /> Subscriber Management
                    </h1>
                    <p className="text-muted-foreground">Manage registered SIM users, KYC status, and lifecycle.</p>
                </div>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> New Registration
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Subscribers</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{subscribers?.length || 0}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending KYC</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {subscribers?.filter(s => s.kyc_status === 'PENDING').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Lines</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {subscribers?.filter(s => s.status === 'ACTIVE').length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Subscriber Database</CardTitle>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search Name, Phone, or ID..." 
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : !filteredSubscribers || filteredSubscribers.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No subscribers found matching your criteria.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subscriber Name</TableHead>
                                    <TableHead>MSISDN (Phone)</TableHead>
                                    <TableHead>ID Details</TableHead>
                                    <TableHead>KYC Status</TableHead>
                                    <TableHead>Line Status</TableHead>
                                    <TableHead className="text-right">Registered</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSubscribers.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell className="font-medium">{sub.full_name}</TableCell>
                                        <TableCell className="font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                {sub.msisdn}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                <span className="font-semibold">{sub.id_type}:</span> {sub.id_number}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {sub.kyc_status === 'VERIFIED' ? (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex w-fit items-center gap-1">
                                                    <ShieldCheck className="h-3 w-3" /> Verified
                                                </Badge>
                                            ) : sub.kyc_status === 'REJECTED' ? (
                                                <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" /> Rejected
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={sub.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                {sub.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-sm">
                                            {new Date(sub.registered_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">View</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}