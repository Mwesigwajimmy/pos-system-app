'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Removed CardDescription as it's not used
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserPlus } from 'lucide-react'; // Removed Mail, Shield as they're not used
import { InviteAgentModal } from '@/components/management/InviteAgentModal';
import { Employee } from '@/types/dashboard';

export default function EmployeesPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // Fetch employees data
    const { data: employees, isLoading, error } = useQuery({
        queryKey: ['allEmployees'],
        queryFn: async () => {
            const { data, error: rpcError } = await supabase.rpc('get_all_employees_with_details');
            if (rpcError) {
                // It's good practice to toast errors from queries for user feedback
                toast.error('Failed to fetch employees', { description: rpcError.message });
                throw new Error(rpcError.message);
            }
            return data as Employee[];
        },
        // Optional: Add staleTime and refetchOnWindowFocus to manage caching behavior
        // staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
        // refetchOnWindowFocus: false, // Prevents refetching on window focus
    });

    // Handle global error state for the query
    if (error) {
        return <div className="p-4 text-destructive">Failed to load employees: {error.message}</div>;
    }

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
                        <p className="text-muted-foreground">Invite, view, and manage your team members.</p>
                    </div>
                    <Button onClick={() => setIsInviteModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Invite New Agent
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Your Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    // Show loader when data is being fetched
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : (employees && employees.length > 0) ? (
                                    // Render employees if data is available and the array is not empty
                                    employees.map((emp) => (
                                        <TableRow key={emp.id}>
                                            <TableCell className="font-medium">{emp.full_name}</TableCell>
                                            <TableCell>{emp.email}</TableCell>
                                            <TableCell className="capitalize">{emp.role}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 text-xs rounded-full ${emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {emp.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    // Show "No employees found" if data is empty or null after loading
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No employees found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <InviteAgentModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
        </>
    );
}