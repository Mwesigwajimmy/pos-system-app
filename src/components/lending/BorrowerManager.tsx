'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, PlusCircle, Search, MoreHorizontal, User, ShieldAlert, Phone, Mail, ChevronLeft, ChevronRight 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// --- Enterprise Types ---

interface Borrower {
    id: string;
    full_name: string;
    national_id: string;
    phone_number: string;
    email: string | null;
    status: 'Active' | 'Inactive' | 'Blacklisted' | 'Deceased';
    risk_rating: 'Low' | 'Medium' | 'High'; // Derived from credit score
    active_loans_count: number;
    total_outstanding_balance: number;
    avatar_url?: string;
}

interface FetchResponse {
    data: Borrower[];
    count: number;
}

// --- Data Fetcher ---

const PAGE_SIZE = 10;

async function fetchBorrowers(tenantId: string, page: number, search: string) {
    const supabase = createClient();
    
    // Calculate pagination range
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // We use a specific RPC or a Complex Query to get the aggregate data (loans count, balance)
    // efficient for enterprise lists
    let query = supabase
        .from('profiles') // Assuming borrowers are profiles
        .select(`
            id, full_name, national_id, phone_number, email, status, avatar_url,
            risk_rating,
            loans:loan_applications(count),
            balances:loan_balances(current_balance)
        `, { count: 'exact' })
        .eq('business_id', tenantId)
        .range(from, to)
        .order('full_name', { ascending: true });

    // Apply Search
    if (search) {
        query = query.or(`full_name.ilike.%${search}%,national_id.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    // Transform Data to flatten aggregates
    const borrowers: Borrower[] = data.map((item: any) => {
        // Calculate total balance from all loan balance records
        const totalDebt = item.balances?.reduce((sum: number, b: any) => sum + b.current_balance, 0) || 0;
        
        return {
            id: item.id,
            full_name: item.full_name,
            national_id: item.national_id,
            phone_number: item.phone_number,
            email: item.email,
            status: item.status || 'Active',
            risk_rating: item.risk_rating || 'Low',
            active_loans_count: item.loans?.[0]?.count || 0, // Supabase count returns array
            total_outstanding_balance: totalDebt,
            avatar_url: item.avatar_url
        };
    });

    return { data: borrowers, count: count || 0 };
}

// --- Component ---

export default function BorrowerManager({ tenantId }: { tenantId: string }) {
    const router = useRouter();
    const [page, setPage] = React.useState(1);
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');

    // Debounce search input to prevent excessive API calls
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: response, isLoading, isPlaceholderData } = useQuery({ 
        queryKey: ['borrowers', tenantId, page, debouncedSearch], 
        queryFn: () => fetchBorrowers(tenantId, page, debouncedSearch),
        placeholderData: (previousData) => previousData, // Keep table populated while fetching next page
    });

    const totalPages = response?.count ? Math.ceil(response.count / PAGE_SIZE) : 1;

    // Helper: Risk Rating Color
    const getRiskBadge = (rating: string) => {
        switch(rating) {
            case 'High': return 'destructive';
            case 'Medium': return 'secondary'; // Or amber if customized
            default: return 'outline';
        }
    };

    return (
        <Card className="w-full shadow-sm">
            {/* Header / Toolbar */}
            <CardHeader className="border-b pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>Borrower Directory</CardTitle>
                        <CardDescription>Manage customer profiles, KYC, and credit standing.</CardDescription>
                    </div>
                    <div className="flex w-full md:w-auto gap-2">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search Name or National ID..." 
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => router.push('/lending/borrowers/new')} className="shrink-0">
                            <PlusCircle className="mr-2 h-4 w-4"/> New Borrower
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="relative min-h-[400px]">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[250px]">Customer</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Risk Rating</TableHead>
                                <TableHead className="text-center">Active Loans</TableHead>
                                <TableHead className="text-right">Total Debt</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="animate-spin h-5 w-5 text-primary" /> Loading records...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : response?.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No borrowers found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                response?.data.map((borrower) => (
                                    <TableRow key={borrower.id} className="hover:bg-slate-50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={borrower.avatar_url} />
                                                    <AvatarFallback>{borrower.full_name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900">{borrower.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">ID: {borrower.national_id}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3" /> {borrower.phone_number}
                                                </div>
                                                {borrower.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-3 w-3" /> {borrower.email}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getRiskBadge(borrower.risk_rating)}>
                                                {borrower.risk_rating}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {borrower.active_loans_count}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-slate-700">
                                            {formatCurrency(borrower.total_outstanding_balance)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={borrower.status === 'Active' ? 'default' : borrower.status === 'Blacklisted' ? 'destructive' : 'secondary'}>
                                                {borrower.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/lending/borrowers/${borrower.id}`)}>
                                                        <User className="mr-2 h-4 w-4" /> View 360° Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.push(`/lending/loans?borrowerId=${borrower.id}`)}>
                                                        View Active Loans
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600">
                                                        <ShieldAlert className="mr-2 h-4 w-4" /> Flag / Blacklist
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* Pagination Footer */}
            <CardFooter className="flex items-center justify-between border-t py-4">
                <div className="text-xs text-muted-foreground">
                    Showing <strong>{((page - 1) * PAGE_SIZE) + 1}</strong> to <strong>{Math.min(page * PAGE_SIZE, response?.count || 0)}</strong> of <strong>{response?.count}</strong> borrowers
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(old => Math.max(old - 1, 1))}
                        disabled={page === 1 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(old => (!response || old >= totalPages ? old : old + 1))}
                        disabled={!response || page >= totalPages || isLoading}
                    >
                         Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}