'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from '@/components/ui/card';
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format, isPast } from "date-fns";
import { 
  Loader2, Sparkles, Search, MoreHorizontal, ArrowLeft, ArrowRight, 
  Calendar, Target, Trash2, PenLine, Eye, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

// --- TYPES ---
interface TenantContext { 
  tenantId: string;
  currency: string;
}

export interface Campaign { 
  id: string; 
  name: string; 
  description?: string;
  goal_amount: number; 
  raised_amount: number; 
  start_date: string; 
  end_date: string; 
  status: 'Active' | 'Completed' | 'Paused' | 'Cancelled';
  donor_count?: number; // Optional aggregate
}

// --- DATA FETCHING ---
const ITEMS_PER_PAGE = 8;

async function fetchCampaigns(tenantId: string, page: number, search: string) {
  const supabase = createClient();
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  let query = supabase
    .from('fundraising_campaigns')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query;
  
  if (error) throw error; 
  return { data: data as Campaign[], count: count || 0 };
}

async function deleteCampaign(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('fundraising_campaigns').delete().eq('id', id);
  if (error) throw error;
}

// --- COMPONENT ---
export default function CampaignList({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: queryData, isLoading, isError } = useQuery({ 
    queryKey: ['fundraising-campaigns', tenant.tenantId, page, debouncedSearch], 
    queryFn: () => fetchCampaigns(tenant.tenantId, page, debouncedSearch),
    placeholderData: (prev) => prev
  });

  const campaigns = queryData?.data || [];
  const totalCount = queryData?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      toast.success("Campaign deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['fundraising-campaigns', tenant.tenantId] });
    },
    onError: () => toast.error("Failed to delete campaign. It may have linked donations.")
  });

  // Helpers
  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(amount);

  const getStatusBadge = (campaign: Campaign) => {
    // Enterprise Rule: If date passed and not completed, mark as Expired visually
    if (campaign.status === 'Active' && isPast(new Date(campaign.end_date))) {
       return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Expired</Badge>;
    }

    switch(campaign.status) {
      case 'Active': return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
      case 'Completed': return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Completed</Badge>;
      case 'Paused': return <Badge variant="secondary">Paused</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{campaign.status}</Badge>;
    }
  };

  const calculateProgress = (raised: number, goal: number) => {
    if (goal === 0) return 100;
    return Math.min((raised / goal) * 100, 100);
  };

  return (
    <Card className="h-full shadow-sm border-none md:border-solid">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
               <Sparkles className="h-5 w-5 text-primary" /> Fundraising Campaigns
            </CardTitle>
            <CardDescription>Track progress towards your financial goals.</CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search campaigns..." 
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
                <TableHead className="w-[250px]">Campaign Name</TableHead>
                <TableHead className="w-[200px]">Goal Progress</TableHead>
                <TableHead>Financials</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                   <TableCell colSpan={6} className="h-32 text-center text-destructive">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-6 w-6" />
                        <span>Failed to load campaigns.</span>
                      </div>
                   </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No campaigns found. Start a new fundraiser to see it here.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => {
                  const percent = calculateProgress(c.raised_amount, c.goal_amount);
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                           <span className="text-sm font-semibold text-foreground">{c.name}</span>
                           <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                             {c.description || "No description"}
                           </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                           <div className="flex justify-between text-xs">
                              <span className="font-medium">{percent.toFixed(1)}%</span>
                              <span className="text-muted-foreground">Target</span>
                           </div>
                           <Progress 
                              value={percent} 
                              // Visual flair: Turn green if complete using descendant selector
                              className={`h-2 ${percent >= 100 ? "[&>*]:bg-green-600" : ""}`}
                           />
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col text-sm">
                            <span className="font-bold text-green-700">
                                {formatMoney(c.raised_amount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                of {formatMoney(c.goal_amount)} goal
                            </span>
                         </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(c)}
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Target className="w-3 h-3" /> 
                                <span>Start: {format(new Date(c.start_date), "MMM d, yy")}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" /> 
                                <span>End: {format(new Date(c.end_date), "MMM d, yy")}</span>
                            </div>
                         </div>
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
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <PenLine className="mr-2 h-4 w-4" /> Edit Campaign
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => deleteMutation.mutate(c.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Pagination Footer */}
      {totalCount > 0 && (
          <CardFooter className="flex items-center justify-between py-4 border-t">
              <div className="text-xs text-muted-foreground">
                  Showing <strong>{(page - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(page * ITEMS_PER_PAGE, totalCount)}</strong> of <strong>{totalCount}</strong> campaigns
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