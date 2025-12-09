'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, Search, Filter, MoreVertical, FileText, Calendar, User 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";

// --- Enterprise Types ---

// The shape of the data coming from Supabase with Joins
interface LoanApplication {
  id: string;
  application_no: string; // Critical for support tickets
  amount: number;
  term_months: number;
  status: 'Pending' | 'Review' | 'Approved' | 'Rejected';
  created_at: string;
  // Join: Borrower Profile
  borrower: {
    full_name: string;
    national_id: string;
    phone: string;
  };
  // Join: Product Config
  product: {
    name: string;
    interest_rate: number;
  };
}

// --- Data Fetcher ---

async function fetchApplications(tenantId: string, searchTerm: string = '') {
  const supabase = createClient();
  
  // 1. Base Query
  let query = supabase
    .from('loan_applications')
    .select(`
      id,
      application_no,
      amount:principal_amount,
      term_months:loan_term,
      status,
      created_at,
      borrower:profiles!inner(full_name, national_id, phone),
      product:loan_products(name, interest_rate)
    `)
    .eq('business_id', tenantId)
    .order('created_at', { ascending: false });

  // 2. Search Logic (Search by Name or Application No)
  if (searchTerm) {
    // Note: Supabase ILIKE on joined columns requires specific syntax or embedding
    // For simple implementation, we search Application No or Borrower Name
    // A robust search usually requires a Database View or RPC for performance
    query = query.or(`application_no.ilike.%${searchTerm}%, profiles.full_name.ilike.%${searchTerm}%`, { foreignTable: "profiles" });
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Fetch Error", error);
    throw new Error("Unable to load applications.");
  }
  
  return data as unknown as LoanApplication[];
}

// --- Component ---

export function ApplicationsList({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [search, setSearch] = React.useState('');

  // Use React Query for caching and state management
  const { data: applications, isLoading, isError } = useQuery({ 
    queryKey: ['applications', tenantId, search], 
    queryFn: () => fetchApplications(tenantId, search),
    placeholderData: (previousData) => previousData, // Smooth transitions during search
  });

  // Helper for Status Badge Color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'default'; // Black/Primary
      case 'Pending': return 'secondary'; // Gray
      case 'Review': return 'outline'; // Border only
      case 'Rejected': return 'destructive'; // Red
      default: return 'secondary';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-bold">Loan Applications</CardTitle>
            <CardDescription>Manage incoming loan requests and queue.</CardDescription>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search app no. or name..." 
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button onClick={() => router.push('/lending/applications/new')}>
              + New Application
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="rounded-md border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[100px]">App No</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Term</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span>Fetching applications...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-red-500 font-medium">
                    Failed to load data. Please check connection.
                  </TableCell>
                </TableRow>
              ) : applications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 opacity-20" />
                      <p>No applications found matching criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                applications?.map((app) => (
                  <TableRow 
                    key={app.id} 
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => router.push(`/lending/applications/${app.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-medium text-slate-500">
                      {app.application_no}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{app.borrower.full_name}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {app.borrower.national_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                         <span className="text-sm">{app.product.name}</span>
                         <span className="text-xs text-muted-foreground">{app.product.interest_rate}% Int.</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(app.amount)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {app.term_months} Mo
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(app.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(app.status)} className="capitalize">
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/lending/applications/${app.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          {app.status === 'Pending' && (
                            <DropdownMenuItem className="text-green-600">Quick Approve</DropdownMenuItem>
                          )}
                          {app.status === 'Pending' && (
                            <DropdownMenuItem className="text-red-600">Reject</DropdownMenuItem>
                          )}
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
    </Card>
  );
}