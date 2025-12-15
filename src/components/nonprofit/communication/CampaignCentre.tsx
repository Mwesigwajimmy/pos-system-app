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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { 
  Plus, Megaphone, Loader2, Search, MoreHorizontal, 
  Mail, MessageSquare, Smartphone, Calendar, Users, 
  ArrowLeft, ArrowRight, PenLine, Trash2, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

// Import the Uncontrolled Modal
import CreateCommCampaignModal from './CreateCommCampaignModal';

// --- TYPES ---
interface TenantContext { 
  tenantId: string;
  currency: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  subject?: string;
  scheduled_at: string;
  sent_at?: string;
  recipient_count: number;
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Cancelled' | 'Failed';
  created_by?: string;
}

// --- DATA FETCHING ---
const ITEMS_PER_PAGE = 8;

async function fetchCampaigns(tenantId: string, page: number, search: string) {
  const supabase = createClient();
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  let query = supabase
    .from('communication_campaigns')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('scheduled_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query;
  
  if (error) throw error; 
  return { data: data as Campaign[], count: count || 0 };
}

// --- ACTIONS ---
async function deleteCampaign(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('communication_campaigns').delete().eq('id', id);
    if (error) throw error;
}

// --- COMPONENT ---
export default function CampaignCentre({ tenant }: { tenant: TenantContext }) {
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

  // Query
  const { data: queryData, isLoading, isError } = useQuery({
    queryKey: ['comms-campaigns', tenant.tenantId, page, debouncedSearch],
    queryFn: () => fetchCampaigns(tenant.tenantId, page, debouncedSearch),
    placeholderData: (prev) => prev
  });

  const campaigns = queryData?.data || [];
  const totalCount = queryData?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Mutation
  const deleteMutation = useMutation({
      mutationFn: deleteCampaign,
      onSuccess: () => {
          toast.success("Campaign deleted");
          queryClient.invalidateQueries({ queryKey: ['comms-campaigns', tenant.tenantId] });
      },
      onError: () => toast.error("Failed to delete campaign")
  });

  // Helpers
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'SMS': return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'WHATSAPP': return <Smartphone className="h-4 w-4 text-green-600" />;
      default: return <Megaphone className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'Sent': return <Badge className="bg-green-600 hover:bg-green-700">Sent</Badge>;
          case 'Scheduled': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Scheduled</Badge>;
          case 'Draft': return <Badge variant="outline" className="border-dashed">Draft</Badge>;
          case 'Failed': return <Badge variant="destructive">Failed</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
  };

  return (
    <Card className="h-full shadow-sm border-none md:border-solid">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" /> 
              Campaign Centre
            </CardTitle>
            <CardDescription>
              Orchestrate mass communications across Email, SMS, and WhatsApp.
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search campaigns..." 
                  className="pl-8 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {/* FIX: Use Modal as a Controlled Trigger Wrapper */}
            <CreateCommCampaignModal 
                tenant={tenant}
                onComplete={() => queryClient.invalidateQueries({ queryKey: ['comms-campaigns', tenant.tenantId] })}
                trigger={
                    <Button className="whitespace-nowrap">
                        <Plus className="mr-2 h-4 w-4" /> Create
                    </Button>
                }
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="border-t">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Target Audience</TableHead>
                <TableHead>Schedule / Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span>Loading campaigns...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-destructive">
                      Error loading campaigns. Please try again.
                    </TableCell>
                  </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                        <Megaphone className="h-10 w-10 opacity-20" />
                        <p>No active campaigns found.</p>
                        {/* We can optionally put another trigger here or just a message */}
                        <div className="text-sm">Use the Create button above to start.</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">{c.name}</span>
                            {c.subject && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</span>}
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getChannelIcon(c.channel)}
                        <span className="text-xs font-medium">{c.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{c.recipient_count} Recips</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {c.sent_at 
                            ? format(new Date(c.sent_at), "MMM d, h:mm a") 
                            : format(new Date(c.scheduled_at), "MMM d, h:mm a")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(c.status)}
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
                                    <PenLine className="mr-2 h-4 w-4" /> Edit Campaign
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                {c.status === 'Draft' && (
                                    <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => deleteMutation.mutate(c.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
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