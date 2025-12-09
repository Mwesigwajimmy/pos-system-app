'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription 
} from "@/components/ui/card";
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  Plus, Loader2, Ban, CheckCircle, Percent, Settings, AlertTriangle 
} from "lucide-react";

// --- Enterprise Types & Validation ---

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z.string().min(2, "Product code required (e.g., PL-001)"), // Critical for accounting
  interest_type: z.enum(["FLAT", "REDUCING_BALANCE"]),
  interest_rate: z.coerce.number().min(0.1, "Rate must be positive"),
  interest_period: z.enum(["MONTHLY", "ANNUALLY"]).default("MONTHLY"),
  term: z.coerce.number().min(1, "Term must be at least 1"),
  term_period: z.enum(["DAYS", "WEEKS", "MONTHS"]).default("MONTHS"),
  min_amt: z.coerce.number().min(0),
  max_amt: z.coerce.number().min(0),
  currency: z.string().default("UGX"),
  // Advanced Settings
  penalty_rate: z.coerce.number().optional().default(0),
  penalty_grace_period: z.coerce.number().optional().default(0),
  processing_fee_flat: z.coerce.number().optional().default(0),
  processing_fee_percent: z.coerce.number().optional().default(0),
  requires_guarantors: z.boolean().default(false),
  requires_collateral: z.boolean().default(false),
}).refine(data => data.max_amt >= data.min_amt, {
  message: "Max amount cannot be less than Min amount",
  path: ["max_amt"],
});

type ProductFormValues = z.infer<typeof productSchema>;

interface LoanProduct {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  interest_type: "FLAT" | "REDUCING_BALANCE";
  interest_rate: number;
  interest_period: string;
  term: number;
  term_period: string;
  min_amt: number;
  max_amt: number;
  currency: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  active_loans_count?: number; // Fetched via aggregation
  created_at: string;
}

// --- API Functions ---

