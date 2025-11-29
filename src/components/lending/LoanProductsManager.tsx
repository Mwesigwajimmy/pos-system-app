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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Plus, Loader2, Ban, CheckCircle, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// --- 1. Schemas & Types ---

// Schema for CREATING a product (No ID required yet)
const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  interest_type: z.enum(["FLAT", "REDUCING_BALANCE"]),
  interest_rate: z.coerce.number().min(0.1, "Rate must be positive"),
  term: z.coerce.number().min(1, "Term must be at least 1"),
  term_period: z.enum(["DAYS", "WEEKS", "MONTHS"]).default("MONTHS"),
  min_amt: z.coerce.number().min(0),
  max_amt: z.coerce.number().min(0),
  currency: z.string().default("UGX"),
}).refine(data => data.max_amt >= data.min_amt, {
  message: "Max amount cannot be less than Min amount",
  path: ["max_amt"],
});

// Type for the Form
type ProductFormValues = z.infer<typeof productSchema>;

// Type for the Database Record (Includes ID, Dates, etc.)
interface LoanProduct {
  id: string;
  tenant_id: string;
  name: string;
  interest_type: "FLAT" | "REDUCING_BALANCE";
  interest_rate: number;
  term: number;
  term_period: string;
  min_amt: number;
  max_amt: number;
  status: "ACTIVE" | "INACTIVE";
  currency: string;
  created_at: string;
}

// --- 2. API Functions ---

async function fetchProducts(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('loan_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as LoanProduct[];
}

// This function accepts the FORM values, not the full DB object
async function createProduct({ tenantId, data }: { tenantId: string; data: ProductFormValues }) {
  const supabase = createClient();
  const { error } = await supabase.from('loan_products').insert({
    tenant_id: tenantId,
    name: data.name,
    interest_type: data.interest_type,
    interest_rate: data.interest_rate,
    term: data.term,
    term_period: data.term_period,
    min_amt: data.min_amt,
    max_amt: data.max_amt,
    currency: data.currency,
    status: 'ACTIVE' // Default status
  });

  if (error) throw error;
}

async function toggleProductStatus(id: string, currentStatus: string) {
  const supabase = createClient();
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const { error } = await supabase
    .from('loan_products')
    .update({ status: newStatus })
    .eq('id', id);
  
  if (error) throw error;
}

// --- 3. Component ---

export function LoanProductsManager({ tenantId }: { tenantId: string }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const queryClient = useQueryClient();

  // Query
  const { data: products, isLoading } = useQuery({ 
    queryKey: ['loan-products', tenantId], 
    queryFn: () => fetchProducts(tenantId) 
  });

  // Form
  // FIXED: Removed explicit <ProductFormValues> generic
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      interest_type: 'FLAT',
      interest_rate: 5,
      term: 1,
      term_period: 'MONTHS',
      min_amt: 0,
      max_amt: 1000000,
      currency: 'UGX'
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: ProductFormValues) => createProduct({ tenantId, data }),
    onSuccess: () => {
      toast.success('Loan Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['loan-products', tenantId] });
      setIsDialogOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create product')
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: (product: LoanProduct) => toggleProductStatus(product.id, product.status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['loan-products', tenantId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const onSubmit = (data: ProductFormValues) => createMutation.mutate(data);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Loan Products</CardTitle>
          <CardDescription>Configure the loan types available to your borrowers.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Loan Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input placeholder="e.g. Small Business Starter" {...register('name')} />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message as string}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interest Type</Label>
                  <Select onValueChange={(val: any) => setValue('interest_type', val)} defaultValue="FLAT">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT">Flat Rate</SelectItem>
                      <SelectItem value="REDUCING_BALANCE">Reducing Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (%)</Label>
                  <div className="relative">
                    <Input type="number" step="0.1" {...register('interest_rate')} className="pl-8" />
                    <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  </div>
                  {errors.interest_rate && <p className="text-red-500 text-xs">{errors.interest_rate.message as string}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input type="number" {...register('term')} />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select onValueChange={(val: any) => setValue('term_period', val)} defaultValue="MONTHS">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAYS">Days</SelectItem>
                      <SelectItem value="WEEKS">Weeks</SelectItem>
                      <SelectItem value="MONTHS">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Amount ({watch('currency')})</Label>
                  <Input type="number" {...register('min_amt')} />
                </div>
                <div className="space-y-2">
                  <Label>Max Amount ({watch('currency')})</Label>
                  <Input type="number" {...register('max_amt')} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Product
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                    No loan products defined yet.
                  </TableCell>
                </TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {product.interest_rate}% <span className="text-xs text-muted-foreground">({product.interest_type})</span>
                    </TableCell>
                    <TableCell>
                      {product.term} {product.term_period.toLowerCase()}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {formatCurrency(product.min_amt, product.currency)} - {formatCurrency(product.max_amt, product.currency)}
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
                        className={product.status === 'ACTIVE' ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                        onClick={() => toggleMutation.mutate(product)}
                        disabled={toggleMutation.isPending}
                      >
                        {product.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
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