'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, CheckCircle, MoreHorizontal, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { updateLeaveRequestStatus } from '@/lib/hr/actions/leave';

// Define the shape of our team leave request data
export interface TeamLeaveRequest {
    id: string;
    start_date: string;
    end_date: string;
    employee_name: string;
    leave_type_name: string;
}

// Helper to calculate duration
const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
};


// A small, dedicated component to handle the action buttons and their pending states.
function ActionButtons({ request, managerId }: { request: TeamLeaveRequest, managerId: string }) {
    const { toast } = useToast();
    const { pending } = useFormStatus();

    const handleAction = async (formData: FormData) => {
        const requestId = formData.get('requestId') as string;
        const status = formData.get('status') as 'APPROVED' | 'REJECTED';
        
        const result = await updateLeaveRequestStatus(requestId, status, managerId);

        if (result.success) {
            toast({
                title: 'Success',
                description: `Request has been ${status.toLowerCase()}.`,
            });
        } else {
            toast({
                title: 'Error',
                description: result.error,
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="flex space-x-2">
            <form action={handleAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="status" value="APPROVED" />
                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700" disabled={pending}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
            </form>
            <form action={handleAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="status" value="REJECTED" />
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" disabled={pending}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
            </form>
        </div>
    );
}


// Define the columns for the data table
export const columns = (managerId: string): ColumnDef<TeamLeaveRequest>[] => [
    {
        accessorKey: 'employee_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Employee
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <span>{row.original.employee_name}</span>,
    },
    {
        accessorKey: 'leave_type_name',
        header: 'Leave Type',
    },
    {
        accessorKey: 'start_date',
        header: 'Dates',
        cell: ({ row }) => `${new Date(row.original.start_date).toLocaleDateString()} - ${new Date(row.original.end_date).toLocaleDateString()}`,
    },
    {
        id: 'duration',
        header: 'Duration',
        cell: ({ row }) => calculateDuration(row.original.start_date, row.original.end_date),
    },
    {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => <ActionButtons request={row.original} managerId={managerId} />,
    },
];

interface TeamLeaveRequestsTableProps {
    requests: TeamLeaveRequest[];
    managerId: string;
}

export function TeamLeaveRequestsTable({ requests, managerId }: TeamLeaveRequestsTableProps) {
    const table = useReactTable({
        data: requests,
        columns: columns(managerId),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Team Requests</CardTitle>
                <CardDescription>Review and respond to pending leave requests from your team.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns(managerId).length} className="h-24 text-center">
                                        No pending team requests.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                        Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                        Next
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}