'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';

// --- Types ---
interface Prereqs {
  customers: { id: number; name: string; national_id: string }[];
  products: { id: number; name: string; max_amount: number; interest_rate: number }[];
}

interface CreditResult {
  is_eligible: boolean;
  score: number;
  reason?: string;
  max_eligible_amount: number;
}

// --- Schemas ---
const step1Schema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  productId: z.string().optional(), // Defined optional to satisfy type overlap
  amount: z.number().optional(),    // Defined optional to satisfy type overlap
});

const step2Schema = z.object({
  customerId: z.string().optional(), // Optional here as it's already set
  productId: z.string().min(1, "Product is required"),
  amount: z.coerce.number().min(1000, "Minimum amount is 1000"),
});

// Combined schema for the full form state type definition
const combinedSchema = z.object({
  customerId: z.string(),
  productId: z.string(),
  amount: z.number(),
});

type ApplicationFormValues = z.infer<typeof combinedSchema>;

// --- Data Fetching ---
async function fetchFormPrerequisites() {
    const supabase = createClient();
    const { data: customers, error: cErr } = await supabase.from('customers').select('id, name, national_id').eq('status', 'ACTIVE');
    const { data: products, error: pErr } = await supabase.from('loan_products').select('id, name, max_amount, interest_rate').eq('active', true);
    
    if(cErr) console.warn("Error fetching customers:", cErr);
    if(pErr) console.warn("Error fetching products:", pErr);
    
    return { customers: customers || [], products: products || [] };
}

async function runCreditCheck(customerId: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('perform_credit_check', { p_customer_id: customerId });
    if (error) throw error;
    return data as CreditResult;
}

async function createLoanApplication(data: ApplicationFormValues) {
    const supabase = createClient();
    const { error } = await supabase.from('loan_applications').insert({
      customer_id: parseInt(data.customerId),
      loan_product_id: parseInt(data.productId),
      principal_amount: data.amount,
      application_date: new Date().toISOString(),
      status: 'Pending'
    });
    if (error) throw error;
}

export default function NewApplicationForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [creditResult, setCreditResult] = useState<CreditResult | null>(null);

    // Queries
    const { data: prereqs, isLoading: loadingPrereqs } = useQuery({ 
        queryKey: ['loanFormPrereqs'], 
        queryFn: fetchFormPrerequisites 
    });

    // Mutations
    const creditMutation = useMutation({ 
        mutationFn: runCreditCheck, 
        onSuccess: (data) => setCreditResult(data),
        onError: (e: Error) => toast.error(e.message)
    });

    const submitMutation = useMutation({
        mutationFn: createLoanApplication,
        onSuccess: () => {
            toast.success("Application submitted!");
            queryClient.invalidateQueries({ queryKey: ['loanApplications'] });
            router.push('/lending/applications');
        },
        onError: (e: Error) => toast.error(e.message)
    });

    // Form Management
    const { control, watch, trigger, getValues, formState: { errors } } = useForm<ApplicationFormValues>({
        // FIX: Cast resolver to any to allow dynamic schema switching while keeping useForm strict
        resolver: zodResolver(step === 1 ? step1Schema : step2Schema) as any,
        defaultValues: { customerId: '', productId: '', amount: 0 },
        mode: 'onBlur'
    });

    const selectedCustomerId = watch('customerId');
    const selectedProductId = watch('productId');
    const selectedProduct = prereqs?.products.find(p => p.id.toString() === selectedProductId);

    // Handlers
    const handleNext = async () => {
        const isValid = await trigger();
        if (!isValid) return;

        if (step === 1) {
            creditMutation.mutate(parseInt(selectedCustomerId));
            setStep(2);
        } else if (step === 2) {
            submitMutation.mutate(getValues());
        }
    };

    if (loadingPrereqs) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary"/> Loading Form...</div>;

    return (
        <Card className="max-w-2xl mx-auto border-t-4 border-t-blue-600 shadow-lg">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    New Loan Application
                    <Badge variant="outline">Step {step} of 2</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* STEP 1: Customer Selection & Credit Check */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                        <div className="space-y-2">
                            <Label>Select Customer</Label>
                            <Controller
                                name="customerId"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Search customer..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {prereqs?.customers.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.name} ({c.national_id})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.customerId && <p className="text-sm text-red-500">{errors.customerId.message}</p>}
                        </div>
                    </div>
                )}

                {/* STEP 2: Product & Amount (Only if Credit Check Passed) */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        {/* Credit Result Display */}
                        {creditMutation.isPending ? (
                            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2"/>
                                <p className="text-sm text-muted-foreground">Analyzing credit worthiness...</p>
                            </div>
                        ) : creditResult ? (
                            <div className={`p-4 rounded-lg border ${creditResult.is_eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    {creditResult.is_eligible ? <CheckCircle2 className="text-green-600 h-6 w-6"/> : <XCircle className="text-red-600 h-6 w-6"/>}
                                    <h3 className="font-semibold text-lg">{creditResult.is_eligible ? "Credit Check Passed" : "Credit Check Failed"}</h3>
                                </div>
                                <div className="text-sm space-y-1 ml-9">
                                    <p>Credit Score: <b>{creditResult.score}</b></p>
                                    <p>Max Eligible Amount: <b>UGX {new Intl.NumberFormat().format(creditResult.max_eligible_amount)}</b></p>
                                    {!creditResult.is_eligible && <p className="text-red-600">Reason: {creditResult.reason}</p>}
                                </div>
                            </div>
                        ) : null}

                        {creditResult?.is_eligible && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Loan Product</Label>
                                        <Controller
                                            name="productId"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Product" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {prereqs?.products.map(p => (
                                                            <SelectItem key={p.id} value={p.id.toString()}>
                                                                {p.name} ({p.interest_rate}%)
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.productId && <p className="text-sm text-red-500">{errors.productId.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Amount (UGX)</Label>
                                        <Controller
                                            name="amount"
                                            control={control}
                                            render={({ field }) => (
                                                <Input 
                                                    type="number" 
                                                    {...field} 
                                                    onChange={e => field.onChange(parseFloat(e.target.value))}
                                                />
                                            )}
                                        />
                                        {selectedProduct && <p className="text-xs text-muted-foreground">Max: {selectedProduct.max_amount.toLocaleString()}</p>}
                                        {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

            </CardContent>
            <CardFooter className="flex justify-between">
                {step === 2 && (
                    <Button variant="outline" onClick={() => setStep(1)} disabled={submitMutation.isPending}>
                        <ArrowLeft className="mr-2 h-4 w-4"/> Back
                    </Button>
                )}
                {step === 1 ? (
                    <Button className="ml-auto" onClick={handleNext}>
                        Next: Check Credit <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                ) : (
                    <Button 
                        className="ml-auto bg-green-600 hover:bg-green-700" 
                        onClick={handleNext}
                        disabled={!creditResult?.is_eligible || submitMutation.isPending}
                    >
                        {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>}
                        Submit Application
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}