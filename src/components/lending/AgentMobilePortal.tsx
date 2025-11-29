"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, 
  Search, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  DollarSign
} from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

// --- 1. Types & Schemas ---

// Validation Schema
const paymentSchema = z.object({
  borrowerId: z.string().min(1, "Borrower is required"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  notes: z.string().optional().default(''),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  borrower: {
    full_name: string;
    national_id?: string;
  } | null;
}

interface Borrower {
  id: string;
  full_name: string;
  national_id?: string;
}

// --- 2. Data Access Layer ---

const fetchBorrowers = async (tenantId: string, searchTerm: string = "") => {
  const supabase = createClient();
  let query = supabase
    .from('borrowers')
    .select('id, full_name, national_id')
    .eq('tenant_id', tenantId)
    .limit(20);

  if (searchTerm) {
    query = query.ilike('full_name', `%${searchTerm}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Borrower[];
};

const fetchRecentPayments = async (tenantId: string, agentId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('agent_payments')
    .select(`
      id, 
      amount, 
      date, 
      status, 
      borrower:borrowers ( full_name, national_id )
    `)
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .order('date', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as unknown as PaymentRecord[];
};

const submitPaymentTransaction = async ({ 
  tenantId, 
  agentId, 
  data, 
  location 
}: { 
  tenantId: string, 
  agentId: string, 
  data: PaymentFormValues,
  location?: { lat: number; lng: number }
}) => {
  const supabase = createClient();
  
  const { error } = await supabase.from('agent_payments').insert({
    tenant_id: tenantId,
    agent_id: agentId,
    borrower_id: data.borrowerId,
    amount: data.amount,
    date: new Date().toISOString(),
    status: 'PENDING',
    notes: data.notes || '',
    location_lat: location?.lat || null,
    location_lng: location?.lng || null,
    created_at: new Date().toISOString()
  });

  if (error) throw error;
};

// --- 3. Component ---

export function AgentMobilePortal({ tenantId, agentId }: { tenantId: string, agentId: string }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [location, setLocation] = React.useState<{lat: number, lng: number} | undefined>(undefined);
  const [isLocating, setIsLocating] = React.useState(false);

  // -- Queries --
  const { data: borrowers, isLoading: loadingBorrowers } = useQuery({
    queryKey: ['borrowers', tenantId, searchTerm],
    queryFn: () => fetchBorrowers(tenantId, searchTerm),
    enabled: true 
  });

  const { data: payments, isLoading: loadingPayments, isError } = useQuery({
    queryKey: ['agent-payments', tenantId, agentId],
    queryFn: () => fetchRecentPayments(tenantId, agentId),
    refetchInterval: 30000, 
  });

  // -- Form --
  // FIXED: Removed explicit <PaymentFormValues> to allow Zod coercion types to resolve correctly
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    reset,
    formState: { errors, isSubmitting } 
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { 
      amount: 0,
      borrowerId: '',
      notes: '' 
    }
  });

  const selectedBorrowerId = watch("borrowerId");
  
  // -- Geolocation --
  React.useEffect(() => {
    if ("geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setIsLocating(false);
        },
        (error) => {
          console.warn("Geolocation access denied or failed", error);
          setIsLocating(false);
        }
      );
    }
  }, []);

  // -- Mutation --
  const mutation = useMutation({
    mutationFn: (data: PaymentFormValues) => submitPaymentTransaction({ tenantId, agentId, data, location }),
    onSuccess: () => {
      toast.success("Payment collected successfully");
      reset({ amount: 0, notes: '', borrowerId: '' });
      queryClient.invalidateQueries({
        queryKey: ['agent-payments', tenantId, agentId]
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit payment");
    }
  });

  const onSubmit = (data: PaymentFormValues) => mutation.mutate(data);

  // -- Formatters --
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (dateStr: string) => 
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));

  return (
    <div className="max-w-md mx-auto w-full space-y-4 p-4 md:p-0">
      
      {/* 1. Header Card */}
      <Card className="bg-slate-900 text-white border-slate-800 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                Field Portal
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Lending Collection Interface
              </CardDescription>
            </div>
            {isLocating ? (
              <Badge variant="secondary" className="animate-pulse bg-blue-900/50 text-blue-200">
                <MapPin className="w-3 h-3 mr-1" /> Locating...
              </Badge>
            ) : location ? (
              <Badge variant="outline" className="border-green-800 bg-green-900/30 text-green-400">
                <MapPin className="w-3 h-3 mr-1" /> GPS Active
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-red-900/50 text-red-200">
                <MapPin className="w-3 h-3 mr-1" /> No GPS
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Session ID</span>
            <span className="font-mono text-slate-200">{agentId.slice(0,8)}...</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Collection Form */}
      <Card className="shadow-md border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle className="text-lg">Record Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Borrower Search/Select */}
            <div className="space-y-2">
              <Label>Borrower</Label>
              <Select 
                onValueChange={(val) => setValue("borrowerId", val)} 
                value={selectedBorrowerId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Borrower..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 sticky top-0 bg-white z-10 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        placeholder="Search name..." 
                        className="pl-8 h-9"
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()} 
                      />
                    </div>
                  </div>
                  {loadingBorrowers ? (
                    <div className="p-4 flex justify-center"><Loader2 className="animate-spin h-5 w-5 text-gray-400"/></div>
                  ) : borrowers && borrowers.length > 0 ? (
                    borrowers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{b.full_name}</span>
                          {b.national_id && <span className="text-xs text-gray-500">ID: {b.national_id}</span>}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">No borrowers found</div>
                  )}
                </SelectContent>
              </Select>
              {errors.borrowerId && <p className="text-red-500 text-xs font-medium">{errors.borrowerId.message as string}</p>}
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label>Amount Collected</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  className="pl-10 text-lg font-semibold"
                  {...register("amount")}
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs font-medium">{errors.amount.message as string}</p>}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-blue-700 hover:bg-blue-800 h-12 text-base font-semibold"
              disabled={isSubmitting || mutation.isPending}
            >
              {isSubmitting || mutation.isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
              ) : (
                "Submit Payment"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 3. Recent History List */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex justify-between items-center">
            <span>Today&apos;s Collections</span>
            {payments && (
              <Badge variant="secondary" className="ml-2">
                {payments.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {loadingPayments ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Syncing records...</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-red-500">
                <AlertCircle className="h-6 w-6" />
                <span className="text-sm">Failed to load history</span>
              </div>
            ) : payments?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                <Clock className="h-8 w-8 opacity-20" />
                <span className="text-sm">No collections yet today</span>
              </div>
            ) : (
              <div className="divide-y">
                {payments?.map((payment) => (
                  <div key={payment.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-gray-900">
                        {payment.borrower?.full_name || "Unknown Borrower"}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(payment.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(payment.amount)}</div>
                      <Badge 
                        variant={payment.status === 'CONFIRMED' ? 'default' : 'secondary'}
                        className={`mt-1 text-[10px] h-5 ${
                          payment.status === 'PENDING' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                          payment.status === 'CONFIRMED' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''
                        }`}
                      >
                         {payment.status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                         {payment.status === 'CONFIRMED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                         {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}