async function fetchLoanProducts(tenantId: string) {
  const supabase = createClient();
  // We use a View or join to get the active_loans_count
  const { data, error } = await supabase
    .from('loan_products')
    .select('*, active_loans:loan_applications(count)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  // Transform count
  return data.map((p: any) => ({
      ...p,
      active_loans_count: p.active_loans?.[0]?.count || 0
  })) as LoanProduct[];
}

async function createLoanProduct({ tenantId, data }: { tenantId: string; data: ProductFormValues }) {
  const supabase = createClient();
  const { error } = await supabase.from('loan_products').insert({
    tenant_id: tenantId,
    ...data,
    status: 'ACTIVE'
  });

  if (error) throw new Error(error.message);
}

async function updateProductStatus({ id, status, activeLoans }: { id: string, status: string, activeLoans: number }) {
  if (status === 'INACTIVE' && activeLoans > 0) {
    // Enterprise Check: Don't disable products with active dependencies blindly
    // But we allow it with a warning (handled in UI)
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('loan_products')
    .update({ status })
    .eq('id', id);
  
  if (error) throw new Error(error.message);
}

// --- Component ---

export function LoanProductsManager({ tenantId }: { tenantId: string }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = React.useState<LoanProduct | null>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({ 
    queryKey: ['loan-products', tenantId], 
    queryFn: () => fetchLoanProducts(tenantId) 
  });

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProductFormValues>({
    // FIX: Cast resolver to 'any' to bypass TS mismatch caused by .refine() in Zod schema
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '', code: '',
      interest_type: 'FLAT', interest_rate: 5, 
      interest_period: 'MONTHLY', // FIX: Was 'MONTHS', changed to 'MONTHLY' to match schema
      term: 12, term_period: 'MONTHS',
      min_amt: 100000, max_amt: 5000000, currency: 'UGX',
      penalty_rate: 2, penalty_grace_period: 5,
      requires_guarantors: true
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductFormValues) => createLoanProduct({ tenantId, data }),
    onSuccess: () => {
      toast.success('Product Configuration Saved');
      queryClient.invalidateQueries({ queryKey: ['loan-products', tenantId] });
      setIsDialogOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const statusMutation = useMutation({
    mutationFn: (p: LoanProduct) => updateProductStatus({ 
        id: p.id, 
        status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        activeLoans: p.active_loans_count || 0
    }),
    onSuccess: () => {
      toast.success('Product status updated');
      queryClient.invalidateQueries({ queryKey: ['loan-products', tenantId] });
      setConfirmDeactivate(null);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const onSubmit = (data: ProductFormValues) => createMutation.mutate(data);

  return (
    <Card className="w-full border-t-4 border-t-primary">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Loan Products Configuration</CardTitle>
          <CardDescription>Define interest logic, limits, and compliance rules.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure New Loan Product</DialogTitle>
              <DialogDescription>Set up the financial parameters for this facility.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
                
              <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">Basic Terms</TabsTrigger>
                      <TabsTrigger value="advanced">Fees & Compliance</TabsTrigger>
                  </TabsList>

                  {/* Basic Terms Tab */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Product Name</Label>
                            <Input placeholder="e.g. SME Booster" {...register('name')} />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Product Code</Label>
                            <Input placeholder="e.g. SME-001" {...register('code')} className="uppercase font-mono" />
                            {errors.code && <p className="text-red-500 text-xs">{errors.code.message}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="space-y-2">
                          <Label>Interest Logic</Label>
                          <Select onValueChange={(val: any) => setValue('interest_type', val)} defaultValue="FLAT">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FLAT">Flat Rate</SelectItem>
                              <SelectItem value="REDUCING_BALANCE">Reducing Balance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Rate (%)</Label>
                          <div className="relative">
                             <Input type="number" step="0.01" {...register('interest_rate')} className="pl-6"/>
                             <Percent className="absolute left-2 top-2.5 h-3 w-3 text-gray-500"/>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Per</Label>
                          <Select onValueChange={(val: any) => setValue('interest_period', val)} defaultValue="MONTHS">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MONTHLY">Month</SelectItem>
                              <SelectItem value="ANNUALLY">Year</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Min Principal ({watch('currency')})</Label>
                          <Input type="number" {...register('min_amt')} />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Principal ({watch('currency')})</Label>
                          <Input type="number" {...register('max_amt')} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Max Term Length</Label>
                          <Input type="number" {...register('term')} />
                        </div>
                        <div className="space-y-2">
                          <Label>Term Unit</Label>
                          <Select onValueChange={(val: any) => setValue('term_period', val)} defaultValue="MONTHS">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="WEEKS">Weeks</SelectItem>
                              <SelectItem value="MONTHS">Months</SelectItem>
                              <SelectItem value="YEARS">Years</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                  </TabsContent>

                  {/* Advanced Tab */}
                  <TabsContent value="advanced" className="space-y-4 mt-4">
                      <div className="space-y-4 border rounded-md p-4">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500"/> Late Payment Penalties
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label>Penalty Rate (%)</Label>
                                  <Input type="number" step="0.1" {...register('penalty_rate')} />
                                  <p className="text-[10px] text-muted-foreground">Applied on overdue principal</p>
                              </div>
                              <div className="space-y-2">
                                  <Label>Grace Period (Days)</Label>
                                  <Input type="number" {...register('penalty_grace_period')} />
                                  <p className="text-[10px] text-muted-foreground">Days before penalty kicks in</p>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4 border rounded-md p-4">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                              <Settings className="h-4 w-4 text-slate-500"/> Processing Fees
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label>Flat Fee</Label>
                                  <Input type="number" {...register('processing_fee_flat')} />
                              </div>
                              <div className="space-y-2">
                                  <Label>% of Principal</Label>
                                  <Input type="number" step="0.1" {...register('processing_fee_percent')} />
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center justify-between border p-3 rounded-md">
                          <div className="space-y-0.5">
                              <Label className="text-base">Guarantors Required</Label>
                              <p className="text-xs text-muted-foreground">Borrower must add guarantors to apply</p>
                          </div>
                          <Switch onCheckedChange={(chk) => setValue('requires_guarantors', chk)} defaultChecked={watch('requires_guarantors')} />
                      </div>
                  </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Save Product
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Interest Model</TableHead>
                <TableHead>Term</TableHead>
                <TableHead className="text-right">Active Loans</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading products...</TableCell></TableRow>
              ) : products?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No active products found.</TableCell></TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                          <span className="text-sm">{product.interest_rate}% / {product.interest_period === 'MONTHLY' ? 'Mo' : 'Yr'}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{product.interest_type.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{product.term} {product.term_period.toLowerCase()}</TableCell>
                    <TableCell className="text-right font-medium">
                        {product.active_loans_count}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={product.status === 'ACTIVE' ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}
                        onClick={() => {
                            if (product.status === 'ACTIVE' && (product.active_loans_count || 0) > 0) {
                                setConfirmDeactivate(product); // Trigger warning dialog
                            } else {
                                statusMutation.mutate(product);
                            }
                        }}
                        disabled={statusMutation.isPending}
                      >
                        {product.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </CardContent>

      {/* Warning Dialog for Deactivation */}
      <Dialog open={!!confirmDeactivate} onOpenChange={(open) => !open && setConfirmDeactivate(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5"/> Warning: Active Loans Linked
                  </DialogTitle>
                  <DialogDescription>
                      This product (<strong>{confirmDeactivate?.name}</strong>) has <strong>{confirmDeactivate?.active_loans_count}</strong> active loans.
                      <br/><br/>
                      Deactivating it prevents NEW applications, but existing loans will continue to operate under these terms. Are you sure?
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmDeactivate(null)}>Cancel</Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                        if (confirmDeactivate) statusMutation.mutate(confirmDeactivate);
                    }}
                  >
                      Confirm Deactivation
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </Card>
  );
}