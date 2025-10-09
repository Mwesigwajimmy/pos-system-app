'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

async function fetchAccounts() {
    const supabase = createClient();
    const { data, error } = await supabase.from('accounts').select('*').order('type').order('name');
    if (error) throw new Error(error.message);
    return data;
}

export default function ChartOfAccounts() {
    const { data: accounts, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts });
    return (
        <Card>
            <CardHeader><CardTitle>Chart of Accounts</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Account Name</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={2} className="text-center">Loading accounts...</TableCell></TableRow>}
                        {accounts?.map(acc => <TableRow key={acc.id}><TableCell>{acc.name}</TableCell><TableCell className="capitalize">{acc.type.toLowerCase()}</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}