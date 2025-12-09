'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
    Phone, Mail, MapPin, Building, ArrowLeft, 
    Wallet, Users, AlertCircle, FileText, Calendar, Ban
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// --- Enterprise Types (Matching DB RPC Response) ---

interface OfficerProfile {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
    status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED';
    branch_name: string;
    joined_date: string;
}

interface OfficerMetrics {
    portfolio_value: number;
    outstanding_balance: number;
    active_loans_count: number;
    active_clients_count: number;
    par_30_rate: number;
}

interface LoanSummary {
    id: string;
    loan_number: string;
    client_name: string;
    amount: number;
    balance: number;
    next_payment_date: string | null;
    status: 'PENDING' | 'ACTIVE' | 'ARREARS' | 'COMPLETED' | 'WRITTEN_OFF';
    days_overdue: number;
}

interface OfficerDetailResponse {
    profile: OfficerProfile;
    metrics: OfficerMetrics;
    loans: LoanSummary[];
}

// --- Real Fetcher ---
async function fetchOfficerReal(officerId: string, tenantId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('get_loan_officer_details', { 
        p_officer_id: officerId, 
        p_tenant_id: tenantId 
    });

    if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message);
    }
    
    if (!data || !data.profile) {
        throw new Error("Officer not found");
    }

    return data as OfficerDetailResponse;
}

