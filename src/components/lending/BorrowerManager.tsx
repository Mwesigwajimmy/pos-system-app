'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Loader2, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Borrower {
    id: string;
    name: string;
    phone_number: string;
    email: string;
    status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
}

async function getBorrowers() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_all_borrowers');
    if (error) throw new Error(error.message);
    return data as Borrower[];
}

export default function BorrowerManager() {
    const { data: borrowers, isLoading } = useQuery({ 
        queryKey: ['borrowers'], 
        queryFn: getBorrowers 
    });

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Borrower Accounts</CardTitle>
                    <CardDescription>Directory of all registered borrowers</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                    <PlusCircle className="h-4 w-4"/> New Borrower
                </Button>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="animate-spin h-4 w-4" /> Loading records...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : borrowers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-1">
                                            <UserX className="h-8 w-8 opacity-50" />
                                            <span>No borrowers found. Add one to get started.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                borrowers?.map((borrower) => (
                                    <TableRow key={borrower.id}>
                                        <TableCell className="font-medium">{borrower.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={borrower.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                {borrower.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{borrower.phone_number}</TableCell>
                                        <TableCell>{borrower.email || '-'}</TableCell>
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