'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile'; // Custom hook for current user
import { toast } from 'sonner';
import { Lightbulb, AlertTriangle, Sparkles, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InsightCard from '@/components/core/InsightCard';

// --- TYPES ---
interface Insight {
  type: 'profitability' | 'churn_risk' | 'dead_stock' | 'cash_flow' | 'loan_risk' | 'underutilized_property';
  title: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: any;
  category: 'Financial' | 'Inventory' | 'Customer' | 'Operations';
}

interface InsightFilters {
  severity: string;
  category: string;
  businessId: string;
  locationId: string;
}

// --- Supabase Integration ---
const supabase = createClient();

const fetchAllInsights = async (filters: InsightFilters): Promise<Insight[]> => { 
  const { data, error } = await supabase.rpc('get_all_copilot_insights', {
    p_severity: filters.severity || null,
    p_category: filters.category || null,
    p_business_id: filters.businessId || null,
    p_location_id: filters.locationId || null,
  }); 
  if(error) throw new Error(error.message); 
  return data || []; 
};

const fetchLocations = async (businessId: string): Promise<{ id: string; name: string }[]> => {
  const { data, error } = await supabase.from('locations').select('id, name').eq('business_id', businessId);
  if (error) throw error;
  return data || [];
};

// --- MAIN PAGE ---
export default function CopilotPage() {
  const queryClient = useQueryClient();
  const { data: userProfile } = useUserProfile();
  const businessId = userProfile?.business_id || '';
  
  const [action, setAction] = useState<{ type: string; data: any } | null>(null);
  const [filters, setFilters] = useState<InsightFilters>({
    severity: '',
    category: '',
    businessId: businessId,
    locationId: ''
  });

  // Auto-set businessId filter when userProfile loads
  React.useEffect(() => {
    if (businessId && !filters.businessId) {
      setFilters((f) => ({ ...f, businessId }));
    }
  }, [businessId, filters.businessId]);

  // Locations for filter dropdown
  const { data: locations } = useQuery({
    queryKey: ['locations', businessId],
    queryFn: () => businessId ? fetchLocations(businessId) : Promise.resolve([]),
    enabled: !!businessId
  });

  const { data: insights, isLoading, isError, error, refetch } = useQuery({ 
    queryKey: ['allCopilotInsights', filters], 
    queryFn: () => fetchAllInsights(filters),
    enabled: !!businessId
  });

  // Mutations for actions
  const createDiscountMutation = useMutation({
    mutationFn: async (vars: { variantId: number; percentage: number; endDate: string }) => {
      const { error } = await supabase.rpc('create_discount_for_product', {
        ...vars,
        business_id: businessId
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Discount created and applied!'); setAction(null); },
    onError: (err: Error) => toast.error(`Action failed: ${err.message}`),
  });

  const sendFollowUpMutation = useMutation({
    mutationFn: async (vars: { customerId: number; message: string }) => {
      const { error } = await supabase.rpc('send_customer_follow_up', {
        ...vars,
        business_id: businessId
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Follow-up sent!'); setAction(null); },
    onError: (err: Error) => toast.error(`Action failed: ${err.message}`),
  });

  const generateLoanOfferMutation = useMutation({
    mutationFn: async (vars: { customerId: number; amount: number; }) => {
      const { error } = await supabase.rpc('generate_loan_offer', {
        ...vars,
        business_id: businessId
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Loan offer generated!'); setAction(null); },
    onError: (err: Error) => toast.error(`Action failed: ${err.message}`),
  });

  const reviewLoanMutation = useMutation({
    mutationFn: async (vars: { loanId: number }) => {
      const { error } = await supabase.rpc('review_loan_application', {
        ...vars,
        business_id: businessId
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Loan reviewed!'); setAction(null); },
    onError: (err: Error) => toast.error(`Action failed: ${err.message}`),
  });

  const promoteItemMutation = useMutation({
    mutationFn: async (vars: { productId: number }) => {
      const { error } = await supabase.rpc('promote_product', {
        ...vars,
        business_id: businessId
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Item promoted!'); setAction(null); },
    onError: (err: Error) => toast.error(`Action failed: ${err.message}`),
  });

  const marketPropertyMutation = useMutation({
    mutationFn: async (vars: { propertyId: number }) => {
      const { error } = await supabase.rpc('create_property_campaign', {
        ...vars,
        business_id: businessId
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Marketing campaign created!'); setAction(null); },
    onError: (err: Error) => toast.error(`Action failed: ${err.message}`),
  });

  // Sorted for display
  const sortedInsights = useMemo(() => {
    if (!insights) return [];
    const severityOrder = { critical: 1, warning: 2, info: 3 };
    return [...insights].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [insights]);

  return (
    <div className="container mx-auto py-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="text-primary"/>AI Enterprise Co-Pilot</h1>
        <p className="text-muted-foreground">Actionable intelligence to optimize your entire operation, powered by your own data.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Filter className="h-5 w-5"/> Filter Insights</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Select value={filters.severity} onValueChange={(v) => setFilters(f => ({...f, severity: v === 'all' ? '' : v}))}>
            <SelectTrigger><SelectValue placeholder="Filter by Severity..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.category} onValueChange={(v) => setFilters(f => ({...f, category: v === 'all' ? '' : v}))}>
            <SelectTrigger><SelectValue placeholder="Filter by Category..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Financial">Financial</SelectItem>
              <SelectItem value="Inventory">Inventory</SelectItem>
              <SelectItem value="Customer">Customer</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.locationId} onValueChange={(v) => setFilters(f => ({...f, locationId: v === 'all' ? '' : v}))}>
            <SelectTrigger><SelectValue placeholder="Filter by Location..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={filters.businessId} disabled className="bg-muted" placeholder="Business ID" />
        </CardContent>
      </Card>

      {isLoading ? <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full break-inside-avoid" />)}</div> :
        isError ? <div className="text-center p-10"><h2 className="text-xl">Failed to load insights.</h2><p>{(error as Error).message}</p><Button onClick={() => refetch()} className="mt-4">Try Again</Button></div> :
        (sortedInsights.length === 0) ? (
          <div className="text-center p-10 border-2 border-dashed rounded-lg">
            <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No new insights for the current filters</h3>
            <p className="mt-1 text-sm text-muted-foreground">Co-Pilot is analyzing your data. Check back later or adjust your filters.</p>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {sortedInsights.map((insight, i) => <InsightCard key={i} insight={insight} onAction={(type, data) => setAction({ type, data })} />)}
            </div>
          </section>
        )}

      <Dialog open={!!action} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Action: {action?.data.name || action?.data.title}</DialogTitle>
            <DialogDescription>
              {action?.type === 'create_discount' && `Create a limited-time sale for "${action.data.name}" to move dead stock.`}
              {action?.type === 'send_follow_up' && `Send a personalized follow-up message to "${action.data.name}".`}
              {action?.type === 'generate_loan' && `Generate a loan offer for "${action.data.name}".`}
              {action?.type === 'review_loan' && `Review loan application for "${action.data.name}".`}
              {action?.type === 'promote_item' && `Promote item "${action.data.name}" to boost sales.`}
              {action?.type === 'market_property' && `Create a marketing campaign for property "${action.data.name}".`}
            </DialogDescription>
          </DialogHeader>
          {/* Discount Action Form */}
          {action?.type === 'create_discount' && (
            <form id="discount-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createDiscountMutation.mutate({ 
                variantId: action.data.variant_id, 
                percentage: Number(formData.get('discount')), 
                endDate: formData.get('end_date') as string 
              });
            }}>
              <div className="py-4 space-y-4">
                <div><Label htmlFor="discount">Discount Percentage</Label><Input id="discount" name="discount" type="number" placeholder="e.g., 20" required/></div>
                <div><Label htmlFor="end_date">Sale End Date</Label><Input id="end_date" name="end_date" type="date" required/></div>
              </div>
            </form>
          )}
          {/* Follow Up Action Form */}
          {action?.type === 'send_follow_up' && (
            <form id="followup-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              sendFollowUpMutation.mutate({ 
                customerId: action.data.customer_id,
                message: (formData.get('message') as string) || ''
              });
            }}>
              <div className="py-4 space-y-4">
                <div><Label htmlFor="message">Message</Label><Input id="message" name="message" type="text" placeholder="Type your follow up..." required /></div>
              </div>
            </form>
          )}
          {/* Generate Loan Offer Form */}
          {action?.type === 'generate_loan' && (
            <form id="loan-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              generateLoanOfferMutation.mutate({ 
                customerId: action.data.customer_id,
                amount: Number(formData.get('amount'))
              });
            }}>
              <div className="py-4 space-y-4">
                <div><Label htmlFor="amount">Loan Amount</Label><Input id="amount" name="amount" type="number" placeholder="Amount" required /></div>
              </div>
            </form>
          )}
          {/* Review Loan Action Form */}
          {action?.type === 'review_loan' && (
            <form id="reviewloan-form" onSubmit={(e) => {
              e.preventDefault();
              reviewLoanMutation.mutate({ loanId: action.data.loan_id });
            }}>
              <div className="py-4 space-y-4">
                <div>This will mark the loan as reviewed.</div>
              </div>
            </form>
          )}
          {/* Promote Item Action */}
          {action?.type === 'promote_item' && (
            <form id="promote-form" onSubmit={(e) => {
              e.preventDefault();
              promoteItemMutation.mutate({ productId: action.data.product_id });
            }}>
              <div className="py-4 space-y-4">
                <div>This will promote the item in your system and to customers.</div>
              </div>
            </form>
          )}
          {/* Market Property Action */}
          {action?.type === 'market_property' && (
            <form id="market-property-form" onSubmit={(e) => {
              e.preventDefault();
              marketPropertyMutation.mutate({ propertyId: action.data.property_id });
            }}>
              <div className="py-4 space-y-4">
                <div>This will create a campaign for your property.</div>
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
            {action?.type === 'create_discount' && (
              <Button type="submit" form="discount-form" disabled={createDiscountMutation.isPending}>
                {createDiscountMutation.isPending && <Skeleton className="mr-2 h-4 w-4 animate-spin"/>}
                Confirm Discount
              </Button>
            )}
            {action?.type === 'send_follow_up' && (
              <Button type="submit" form="followup-form" disabled={sendFollowUpMutation.isPending}>
                {sendFollowUpMutation.isPending && <Skeleton className="mr-2 h-4 w-4 animate-spin"/>}
                Send Follow Up
              </Button>
            )}
            {action?.type === 'generate_loan' && (
              <Button type="submit" form="loan-form" disabled={generateLoanOfferMutation.isPending}>
                {generateLoanOfferMutation.isPending && <Skeleton className="mr-2 h-4 w-4 animate-spin"/>}
                Generate Offer
              </Button>
            )}
            {action?.type === 'review_loan' && (
              <Button type="submit" form="reviewloan-form" disabled={reviewLoanMutation.isPending}>
                {reviewLoanMutation.isPending && <Skeleton className="mr-2 h-4 w-4 animate-spin"/>}
                Mark Reviewed
              </Button>
            )}
            {action?.type === 'promote_item' && (
              <Button type="submit" form="promote-form" disabled={promoteItemMutation.isPending}>
                {promoteItemMutation.isPending && <Skeleton className="mr-2 h-4 w-4 animate-spin"/>}
                Promote Item
              </Button>
            )}
            {action?.type === 'market_property' && (
              <Button type="submit" form="market-property-form" disabled={marketPropertyMutation.isPending}>
                {marketPropertyMutation.isPending && <Skeleton className="mr-2 h-4 w-4 animate-spin"/>}
                Create Campaign
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}