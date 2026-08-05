'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import { PlusCircle, CalendarIcon, Check, Ship, DollarSign, Calculator } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

// --- TYPE DEFINITIONS ---
interface LoanApplication {
    id: number;
    application_date: string;
    status: string;
    principal_amount: number;
    customers: { name: string } | null;
    sacco_loan_products: { name: string } | null;
    // Optional fields — display only if loan_applications has these columns; safe to ignore otherwise.
    interest_rate?: number;
    duration_months?: number;
    repayment_frequency?: string;
    loan_purpose?: string;
    monthly_installment?: number;
    total_interest?: number;
    total_repayable?: number;
    is_group_loan?: boolean;
    group_name?: string;
    guarantor_name?: string;
    guarantor_phone?: string;
    collateral_type?: string;
}
interface SaccoMemberWithCustomer {
    id: bigint;
    customers: { id: bigint; name: string; }[];
}
interface SaccoLoanProduct {
    id: bigint;
    name: string;
    // Optional — used to auto-fill the interest rate when a product is picked.
    interest_rate?: number;
}

// --- ASYNC FUNCTIONS ---
// UNTOUCHED — select('*') already returns any new columns on loan_applications automatically.
async function fetchLoanApplications(): Promise<LoanApplication[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('loan_applications').select('*, customers(name), sacco_loan_products(name)');
    if (error) throw error;
    return data as LoanApplication[];
}

async function fetchFormPrerequisites() {
    const supabase = createClient();
    const { data: members, error: memberError } = await supabase.from('sacco_members').select('id, customers(id, name)');
    if (memberError) throw memberError;
    // Added `interest_rate` to the select list so the form can auto-fill a product's default
    // rate. If sacco_loan_products doesn't have this column, it will simply come back undefined.
    const { data: products, error: productError } = await supabase.from('sacco_loan_products').select('id, name, interest_rate');
    if (productError) throw productError;
    return { members: members as SaccoMemberWithCustomer[], products: products as SaccoLoanProduct[] };
}

// UNTOUCHED — same insert call into loan_applications. Extra fields are appended in
// handleSubmit below and will need matching columns on the table to persist.
async function createLoanApplication(data: any) {
    const supabase = createClient();
    const { error } = await supabase.from('loan_applications').insert(data);
    if (error) throw error;
}

