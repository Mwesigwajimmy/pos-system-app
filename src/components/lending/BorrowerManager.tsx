// src/components/lending/BorrowerManager.tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';

async function getBorrowers() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_all_borrowers');
    if (error) throw new Error(error.message);
    return data;
}

export default function BorrowerManager() {
    const { data: borrowers, isLoading } = useQuery({ queryKey: ['borrowers'], queryFn: getBorrowers });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>Borrower Accounts</CardTitle>
                        <CardDescription>Manage all individual borrowers for your microfinance or lending business.</CardDescription>
                    </div>
                    <Button><PlusCircle className="mr-2 h-4 w-4"/> New Borrower</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone Number</TableHead>
                                <TableHead>Email</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={3} className="h-24 text-center">Loading borrowers...</TableCell></TableRow>}
                            {borrowers?.map((borrower: any) => (
                                <TableRow key={borrower.id}>
                                    <TableCell className="font-medium">{borrower.name}</TableCell>
                                    <TableCell>{borrower.phone_number}</TableCell>
                                    <TableCell>{borrower.email}</TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && !borrowers?.length && <TableRow><TableCell colSpan={3} className="h-24 text-center">No borrowers registered yet.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}