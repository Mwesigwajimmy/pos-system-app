'use client';

import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { 
    Loader2, User, Phone, Mail, MoreHorizontal, 
    Search, ArrowLeft, ArrowRight, FileEdit, Trash2, Eye 
} from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce"; // Assuming you have a debounce hook, if not I handle it below

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
    last_donation_date?: string;
    total_lifetime_value?: number; // Enterprise metric
    created_at: string;
}

// --- DATA FETCHING (Client-Side for Search/Pagination) ---
const ITEMS_PER_PAGE = 10;

async function fetchDonors(tenantId: string, page: number, search: string) {
    const supabase = createClient();
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
        .from('donors')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .range(from, to);

    if (search) {
        // Enterprise search: check name OR email
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;
    return { data: data as Donor[], count: count || 0 };
}

// --- COMPONENT ---
export default function DonorList({ tenant }: { tenant: TenantContext }) {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Debounce search to prevent database spamming while typing
    // Simple inline implementation if you don't have a hook
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset page when search changes
    React.useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // Query
    const { data: queryData, isLoading, isError } = useQuery({
        queryKey: ['donors', tenant.tenantId, page, debouncedSearch],
        queryFn: () => fetchDonors(tenant.tenantId, page, debouncedSearch),
        placeholderData: (previousData) => previousData, // Keep data while fetching new page
    });

    const donors = queryData?.data || [];
    const totalCount = queryData?.count || 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Helpers
    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'Active': return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
            case 'New': return <Badge className="bg-blue-600 hover:bg-blue-700">New</Badge>;
            case 'Lapsed': return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Lapsed</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card className="w-full shadow-sm">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary"/> Donors Directory
                        </CardTitle>
                        <CardDescription>Manage your organization's donor base and history.</CardDescription>
                    </div>
                    {/* Search Bar */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or email..." 
                            className="pl-8 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="p-0">
                <div className="border-t">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Donor Name</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Donation</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                                            <span className="text-xs">Loading records...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : isError ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-red-500">
                                        Failed to load donors. Please check connection.
                                    </TableCell>
                                </TableRow>
                            ) : donors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No donors found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                donors.map((d) => (
                                    <TableRow key={d.id} className="group hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                    {d.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                {d.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm">
                                                <span className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                                    <Mail className="w-3 h-3"/> {d.email}
                                                </span>
                                                {d.phone && (
                                                    <span className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                                        <Phone className="w-3 h-3"/> {d.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium">
                                                {d.type}
                                            </span>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(d.status)}</TableCell>
                                        <TableCell>
                                            {d.last_donation_date ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">
                                                        {format(new Date(d.last_donation_date), 'MMM d, yyyy')}
                                                    </span>
                                                    {/* Optional: Show Lifetime Value if available */}
                                                    {d.total_lifetime_value && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            LTV: {new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(d.total_lifetime_value)}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">No donations yet</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(d.email)}>
                                                        Copy Email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem>
                                                        <Eye className="mr-2 h-4 w-4" /> View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <FileEdit className="mr-2 h-4 w-4" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Donor
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
            {totalCount > 0 && (
                <CardFooter className="flex items-center justify-between py-4 border-t">
                    <div className="text-xs text-muted-foreground">
                        Showing <strong>{(page - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(page * ITEMS_PER_PAGE, totalCount)}</strong> of <strong>{totalCount}</strong> donors
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isLoading}
                        >
                            Next <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}