// UNTOUCHED — RPC names and their param contracts are exactly as provided.
async function approveLoan(loanId: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc('approve_loan_application', { p_loan_application_id: loanId });
    if (error) throw error;
}
async function disburseLoan(loanId: number) {
    const supabase = createClient();
    const { error } = await supabase.rpc('disburse_approved_loan', { p_loan_application_id: loanId });
    if (error) throw error;
}
async function repayLoan(params: { loanId: number; amount: number }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('process_loan_repayment', { p_loan_application_id: params.loanId, p_amount: params.amount });
    if (error) throw error;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value || 0)}`;

// Standard reducing-balance (amortizing) loan calculation:
//   monthly rate r = annualRatePercent / 100 / 12
//   installment M = P * r * (1+r)^n / ((1+r)^n - 1)
// This is a display-only estimate for the applicant/loan officer; it is not sent to any
// RPC as an authoritative figure — actual schedules are confirmed at approval.
function calculateLoanEstimate(principal: number, annualRatePercent: number, months: number) {
    if (!principal || !annualRatePercent || !months || principal <= 0 || months <= 0) {
        return { monthlyInstallment: 0, totalInterest: 0, totalRepayable: 0 };
    }
    const r = annualRatePercent / 100 / 12;
    if (r === 0) {
        const monthlyInstallment = principal / months;
        return { monthlyInstallment, totalInterest: 0, totalRepayable: principal };
    }
    const factor = Math.pow(1 + r, months);
    const monthlyInstallment = (principal * r * factor) / (factor - 1);
    const totalRepayable = monthlyInstallment * months;
    const totalInterest = totalRepayable - principal;
    return { monthlyInstallment, totalInterest, totalRepayable };
}

const LOAN_PURPOSES = ['Business / Trade', 'Agriculture', 'Education', 'Medical', 'Home Improvement', 'Asset Purchase', 'Emergency', 'Other'];
const COLLATERAL_TYPES = ['None', 'Land Title', 'Vehicle Logbook', 'Household Chattels', 'Salary / Group Guarantee', 'Fixed Deposit / Shares', 'Other'];

export default function LoanApplicationsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isRepayOpen, setIsRepayOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
    const [applicationDate, setApplicationDate] = useState<Date>();
    const queryClient = useQueryClient();

    // Controlled fields needed to power the live repayment calculator.
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [principal, setPrincipal] = useState<string>('');
    const [interestRate, setInterestRate] = useState<string>('');
    const [duration, setDuration] = useState<string>('');
    const [loanPurpose, setLoanPurpose] = useState<string>('');
    const [isGroupLoan, setIsGroupLoan] = useState<string>('Individual');

    const { data: applications, isLoading } = useQuery({ queryKey: ['loanApplications'], queryFn: fetchLoanApplications });
    const { data: prereqs } = useQuery({ queryKey: ['loanAppPrereqs'], queryFn: fetchFormPrerequisites });

    const memberOptions = useMemo(() => prereqs?.members.filter(m => m.customers && m.customers.length > 0).map(m => ({ value: m.id.toString(), label: m.customers[0].name })) || [], [prereqs]);
    const productOptions = useMemo(() => prereqs?.products.map(p => ({ value: p.id.toString(), label: p.name, rate: p.interest_rate })) || [], [prereqs]);

    const estimate = useMemo(
        () => calculateLoanEstimate(Number(principal) || 0, Number(interestRate) || 0, Number(duration) || 0),
        [principal, interestRate, duration]
    );

    const resetCreateForm = () => {
        setApplicationDate(undefined);
        setSelectedProductId('');
        setPrincipal('');
        setInterestRate('');
        setDuration('');
        setLoanPurpose('');
        setIsGroupLoan('Individual');
    };

    const handleMutationSuccess = (message: string) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['loanApplications'] });
        queryClient.invalidateQueries({ queryKey: ['saccoDashboardKPIs'] });
        setIsCreateOpen(false);
        setIsDetailOpen(false);
        setIsRepayOpen(false);
        setSelectedLoan(null);
        resetCreateForm();
    };
    const handleMutationError = (error: any) => toast.error(`Operation failed: ${error.message}`);

    const createMutation = useMutation({ mutationFn: createLoanApplication, onSuccess: () => handleMutationSuccess("Loan application submitted!"), onError: handleMutationError });
    const approveMutation = useMutation({ mutationFn: approveLoan, onSuccess: () => handleMutationSuccess("Loan approved!"), onError: handleMutationError });
    const disburseMutation = useMutation({ mutationFn: disburseLoan, onSuccess: () => handleMutationSuccess("Loan disbursed!"), onError: handleMutationError });
    const repayMutation = useMutation({ mutationFn: repayLoan, onSuccess: () => handleMutationSuccess("Repayment logged!"), onError: handleMutationError });

    const handleProductChange = (value: string) => {
        setSelectedProductId(value);
        const product = productOptions.find(p => p.value === value);
        if (product?.rate !== undefined && product.rate !== null) {
            setInterestRate(String(product.rate));
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const purpose = loanPurpose === 'Other' ? (formData.get('loan_purpose_other') as string) : loanPurpose;

        createMutation.mutate({
            // Original fields — untouched keys/shape
            member_id: formData.get('member'),
            product_id: selectedProductId || formData.get('product'),
            principal_amount: principal,
            duration_months: duration,
            application_date: applicationDate ? format(applicationDate, 'yyyy-MM-dd') : new Date().toISOString(),

            // Loan terms
            interest_rate: interestRate ? Number(interestRate) : null,
            repayment_frequency: formData.get('repaymentFrequency'),
            loan_purpose: purpose,

            // Calculated estimate (stored for reference; actual schedule confirmed at approval)
            monthly_installment: estimate.monthlyInstallment || null,
            total_interest: estimate.totalInterest || null,
            total_repayable: estimate.totalRepayable || null,

            // Collateral / security
            collateral_type: formData.get('collateralType'),
            collateral_description: formData.get('collateralDescription'),

            // Guarantor
            guarantor_name: formData.get('guarantorName'),
            guarantor_phone: formData.get('guarantorPhone'),
            guarantor_national_id: formData.get('guarantorNationalId'),
            guarantor_relationship: formData.get('guarantorRelationship'),

            // Group loan details
            is_group_loan: isGroupLoan === 'Group',
            group_name: isGroupLoan === 'Group' ? formData.get('groupName') : null,
            group_registration_number: isGroupLoan === 'Group' ? formData.get('groupRegNumber') : null,
            group_member_count: isGroupLoan === 'Group' ? formData.get('groupMemberCount') : null,

            // Applicant address & affordability
            applicant_address: formData.get('applicantAddress'),
            applicant_district: formData.get('applicantDistrict'),
            monthly_income: formData.get('monthlyIncome'),
            employment_status: formData.get('employmentStatus'),
        });
    };

    const handleRepaySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        repayMutation.mutate({ loanId: selectedLoan!.id, amount: Number(formData.get('repay_amount')) });
    }

    const handleViewClick = (app: LoanApplication) => {
        setSelectedLoan(app);
        setIsDetailOpen(true);
    };

    return (
        <div className="container mx-auto space-y-6 py-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Loan Applications</h1>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetCreateForm(); }}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" />New Application</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
                        <DialogHeader>
                            <DialogTitle>New Loan Application</DialogTitle>
                            <DialogDescription>Capture full applicant, security, and repayment details.</DialogDescription>
                        </DialogHeader>

                        <form id="loanAppForm" onSubmit={handleSubmit} className="space-y-6 py-2">
                            {/* Applicant & Product */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Applicant &amp; Product</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="member">Member</Label>
                                    <Select name="member" required>
                                        <SelectTrigger id="member"><SelectValue placeholder="Select a member..." /></SelectTrigger>
                                        <SelectContent>
                                            {memberOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="product">Loan Product</Label>
                                    <Select name="product" required value={selectedProductId} onValueChange={handleProductChange}>
                                        <SelectTrigger id="product"><SelectValue placeholder="Select a product..." /></SelectTrigger>
                                        <SelectContent>
                                            {productOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            {/* Loan Terms */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Loan Terms</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Principal Amount (UGX)</Label>
                                        <Input
                                            id="amount"
                                            name="amount"
                                            type="number"
                                            required
                                            value={principal}
                                            onChange={e => setPrincipal(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="interestRate">Interest Rate (% per annum)</Label>
                                        <Input
                                            id="interestRate"
                                            name="interestRateInput"
                                            type="number"
                                            step="0.1"
                                            placeholder="e.g. 20"
                                            required
                                            value={interestRate}
                                            onChange={e => setInterestRate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (Months)</Label>
                                        <Input
                                            id="duration"
                                            name="duration"
                                            type="number"
                                            required
                                            value={duration}
                                            onChange={e => setDuration(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="repaymentFrequency">Repayment Frequency</Label>
                                        <Select name="repaymentFrequency" defaultValue="Monthly">
                                            <SelectTrigger id="repaymentFrequency"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Weekly">Weekly</SelectItem>
                                                <SelectItem value="Monthly">Monthly</SelectItem>
                                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="loanPurpose">Loan Purpose</Label>
                                    <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                                        <SelectTrigger id="loanPurpose"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent>
                                            {LOAN_PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {loanPurpose === 'Other' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="loan_purpose_other">Specify Purpose</Label>
                                        <Input id="loan_purpose_other" name="loan_purpose_other" placeholder="Describe the purpose of this loan" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Application Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {applicationDate ? format(applicationDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={applicationDate} onSelect={setApplicationDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Live repayment estimate */}
                            <div className="rounded-md border bg-slate-50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <Calculator className="h-4 w-4" />
                                    Estimated Repayment (reducing balance)
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <div className="text-xs text-muted-foreground">Monthly Installment</div>
                                        <div className="font-mono font-semibold">{formatCurrency(Math.round(estimate.monthlyInstallment))}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Total Interest</div>
                                        <div className="font-mono font-semibold">{formatCurrency(Math.round(estimate.totalInterest))}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Total Repayable</div>
                                        <div className="font-mono font-semibold">{formatCurrency(Math.round(estimate.totalRepayable))}</div>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Estimate only, based on a standard reducing-balance amortization at the rate and term entered above.
                                    The confirmed repayment schedule is generated at approval.
                                </p>
                            </div>

                            <Separator />

                            {/* Collateral / Security */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Collateral / Security</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="collateralType">Collateral Type</Label>
                                    <Select name="collateralType" defaultValue="None">
                                        <SelectTrigger id="collateralType"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {COLLATERAL_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="collateralDescription">Collateral Description / Estimated Value</Label>
                                    <Textarea id="collateralDescription" name="collateralDescription" rows={2} placeholder="Describe the item and its estimated value, if applicable" />
                                </div>
                            </div>

                            <Separator />

                            {/* Guarantor */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Guarantor</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="guarantorName">Full Name</Label>
                                        <Input id="guarantorName" name="guarantorName" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="guarantorRelationship">Relationship to Applicant</Label>
                                        <Input id="guarantorRelationship" name="guarantorRelationship" placeholder="e.g. Colleague, Relative" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="guarantorPhone">Phone Number</Label>
                                        <Input id="guarantorPhone" name="guarantorPhone" required placeholder="+256 7XX XXX XXX" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="guarantorNationalId">National ID / NIN</Label>
                                        <Input id="guarantorNationalId" name="guarantorNationalId" required />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Group Loan Details */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Loan Category</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="loanCategory">Individual or Group Loan</Label>
                                    <Select value={isGroupLoan} onValueChange={setIsGroupLoan}>
                                        <SelectTrigger id="loanCategory"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Individual">Individual</SelectItem>
                                            <SelectItem value="Group">Group</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {isGroupLoan === 'Group' && (
                                    <div className="space-y-4 rounded-md border p-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="groupName">Group Name</Label>
                                            <Input id="groupName" name="groupName" required />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="groupRegNumber">Group Registration No.</Label>
                                                <Input id="groupRegNumber" name="groupRegNumber" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="groupMemberCount">Number of Group Members</Label>
                                                <Input id="groupMemberCount" name="groupMemberCount" type="number" min="1" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Applicant Address & Affordability */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Applicant Address &amp; Affordability</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="applicantAddress">Physical Address</Label>
                                        <Input id="applicantAddress" name="applicantAddress" placeholder="Village, District, or Street" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="applicantDistrict">District</Label>
                                        <Input id="applicantDistrict" name="applicantDistrict" placeholder="e.g. Kampala" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="monthlyIncome">Monthly Income (UGX)</Label>
                                        <Input id="monthlyIncome" name="monthlyIncome" type="number" min="0" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="employmentStatus">Employment Status</Label>
                                        <Select name="employmentStatus">
                                            <SelectTrigger id="employmentStatus"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Employed">Employed</SelectItem>
                                                <SelectItem value="Self-Employed">Self-employed / Business owner</SelectItem>
                                                <SelectItem value="Farmer">Farmer</SelectItem>
                                                <SelectItem value="Unemployed">Unemployed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </form>

                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" form="loanAppForm" disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Submitting..." : "Submit Application"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Monthly Installment</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    Loading applications...
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && applications?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    No loan applications found.
                                </TableCell>
                            </TableRow>
                        )}
                        {applications?.map(app => (
                            <TableRow key={app.id}>
                                <TableCell className="align-middle">
                                    <div>{app.customers?.name || 'N/A'}</div>
                                    {app.is_group_loan && app.group_name && (
                                        <div className="text-[10px] text-muted-foreground">Group: {app.group_name}</div>
                                    )}
                                </TableCell>
                                <TableCell className="align-middle">{app.sacco_loan_products?.name || 'N/A'}</TableCell>
                                <TableCell className="align-middle text-right tabular-nums">{formatCurrency(app.principal_amount)}</TableCell>
                                <TableCell className="align-middle text-right tabular-nums">
                                    {app.interest_rate !== undefined ? `${app.interest_rate}%` : '—'}
                                </TableCell>
                                <TableCell className="align-middle text-right tabular-nums">
                                    {app.monthly_installment !== undefined ? formatCurrency(app.monthly_installment) : '—'}
                                </TableCell>
                                <TableCell className="align-middle whitespace-nowrap">{format(new Date(app.application_date), "PPP")}</TableCell>
                                <TableCell className="align-middle"><Badge>{app.status}</Badge></TableCell>
                                <TableCell className="align-middle text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleViewClick(app)}>View</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Loan Details & Actions Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Loan Details</DialogTitle>
                        <DialogDescription>{selectedLoan?.customers?.name} - {formatCurrency(selectedLoan?.principal_amount || 0)}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Current Status</span>
                            <Badge>{selectedLoan?.status}</Badge>
                        </div>
                        {selectedLoan?.interest_rate !== undefined && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Interest Rate</span>
                                <span className="font-mono">{selectedLoan.interest_rate}% p.a.</span>
                            </div>
                        )}
                        {selectedLoan?.duration_months !== undefined && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Duration</span>
                                <span className="font-mono">{selectedLoan.duration_months} months</span>
                            </div>
                        )}
                        {selectedLoan?.repayment_frequency && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Repayment Frequency</span>
                                <span>{selectedLoan.repayment_frequency}</span>
                            </div>
                        )}
                        {selectedLoan?.monthly_installment !== undefined && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Monthly Installment</span>
                                <span className="font-mono">{formatCurrency(selectedLoan.monthly_installment)}</span>
                            </div>
                        )}
                        {selectedLoan?.total_repayable !== undefined && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total Repayable</span>
                                <span className="font-mono">{formatCurrency(selectedLoan.total_repayable)}</span>
                            </div>
                        )}
                        {selectedLoan?.loan_purpose && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Purpose</span>
                                <span>{selectedLoan.loan_purpose}</span>
                            </div>
                        )}
                        {selectedLoan?.collateral_type && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Collateral</span>
                                <span>{selectedLoan.collateral_type}</span>
                            </div>
                        )}
                        {selectedLoan?.guarantor_name && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Guarantor</span>
                                <span>{selectedLoan.guarantor_name} {selectedLoan.guarantor_phone ? `(${selectedLoan.guarantor_phone})` : ''}</span>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {selectedLoan?.status === 'Pending' && (
                            <Button onClick={() => approveMutation.mutate(selectedLoan.id)} disabled={approveMutation.isPending}>
                                <Check className="mr-2 h-4 w-4" />{approveMutation.isPending ? "Approving..." : "Approve Loan"}
                            </Button>
                        )}
                        {selectedLoan?.status === 'Approved' && (
                            <Button onClick={() => disburseMutation.mutate(selectedLoan.id)} disabled={disburseMutation.isPending}>
                                <Ship className="mr-2 h-4 w-4" />{disburseMutation.isPending ? "Disbursing..." : "Disburse Funds"}
                            </Button>
                        )}
                        {selectedLoan?.status === 'Disbursed' && (
                            <Button onClick={() => { setIsDetailOpen(false); setIsRepayOpen(true); }}>
                                <DollarSign className="mr-2 h-4 w-4" />Log Repayment
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Repayment Dialog */}
            <Dialog open={isRepayOpen} onOpenChange={setIsRepayOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Log Repayment</DialogTitle>
                        <DialogDescription>Log a payment for {selectedLoan?.customers?.name}.</DialogDescription>
                    </DialogHeader>
                    <form id="repayForm" onSubmit={handleRepaySubmit} className="space-y-2 py-4">
                        <Label htmlFor="repay_amount">Amount Paid (UGX)</Label>
                        <Input id="repay_amount" name="repay_amount" type="number" required />
                    </form>
                    <DialogFooter>
                        <Button type="submit" form="repayForm" disabled={repayMutation.isPending}>
                            {repayMutation.isPending ? "Logging..." : "Confirm Payment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}