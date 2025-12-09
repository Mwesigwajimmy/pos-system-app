'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    Loader2, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Search, User, CreditCard, AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

// --- Enterprise Types ---

interface BorrowerSearchResult {
  id: string;
  full_name: string;
  national_id: string;
  phone_number: string;
}

interface LoanProduct {
  id: string;
  name: string;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  interest_type: string;
  currency: string;
}

interface CreditCheckResult {
  is_eligible: boolean;
  risk_score: number; // 0-100
  risk_rating: 'Low' | 'Medium' | 'High' | 'Critical';
  max_eligible_amount: number;
  allowed_products: string[]; // IDs of products they qualify for
  disqualification_reason?: string;
}

// --- Schemas ---

// Step 1: Select Customer
const borrowerSchema = z.object({
  borrowerId: z.string().min(1, "Customer selection is required"),
});

// Step 2: Configure Loan
const loanConfigSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  term: z.coerce.number().min(1, "Term is required"),
  term_period: z.enum(["MONTHS", "WEEKS", "DAYS"]),
  purpose: z.string().min(5, "Loan purpose is required"),
});

// Combined for final submission
const submissionSchema = borrowerSchema.merge(loanConfigSchema);
type ApplicationFormValues = z.infer<typeof submissionSchema>;

// --- Fetchers ---

async function searchBorrowers(searchTerm: string, tenantId: string) {
    const supabase = createClient();
    if (!searchTerm || searchTerm.length < 2) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, national_id, phone_number')
        .eq('business_id', tenantId)
        .or(`full_name.ilike.%${searchTerm}%,national_id.ilike.%${searchTerm}%`)
        .limit(10);
    
    if (error) throw error;
    return data as BorrowerSearchResult[];
}

async function fetchActiveProducts(tenantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('loan_products')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'ACTIVE');
    
    if (error) throw error;
    return data as LoanProduct[]; // mapped to interface
}

async function runCreditCheck({ borrowerId, tenantId }: { borrowerId: string, tenantId: string }) {
    const supabase = createClient();
    // RPC call to Risk Engine (calculates debt-to-income, credit history, etc.)
    const { data, error } = await supabase.rpc('perform_credit_check', { 
        p_borrower_id: borrowerId,
        p_tenant_id: tenantId 
    });
    
    if (error) throw new Error(error.message);
    return data as CreditCheckResult;
}

async function submitApplication({ tenantId, data }: { tenantId: string, data: ApplicationFormValues }) {
    const supabase = createClient();
    const { error } = await supabase.from('loan_applications').insert({
        business_id: tenantId,
        borrower_id: data.borrowerId,
        product_id: data.productId,
        principal_amount: data.amount,
        loan_term: data.term,
        term_period: data.term_period,
        purpose: data.purpose,
        status: 'Pending', // Initial status
        // created_at handled by DB default
    });
    
    if (error) throw new Error(error.message);
}

// --- Component ---

