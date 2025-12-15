'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { 
    Loader2, Mail, Phone, Calendar, DollarSign, 
    User, MapPin, Building, History, Edit, MessageSquare, HeartHandshake
} from "lucide-react";
import { format } from "date-fns";

// --- TYPES ---
interface TenantContext { 
    tenantId: string;
    currency: string;
}

export interface Donor {
    id: string; 
    name: string; 
    email: string; 
    phone?: string; 
    type: 'Individual' | 'Corporate' | 'Foundation'; 
    status: 'Active' | 'Lapsed' | 'New';
    address?: string;
    city?: string;
    notes?: string;
    created_at: string;
}

export interface Donation {
    id: string; 
    amount: number; 
    currency: string; 
    method: 'Credit Card' | 'Bank Transfer' | 'Cash' | 'Check' | 'Other'; 
    date: string; 
    campaign_id?: string;
    campaign_name?: string; // If you join data
    status: 'completed' | 'pending' | 'failed';
}

// --- DATA FETCHING ---
async function fetchDonorData(tenantId: string, donorId: string) {
    const db = createClient();
    
    // Parallel fetching for performance
    const [donorRes, donationsRes] = await Promise.all([
        db.from('donors')
          .select('*')
          .eq('id', donorId)
          .eq('tenant_id', tenantId)
          .single(),
        db.from('donations')
          .select('*') // In real app, you might join campaign name here
          .eq('tenant_id', tenantId)
          .eq('donor_id', donorId)
          .order('date', { ascending: false })
    ]);

    if (donorRes.error) throw donorRes.error;
    if (donationsRes.error) throw donationsRes.error;

    return {
        donor: donorRes.data as Donor,
        donations: donationsRes.data as Donation[]
    };
}

// --- COMPONENT ---
export default function DonorProfile({ 
    tenant, 
    donorId 
}: { 
    tenant: TenantContext; 
    donorId: string; 
}) {
    // Queries
    const { data, isLoading, isError } = useQuery({ 
        queryKey: ['donor-full-profile', tenant.tenantId, donorId], 
        queryFn: () => fetchDonorData(tenant.tenantId, donorId) 
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Loading donor profile...</p>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <User className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-bold text-destructive">Donor Not Found</h3>
                    <p className="text-muted-foreground">The requested donor could not be retrieved.</p>
                </CardContent>
            </Card>
        );
    }

    const { donor, donations } = data;

    // --- Derived Metrics (Client Side) ---
    // In a massive system, calculate these via SQL views/RPCs instead.
    const totalDonated = donations.reduce((sum, d) => sum + (d.status === 'completed' ? d.amount : 0), 0);
    const donationCount = donations.filter(d => d.status === 'completed').length;
    const avgDonation = donationCount > 0 ? totalDonated / donationCount : 0;
    
    const formatMoney = (amount: number) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(amount);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. Header Card */}
            <Card className="overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                    <div className="absolute -bottom-10 left-6">
                        <div className="h-20 w-20 rounded-full bg-white p-1 shadow-md">
                            <div className="h-full w-full rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-2xl">
                                {donor.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </div>
                <CardHeader className="pt-12 pb-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                {donor.name}
                                <Badge variant={donor.status === 'Active' ? 'default' : 'secondary'}>
                                    {donor.status}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {donor.type}</span>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {format(new Date(donor.created_at), 'MMM yyyy')}</span>
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <MessageSquare className="mr-2 h-4 w-4" /> Log Interaction
                            </Button>
                            <Button variant="default" size="sm">
                                <Edit className="mr-2 h-4 w-4" /> Edit Profile
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
                        <HeartHandshake className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMoney(totalDonated)}</div>
                        <p className="text-xs text-muted-foreground">Total contributions to date</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Donation Frequency</CardTitle>
                        <History className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{donationCount}</div>
                        <p className="text-xs text-muted-foreground">Successful transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Gift</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMoney(avgDonation)}</div>
                        <p className="text-xs text-muted-foreground">Per transaction average</p>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Detailed Tabs */}
            <Tabs defaultValue="history" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="history">Donation History</TabsTrigger>
                    <TabsTrigger value="details">Contact Details</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                
                {/* Tab: History */}
                <TabsContent value="history" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction Log</CardTitle>
                            <CardDescription>Full history of financial contributions.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Campaign</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {donations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No donations recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        donations.map((d) => (
                                            <TableRow key={d.id}>
                                                <TableCell className="font-medium">
                                                    {format(new Date(d.date), "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell className="font-bold text-green-600">
                                                    {formatMoney(d.amount)}
                                                </TableCell>
                                                <TableCell className="capitalize text-muted-foreground">
                                                    {d.method}
                                                </TableCell>
                                                <TableCell>
                                                    {d.campaign_name || d.campaign_id || <span className="text-muted-foreground italic text-xs">General Fund</span>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={d.status === 'completed' ? 'outline' : 'destructive'} className="uppercase text-[10px]">
                                                        {d.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Details */}
                <TabsContent value="details" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-muted-foreground">Email Address</h4>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-primary" />
                                        <a href={`mailto:${donor.email}`} className="text-sm hover:underline">{donor.email}</a>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-muted-foreground">Phone Number</h4>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-primary" />
                                        <span className="text-sm">{donor.phone || "Not provided"}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-muted-foreground">Mailing Address</h4>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <span className="text-sm">
                                            {donor.address ? `${donor.address}, ${donor.city || ''}` : "Not provided"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {/* Tab: Notes */}
                <TabsContent value="notes" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Internal Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted/30 p-4 rounded-lg border border-dashed min-h-[100px] text-sm text-muted-foreground">
                                {donor.notes || "No notes available for this donor."}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="ghost" size="sm" className="ml-auto">Update Notes</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}