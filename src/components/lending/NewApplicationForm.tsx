'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

// Data fetching hooks
async function fetchFormPrerequisites() {
    const supabase = createClient();
    const { data: customers } = await supabase.from('customers').select('id, name');
    const { data: products } = await supabase.from('loan_products').select('id, name');
    return { customers: customers || [], products: products || [] };
}
async function runCreditCheck(customerId: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('perform_credit_check', { p_customer_id: customerId });
    if (error) throw error;
    return data;
}
async function createLoanApplication(appData: any) {
    const supabase = createClient();
    const { error } = await supabase.from('loan_applications').insert(appData);
    if (error) throw error;
}

export default function NewApplicationForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    // Form State
    const [selectedCustomer, setSelectedCustomer] = useState<{ value: number; label: string } | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<{ value: number; label: string } | null>(null);
    const [principalAmount, setPrincipalAmount] = useState(0);
    const [creditCheckResult, setCreditCheckResult] = useState<any | null>(null);

    const { data: prerequisites, isLoading: isLoadingPrereqs } = useQuery({ queryKey: ['loanFormPrereqs'], queryFn: fetchFormPrerequisites });
    const creditCheckMutation = useMutation({ mutationFn: runCreditCheck, onSuccess: setCreditCheckResult });
    const applicationMutation = useMutation({
        mutationFn: createLoanApplication,
        onSuccess: () => {
            toast.success("Loan application submitted successfully!");
            queryClient.invalidateQueries({ queryKey: ['loanApplications'] });
            router.push('/lending/applications');
        },
        onError: (error: any) => toast.error(`Submission failed: ${error.message}`),
    });

    const customerOptions = useMemo(() => prerequisites?.customers.map(c => ({ value: c.id, label: c.name })) || [], [prerequisites]);
    const productOptions = useMemo(() => prerequisites?.products.map(p => ({ value: p.id, label: p.name })) || [], [prerequisites]);

    const handleNextStep = () => {
        if (step === 1 && selectedCustomer) {
            creditCheckMutation.mutate(selectedCustomer.value);
            setStep(2);
        }
        if (step === 2 && creditCheckResult?.is_eligible) {
            setStep(3);
        }
    };
    
    const handleSubmit = () => {
        applicationMutation.mutate({
            customer_id: selectedCustomer!.value,
            loan_product_id: selectedProduct!.value,
            principal_amount: principalAmount,
            application_date: new Date().toISOString().split('T')[0],
        });
    };

    return (
        <Card className="max-w-3xl mx-auto">
            <CardHeader><CardTitle>New Loan Application</CardTitle></CardHeader>
            <CardContent>
                {/* Step 1: Select Customer */}
                {step === 1 && (
                    <div className="space-y-4">
                        <Label>Select Customer</Label>
                        <Select options={customerOptions} isLoading={isLoadingPrereqs} onChange={setSelectedCustomer} />
                        <Button onClick={handleNextStep} disabled={!selectedCustomer}>Next: Run Credit Check</Button>
                    </div>
                )}
                {/* Step 2: Credit Check */}
                {step === 2 && (
                    <div className="space-y-4 text-center">
                        <h3 className="font-semibold">Credit Check Results for {selectedCustomer?.label}</h3>
                        {creditCheckMutation.isPending && <p>Running credit check...</p>}
                        {creditCheckResult && (
                            <div>
                                <p>Credit Score: <Badge>{creditCheckResult.score}</Badge></p>
                                {creditCheckResult.is_eligible ? (
                                    <p className="text-green-600 font-bold">Customer is eligible to proceed.</p>
                                ) : (
                                    <p className="text-destructive font-bold">Customer is not eligible for a new loan at this time.</p>
                                )}
                            </div>
                        )}
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleNextStep} disabled={!creditCheckResult?.is_eligible}>Next: Loan Details</Button>
                        </div>
                    </div>
                )}
                {/* Step 3: Loan Details */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Loan Product</Label><Select options={productOptions} onChange={setSelectedProduct} /></div>
                            <div><Label>Principal Amount (UGX)</Label><Input type="number" onChange={e => setPrincipalAmount(Number(e.target.value))} /></div>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                            <Button onClick={handleSubmit} disabled={!selectedProduct || principalAmount <= 0 || applicationMutation.isPending}>
                                {applicationMutation.isPending ? "Submitting..." : "Submit Application"}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}