export function NewApplicationForm({ tenantId }: { tenantId: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [step, setStep] = React.useState(1);
    
    // Borrower Search State
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedBorrower, setSelectedBorrower] = React.useState<BorrowerSearchResult | null>(null);

    // React Query
    const { data: searchResults, isLoading: searching } = useQuery({
        queryKey: ['borrower-search', searchTerm, tenantId],
        queryFn: () => searchBorrowers(searchTerm, tenantId),
        enabled: searchTerm.length >= 2,
    });

    const { data: products } = useQuery({
        queryKey: ['active-products', tenantId],
        queryFn: () => fetchActiveProducts(tenantId),
        staleTime: 1000 * 60 * 5 // 5 mins
    });

    // Mutations
    const creditCheckMutation = useMutation({
        mutationFn: runCreditCheck,
        onError: (e: Error) => toast.error(`Credit Check Failed: ${e.message}`)
    });

    const submitMutation = useMutation({
        mutationFn: (data: ApplicationFormValues) => submitApplication({ tenantId, data }),
        onSuccess: () => {
            toast.success("Application Submitted Successfully");
            queryClient.invalidateQueries({ queryKey: ['applications-list'] });
            router.push('/lending/applications');
        },
        onError: (e: Error) => toast.error(e.message)
    });

    const creditResult = creditCheckMutation.data;

    // Form
    const { control, register, handleSubmit, watch, formState: { errors }, setValue, trigger } = useForm<ApplicationFormValues>({
        // FIX: Cast to 'any' to handle dynamic step schemas. 
        // Also used 'submissionSchema' in step 2 to ensure borrowerId is preserved in the output.
        resolver: zodResolver(step === 1 ? borrowerSchema : submissionSchema) as any,
        defaultValues: {
            term: 1,
            term_period: 'MONTHS'
        }
    });

    // Watchers for dynamic validation
    const selectedProductId = watch('productId');
    const enteredAmount = watch('amount');
    const activeProduct = products?.find(p => p.id === selectedProductId);

    // Handlers
    const handleSelectBorrower = (borrower: BorrowerSearchResult) => {
        setSelectedBorrower(borrower);
        setValue('borrowerId', borrower.id);
        setSearchTerm(""); // Clear search to hide dropdown
    };

    const handleNext = async () => {
        const isValid = await trigger();
        if (!isValid) return;

        if (step === 1) {
            // Run credit check before moving to config
            if (selectedBorrower) {
                creditCheckMutation.mutate({ borrowerId: selectedBorrower.id, tenantId });
                setStep(2);
            }
        } else {
            // Final submission
            // Enterprise Validation: Double Check Amount vs Limits
            if (creditResult && enteredAmount > creditResult.max_eligible_amount) {
                toast.error(`Amount exceeds customer's credit limit of ${formatCurrency(creditResult.max_eligible_amount)}`);
                return;
            }
            if (activeProduct && (enteredAmount < activeProduct.min_amount || enteredAmount > activeProduct.max_amount)) {
                toast.error(`Amount is outside product limits`);
                return;
            }
            
            handleSubmit((data) => submitMutation.mutate(data))();
        }
    };

    return (
        <Card className="max-w-3xl mx-auto shadow-lg border-t-4 border-t-blue-600">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>New Loan Application</CardTitle>
                        <CardDescription>Originate a new facility for an existing borrower.</CardDescription>
                    </div>
                    <Badge variant="outline" className="px-3 py-1">Step {step} of 2</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* --- STEP 1: Borrower & Credit Check --- */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                        {/* Borrower Search */}
                        <div className="space-y-2 relative">
                            <Label>Find Borrower</Label>
                            {!selectedBorrower ? (
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input 
                                        placeholder="Search by Name or National ID..." 
                                        className="pl-9 h-12"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-600"/>}
                                    
                                    {/* Dropdown Results */}
                                    {searchResults && searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {searchResults.map((b) => (
                                                <div 
                                                    key={b.id}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                                                    onClick={() => handleSelectBorrower(b)}
                                                >
                                                    <div>
                                                        <p className="font-medium">{b.full_name}</p>
                                                        <p className="text-xs text-muted-foreground">{b.national_id}</p>
                                                    </div>
                                                    <Badge variant="secondary" className="text-xs">Select</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 border rounded-md bg-blue-50/50 border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                            {selectedBorrower.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-blue-900">{selectedBorrower.full_name}</p>
                                            <p className="text-xs text-blue-600 flex items-center gap-2">
                                                <span>ID: {selectedBorrower.national_id}</span>
                                                <span>•</span>
                                                <span>{selectedBorrower.phone_number}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedBorrower(null)}>Change</Button>
                                </div>
                            )}
                            <input type="hidden" {...register('borrowerId')} />
                            {errors.borrowerId && <p className="text-sm text-red-500">{errors.borrowerId.message}</p>}
                        </div>
                    </div>
                )}

                {/* --- STEP 2: Product & Terms --- */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        
                        {/* Credit Check Result Panel */}
                        {creditCheckMutation.isPending ? (
                             <div className="p-8 text-center border rounded-lg bg-slate-50">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                                <p className="text-sm text-muted-foreground">Running automated risk assessment...</p>
                             </div>
                        ) : creditResult ? (
                            <div className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 justify-between items-start ${creditResult.is_eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex gap-3">
                                    {creditResult.is_eligible ? <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0"/> : <XCircle className="h-6 w-6 text-red-600 shrink-0"/>}
                                    <div>
                                        <h4 className={`font-bold ${creditResult.is_eligible ? 'text-green-800' : 'text-red-800'}`}>
                                            {creditResult.is_eligible ? 'Credit Check Passed' : 'Not Eligible'}
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {creditResult.is_eligible 
                                                ? `Approved for financing up to limit.` 
                                                : `Reason: ${creditResult.disqualification_reason}`}
                                        </p>
                                    </div>
                                </div>
                                {creditResult.is_eligible && (
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Credit Limit</p>
                                        <p className="text-xl font-bold text-green-700">{formatCurrency(creditResult.max_eligible_amount)}</p>
                                        <Badge variant="outline" className="mt-1 bg-white">Score: {creditResult.risk_score}/100</Badge>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Config Form (Only if Eligible) */}
                        {creditResult?.is_eligible && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Loan Product</Label>
                                        <Controller
                                            name="productId"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Product..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products?.filter(p => creditResult.allowed_products.includes(p.id)).map(p => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.name} ({p.interest_rate}% {p.interest_type})
                                                            </SelectItem>
                                                        ))}
                                                        {(!products || products.length === 0) && <div className="p-2 text-sm text-gray-500">No products available</div>}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.productId && <p className="text-xs text-red-500">{errors.productId.message}</p>}
                                        
                                        {activeProduct && (
                                            <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded mt-1">
                                                Limits: {formatCurrency(activeProduct.min_amount)} - {formatCurrency(activeProduct.max_amount)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Principal Amount</Label>
                                        <div className="relative">
                                            <Input type="number" {...register('amount')} className="pl-8" />
                                            <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                        </div>
                                        {/* Real-time validation message */}
                                        {enteredAmount > creditResult.max_eligible_amount && (
                                            <p className="text-xs text-red-600 flex items-center mt-1">
                                                <AlertTriangle className="h-3 w-3 mr-1"/> Exceeds credit limit
                                            </p>
                                        )}
                                        {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Term</Label>
                                            <Input type="number" {...register('term')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Period</Label>
                                            <Controller
                                                name="term_period"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="WEEKS">Weeks</SelectItem>
                                                            <SelectItem value="MONTHS">Months</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Purpose of Loan</Label>
                                        <Input placeholder="e.g. Business Inventory Restock" {...register('purpose')} />
                                        {errors.purpose && <p className="text-xs text-red-500">{errors.purpose.message}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            
            <CardFooter className="flex justify-between bg-slate-50 p-6 rounded-b-lg">
                {step === 2 && (
                    <Button variant="outline" onClick={() => setStep(1)} disabled={submitMutation.isPending}>
                        <ArrowLeft className="mr-2 h-4 w-4"/> Change Borrower
                    </Button>
                )}
                
                {step === 1 ? (
                    <Button 
                        className="ml-auto" 
                        onClick={handleNext}
                        disabled={!selectedBorrower}
                    >
                        Check Eligibility <ArrowRight className="ml-2 h-4 w-4"/>
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