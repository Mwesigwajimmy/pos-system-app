'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from '@/components/ui/card';
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { 
  Loader2, TrendingUp, AlertCircle, Calendar, 
  Search, Download, MoreHorizontal, ArrowLeft, ArrowRight, Eye, FileText
} from "lucide-react";

// --- TYPES ---
interface TenantContext { 
  tenantId: string;
  currency: string;
}

interface Donor { id: string; name: string; email: string; }
interface Campaign { id: string; name: string; }

export interface Donation { 
  id: string; 
  amount: number; 
  currency: string; 
  method: string; 
  date: string; 
  notes?: string;
  status?: string; // e.g., 'completed', 'failed'
  donor: Donor | null; // Joined
  campaign: Campaign | null; // Joined
}

// --- DATA FETCHING ---
const ITEMS_PER_PAGE = 10;

async function fetchDonations(tenantId: string, page: number, search: string) {
  const supabase = createClient();
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Start building the query
  // We use !inner on donors if we are searching by name to filter the parent rows
  let query = supabase
    .from('donations')
    .select(`
      *,
      donor:donors!inner(id, name, email), 
      campaign:communication_campaigns(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .range(from, to);

  if (search) {
    // Search by Donor Name OR Note OR Amount
    // Note: Searching foreign tables via OR in Supabase requires specific syntax or exact filters.
    // For robust enterprise search, we stick to searching the joined donor name or local notes.
    query = query.or(`notes.ilike.%${search}%,donor.name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error; 
  // Cast data because Supabase types might imply arrays for joined relations depending on generation
  return { data: data as unknown as Donation[], count: count || 0 };
}

// --- COMPONENT ---
export default function DonationsList({ tenant }: { tenant: TenantContext }) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  React.useEffect(() => {
    setPage(1); // Reset page on search
  }, [debouncedSearch]);

  const { data: queryData, isLoading, isError } = useQuery({ 
    queryKey: ['donations-list', tenant.tenantId, page, debouncedSearch], 
    queryFn: () => fetchDonations(tenant.tenantId, page, debouncedSearch),
    placeholderData: (prev) => prev
  });

  const donations = queryData?.data || [];
  const totalCount = queryData?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatMoney = (amount: number, currency: string) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || tenant.currency }).format(amount);

  // Helper for Payment Method Badges
  const getMethodBadge = (method: string) => {
    const m = method.toUpperCase();
    switch (m) {
      case 'CARD': return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Card</Badge>;
      case 'CASH': return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Cash</Badge>;
      case 'BANK_TRANSFER': return <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">Bank Transfer</Badge>;
      case 'MOBILE_MONEY': return <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Mobile Money</Badge>;
      default: return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <Card className="h-full shadow-sm border-none md:border-solid">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> 
              Financial Contributions
            </CardTitle>
            <CardDescription>Track and audit all incoming donations.</CardDescription>
          </div>
          <div className="flex gap-2">
             <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search donor or notes..." 
                  className="pl-8 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button variant="outline" size="icon" title="Export CSV">
               <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="border-t">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Donor Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="hidden md:table-cell">Campaign</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell w-[200px]">Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs">Loading transactions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-destructive">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-6 w-6" />
                      <span>Failed to load donations.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : donations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No donations found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                donations.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                            {d.donor?.name || "Anonymous"}
                        </span>
                        <span className="text-[10px] text-muted-foreground md:hidden">
                            {d.campaign?.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-green-700 font-mono">
                      {formatMoney(d.amount, d.currency)}
                    </TableCell>
                    <TableCell>
                      {getMethodBadge(d.method)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {d.campaign ? (
                         <span className="flex items-center gap-1">
                           <FileText className="h-3 w-3" /> {d.campaign.name}
                         </span>
                      ) : (
                         <span className="text-xs italic">General Fund</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3"/>
                        {format(new Date(d.date), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[200px]" title={d.notes}>
                      {d.notes || "-"}
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
                                <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" /> View Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(d.donor?.email || "")}>
                                    <FileText className="mr-2 h-4 w-4" /> Copy Donor Email
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
                  Showing <strong>{(page - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(page * ITEMS_PER_PAGE, totalCount)}</strong> of <strong>{totalCount}</strong> entries
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