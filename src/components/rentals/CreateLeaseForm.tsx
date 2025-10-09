'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// FIXED: Define the shapes of the data we expect to fetch.
interface Unit {
    id: number;
    unit_label: string;
}

interface Customer {
    id: number;
    name: string;
}

interface LeaseFormPrereqs {
    units: Unit[];
    customers: Customer[];
}

async function fetchLeaseFormPrereqs(): Promise<LeaseFormPrereqs> {
    const supabase = createClient();
    const { data: units, error: unitsError } = await supabase.rpc('get_vacant_units');
    const { data: customers, error: customersError } = await supabase.from('customers').select('id, name');

    if (unitsError) throw unitsError;
    if (customersError) throw customersError;

    return { units: units || [], customers: customers || [] };
}

async function createNewLease(leaseData: any) {
    const supabase = createClient();
    const { error } = await supabase.rpc('create_new_lease', leaseData);
    if (error) throw error;
}

export default function CreateLeaseForm() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [tenantId, setTenantId] = useState<number | null>(null);
    const [unitId, setUnitId] = useState<number | null>(null);
    const [monthlyRent, setMonthlyRent] = useState(0);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>();

    const { data: prereqs, isLoading } = useQuery<LeaseFormPrereqs>({ queryKey: ['leaseFormPrereqs'], queryFn: fetchLeaseFormPrereqs });
    const mutation = useMutation({
        mutationFn: createNewLease,
        onSuccess: () => {
            toast.success("Lease created successfully!");
            queryClient.invalidateQueries({ queryKey: ['leases', 'propertiesWithUnits'] });
            router.push('/rentals/leases');
        },
        onError: (error: any) => toast.error(error.message),
    });

    // FIXED: Explicitly type the parameters in the map functions for full type safety.
    const tenantOptions = useMemo(() => prereqs?.customers.map((c: Customer) => ({ value: c.id, label: c.name })) || [], [prereqs]);
    const unitOptions = useMemo(() => prereqs?.units.map((u: Unit) => ({ value: u.id, label: u.unit_label })) || [], [prereqs]);

    const handleSubmit = () => {
        if (!unitId || !tenantId || !startDate || !endDate || monthlyRent <= 0) {
            return toast.error("Please fill all required fields.");
        }
        mutation.mutate({
            p_unit_id: unitId,
            p_tenant_id: tenantId,
            p_start_date: format(startDate, 'yyyy-MM-dd'),
            p_end_date: format(endDate, 'yyyy-MM-dd'),
            p_monthly_rent: monthlyRent,
        });
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div><Label>Tenant (Customer)</Label><Select options={tenantOptions} onChange={opt => setTenantId(opt?.value || null)} isLoading={isLoading} /></div>
                    <div><Label>Property / Unit</Label><Select options={unitOptions} onChange={opt => setUnitId(opt?.value || null)} isLoading={isLoading} /></div>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    <div><Label>Start Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start">{startDate ? format(startDate, "PPP") : "Pick a date"}<CalendarIcon className="ml-auto h-4 w-4" /></Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent></Popover></div>
                    <div><Label>End Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start">{endDate ? format(endDate, "PPP") : "Pick a date"}<CalendarIcon className="ml-auto h-4 w-4" /></Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent></Popover></div>
                    <div><Label>Monthly Rent (UGX)</Label><Input type="number" value={monthlyRent} onChange={e => setMonthlyRent(Number(e.target.value))} /></div>
                </div>
                <div className="flex justify-end">
                    <Button size="lg" onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending ? "Saving..." : "Create Lease Agreement"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}