export function OfficerDetailView({ officerId, tenantId }: { officerId: string, tenantId: string }) {
    const router = useRouter();
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['officer-detail', officerId, tenantId],
        queryFn: () => fetchOfficerReal(officerId, tenantId),
        retry: 1,
        staleTime: 60 * 1000, 
    });

    // --- Loading State (Skeleton) ---
    if (isLoading) {
        return <OfficerDetailSkeleton />;
    }

    // --- Error State ---
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4 text-center">
                <div className="p-4 rounded-full bg-red-100 text-red-600">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Error Loading Profile</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">{error instanceof Error ? error.message : "System encountered an error."}</p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
            </div>
        );
    }

    const { profile, metrics, loans } = data!;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Navigation */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="pl-0 gap-1 text-muted-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to Officers
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* --- Left Column: Profile & Contact --- */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="overflow-hidden border-t-4 border-t-primary">
                        <CardContent className="pt-8 text-center pb-6">
                            <div className="flex justify-center mb-4">
                                <Avatar className="h-24 w-24 border-4 border-slate-50 shadow-md">
                                    <AvatarImage src={profile.avatar_url || ''} />
                                    <AvatarFallback className="bg-slate-100 text-2xl font-bold text-slate-600">
                                        {profile.full_name.slice(0,2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-slate-900">{profile.full_name}</h2>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <Badge variant={profile.status === 'ACTIVE' ? 'default' : 'destructive'} className="uppercase text-[10px]">
                                    {profile.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground font-medium">{profile.branch_name}</span>
                            </div>
                            
                            <div className="mt-8 space-y-4 text-left bg-slate-50 p-4 rounded-lg border">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <a href={`mailto:${profile.email}`} className="truncate hover:text-primary transition-colors">{profile.email}</a>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <a href={`tel:${profile.phone}`} className="hover:text-primary transition-colors">{profile.phone}</a>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>Joined {new Date(profile.joined_date).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <Separator className="my-6" />

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" size="sm" className="w-full">Edit Profile</Button>
                                <Button variant="destructive" size="sm" className="w-full">Deactivate</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Risk Stats Card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risk Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    {/* FIXED: Escaped > to &gt; */}
                                    <span className="font-medium text-slate-700">PAR (&gt;30 Days)</span>
                                    <span className={`font-bold ${metrics.par_30_rate > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {metrics.par_30_rate}%
                                    </span>
                                </div>
                                <Progress 
                                    value={Math.min(metrics.par_30_rate, 100)} 
                                    className={`h-2 ${metrics.par_30_rate > 5 ? 'bg-red-100' : 'bg-emerald-100'}`}
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    {/* FIXED: Escaped < to &lt; */}
                                    Target: &lt;5%. {metrics.par_30_rate > 5 ? 'Requires attention.' : 'Within healthy range.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Right Column: KPIs & Data Tables --- */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* KPI Header */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard 
                            title="Portfolio Value" 
                            value={formatCurrency(metrics.portfolio_value)} 
                            icon={<Wallet className="h-5 w-5 text-blue-600"/>}
                            bgClass="bg-blue-50"
                        />
                         <KpiCard 
                            title="Outstanding Balance" 
                            value={formatCurrency(metrics.outstanding_balance)} 
                            icon={<FileText className="h-5 w-5 text-amber-600"/>}
                            bgClass="bg-amber-50"
                        />
                        <KpiCard 
                            title="Active Clients" 
                            value={metrics.active_clients_count.toString()} 
                            icon={<Users className="h-5 w-5 text-emerald-600"/>}
                            bgClass="bg-emerald-50"
                        />
                    </div>

                    {/* Main Content Tabs */}
                    <Tabs defaultValue="loans" className="w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <TabsList className="w-full sm:w-auto grid grid-cols-3 h-10">
                                <TabsTrigger value="loans">Active Loans</TabsTrigger>
                                <TabsTrigger value="performance">History</TabsTrigger>
                                <TabsTrigger value="audit">Audit Log</TabsTrigger>
                            </TabsList>
                            <Button size="sm" variant="outline" className="hidden sm:flex">
                                <FileText className="mr-2 h-4 w-4" /> Download Report
                            </Button>
                        </div>

                        <TabsContent value="loans" className="space-y-4">
                            <Card>
                                <CardHeader className="px-6 py-4 border-b">
                                    <CardTitle className="text-base font-semibold">Active Portfolio Assignment</CardTitle>
                                    <CardDescription>Recently updated loans managed by this officer.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loans.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground">
                                            <Ban className="h-10 w-10 mx-auto mb-3 opacity-20"/>
                                            <p>No active loans found assigned to this officer.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-slate-50/50">
                                                    <TableRow>
                                                        <TableHead className="w-[100px]">Loan #</TableHead>
                                                        <TableHead>Client Name</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Principal</TableHead>
                                                        <TableHead className="text-right">Balance</TableHead>
                                                        <TableHead className="text-right">Next Due</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {loans.map((loan) => (
                                                        <TableRow key={loan.id} className="hover:bg-slate-50/50">
                                                            <TableCell className="font-mono text-xs font-medium text-slate-600">
                                                                {loan.loan_number}
                                                            </TableCell>
                                                            <TableCell className="font-medium">{loan.client_name}</TableCell>
                                                            <TableCell>
                                                                <StatusBadge status={loan.status} daysOverdue={loan.days_overdue} />
                                                            </TableCell>
                                                            <TableCell className="text-right text-muted-foreground text-sm">
                                                                {formatCurrency(loan.amount)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-sm text-slate-900">
                                                                {formatCurrency(loan.balance)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                                {loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString() : '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t p-4 flex justify-center">
                                    <Button variant="link" size="sm" className="text-muted-foreground">View Full Portfolio ({metrics.active_loans_count})</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="performance">
                            <Card className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[300px]">
                                <p>Historical performance charts would load here.</p>
                                <p className="text-xs mt-2">Connecting to `loan_history_snapshots` table...</p>
                            </Card>
                        </TabsContent>
                        
                        <TabsContent value="audit">
                             <Card className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[300px]">
                                <p>System audit logs for this user account.</p>
                             </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

// --- Sub-Components ---

function KpiCard({ title, value, icon, bgClass }: { title: string, value: string, icon: React.ReactNode, bgClass: string }) {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${bgClass}`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
                        <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status, daysOverdue }: { status: string, daysOverdue: number }) {
    if (status === 'ARREARS' || daysOverdue > 0) {
        return (
            <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 text-[10px] px-2 py-0.5">
                Overdue {daysOverdue}d
            </Badge>
        );
    }
    if (status === 'ACTIVE') {
        return <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px]">Active</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
}

function OfficerDetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex gap-2"><Skeleton className="h-9 w-24" /></div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-6">
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                    <Skeleton className="h-[150px] w-full rounded-xl" />
                </div>
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                    </div>
                    <Skeleton className="h-[500px] w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}