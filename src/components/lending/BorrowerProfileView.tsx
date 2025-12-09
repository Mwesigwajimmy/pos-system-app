'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { 
    Loader2, MapPin, Phone, Mail, User, ShieldCheck, AlertTriangle, FileText, History, Plus 
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

// --- Types ---
interface BorrowerProfile {
    id: string;
    full_name: string;
    national_id: string;
    phone_number: string;
    email: string;
    address: string;
    avatar_url: string | null;
    kyc_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
    credit_score: number;
    risk_rating: 'LOW' | 'MEDIUM' | 'HIGH';
    date_joined: string;
    metrics: {
        total_loans_taken: number;
        total_repaid: number;
        current_exposure: number;
        repayment_rate: number; // %
    };
    loans: {
        id: string;
        application_no: string;
        product_name: string;
        amount: number;
        status: string;
        date: string;
    }[];
    documents: {
        id: string;
        name: string;
        type: string;
        uploaded_at: string;
    }[];
}

async function fetchBorrowerProfile(borrowerId: string) {
    const db = createClient();
    // Enterprise RPC: Aggregates profile, loans, docs, and risk metrics in one call
    const { data, error } = await db.rpc('get_borrower_360_view', { p_borrower_id: borrowerId });
    if (error) throw new Error(error.message);
    return data as BorrowerProfile;
}

export function BorrowerProfileView({ borrowerId }: { borrowerId: string }) {
    const router = useRouter();
    const { data, isLoading } = useQuery({
        queryKey: ['borrower-profile', borrowerId],
        queryFn: () => fetchBorrowerProfile(borrowerId)
    });

    if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary"/></div>;
    if (!data) return <div className="p-8 text-red-600 border bg-red-50 rounded">Borrower not found</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* 1. Header Card */}
            <Card className="border-l-4 border-l-blue-600 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        {/* Profile Info */}
                        <div className="flex gap-4">
                            <Avatar className="h-20 w-20 border-2 border-slate-100 shadow-sm">
                                <AvatarImage src={data.avatar_url || ''} />
                                <AvatarFallback className="text-xl bg-blue-100 text-blue-700">{data.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{data.full_name}</h2>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <Badge variant="outline" className="font-mono">{data.national_id}</Badge>
                                    <span>•</span>
                                    <span>Member since {new Date(data.date_joined).getFullYear()}</span>
                                </div>
                                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                                    <div className="flex items-center gap-1"><Phone className="w-4 h-4 text-slate-400"/> {data.phone_number}</div>
                                    <div className="flex items-center gap-1"><Mail className="w-4 h-4 text-slate-400"/> {data.email}</div>
                                    <div className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400"/> {data.address}</div>
                                </div>
                            </div>
                        </div>

                        {/* Risk / KYC Status */}
                        <div className="flex flex-col items-end gap-2">
                             <div className="flex items-center gap-2">
                                <Badge className={data.kyc_status === 'VERIFIED' ? 'bg-green-600' : 'bg-amber-500'}>
                                    {data.kyc_status === 'VERIFIED' ? <ShieldCheck className="w-3 h-3 mr-1"/> : <AlertTriangle className="w-3 h-3 mr-1"/>}
                                    KYC {data.kyc_status}
                                </Badge>
                                <Badge variant="outline" className={data.risk_rating === 'HIGH' ? 'border-red-500 text-red-600' : 'border-slate-300'}>
                                    Risk: {data.risk_rating}
                                </Badge>
                             </div>
                             <div className="text-right mt-2">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Credit Score</p>
                                <div className="text-3xl font-bold text-slate-900 flex items-center justify-end gap-2">
                                    {data.credit_score}
                                    <span className="text-sm font-normal text-muted-foreground">/ 850</span>
                                </div>
                             </div>
                             <div className="flex gap-2 mt-2">
                                <Button size="sm" variant="outline">Edit Profile</Button>
                                <Button size="sm" onClick={() => router.push(`/lending/applications/new?borrower=${borrowerId}`)}>
                                    <Plus className="w-4 h-4 mr-1"/> New Loan
                                </Button>
                             </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Metrics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-muted-foreground uppercase">Current Exposure</CardTitle></CardHeader>
                    <CardContent className="text-xl font-bold text-blue-700">{formatCurrency(data.metrics.current_exposure)}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-muted-foreground uppercase">Total Repaid</CardTitle></CardHeader>
                    <CardContent className="text-xl font-bold text-green-700">{formatCurrency(data.metrics.total_repaid)}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-muted-foreground uppercase">Loans Taken</CardTitle></CardHeader>
                    <CardContent className="text-xl font-bold">{data.metrics.total_loans_taken}</CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-muted-foreground uppercase">Repayment Rate</CardTitle></CardHeader>
                    <CardContent className="text-xl font-bold">{data.metrics.repayment_rate}%</CardContent>
                </Card>
            </div>

            {/* 3. Detailed Tabs */}
            <Tabs defaultValue="loans" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                    <TabsTrigger value="loans" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                        <History className="w-4 h-4 mr-2"/> Loan History
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                        <FileText className="w-4 h-4 mr-2"/> Documents
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                        <User className="w-4 h-4 mr-2"/> Notes & Guarantors
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Loans */}
                <TabsContent value="loans">
                    <Card>
                        <CardHeader>
                            <CardTitle>Loan Portfolio History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.loans.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8">No loans found.</TableCell></TableRow>
                                    ) : (
                                        data.loans.map((loan) => (
                                            <TableRow key={loan.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/lending/loans/${loan.id}`)}>
                                                <TableCell>{formatDate(loan.date)}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{loan.application_no}</TableCell>
                                                <TableCell>{loan.product_name}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(loan.amount)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={['Active', 'Paid'].includes(loan.status) ? 'default' : 'secondary'}>
                                                        {loan.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="ghost">View</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Documents */}
                <TabsContent value="documents">
                    <Card>
                        <CardHeader><CardTitle>KYC & Legal Documents</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.documents.map((doc) => (
                                    <div key={doc.id} className="flex items-center p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                                        <FileText className="h-8 w-8 text-blue-500 mr-3"/>
                                        <div className="overflow-hidden">
                                            <p className="font-medium text-sm truncate">{doc.name}</p>
                                            <p className="text-xs text-muted-foreground">{doc.type} • {formatDate(doc.uploaded_at)}</p>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="h-16 border-dashed flex flex-col gap-1 items-center justify-center">
                                    <Plus className="h-4 w-4"/>
                                    Upload Document
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Notes */}
                <TabsContent value="notes">
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Guarantor and Notes module would go here in full implementation.
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}