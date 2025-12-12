'use client';

import React, { useState, useMemo } from "react";
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent 
} from "@/components/ui/card";
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from '@/components/ui/table';
import { 
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Search, X, Undo2, MoreHorizontal, CheckCircle, XCircle, Clock, FileText 
} from "lucide-react";

// 1. Strict Type Definition
export interface OrderReturn {
  id: string;
  returnNumber: string; // RMA Number
  orderNumber: string;
  customer: string;
  reason: string;
  requested: string;
  approvedBy: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  processedAt: string | null;
  entity: string;
  region: string;
  tenantId: string;
}

interface OrderReturnsProps {
  returns: OrderReturn[];
}

export function OrderReturnsWorkflow({ returns }: OrderReturnsProps) {
  const [filter, setFilter] = useState('');

  // 2. High-Performance Filtering
  const filtered = useMemo(() => {
    if (!filter) return returns;
    const lower = filter.toLowerCase();
    
    return returns.filter(r =>
        r.customer.toLowerCase().includes(lower) ||
        r.orderNumber.toLowerCase().includes(lower) ||
        r.returnNumber.toLowerCase().includes(lower) ||
        r.region.toLowerCase().includes(lower)
    );
  }, [returns, filter]);

  // 3. Status Badge Helper
  const getStatusBadge = (status: OrderReturn['status']) => {
    switch (status) {
        case 'completed': 
            return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle className="w-3 h-3 mr-1"/> Completed</Badge>;
        case 'approved': 
            return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">Approved</Badge>;
        case 'rejected': 
            return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>;
        default: 
            return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:text-yellow-400 dark:border-yellow-800"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
    }
  };

  return (
    <Card className="h-full border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Undo2 className="h-5 w-5 text-primary" />
                    Returns Workflow (RMA)
                </CardTitle>
                <CardDescription>
                  Track returns, approve RMA requests, and manage refunds globally.
                </CardDescription>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search RMA, Customer, or Region..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8"
                />
                {filter && (
                    <X 
                        className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                        onClick={() => setFilter("")}
                    />
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] rounded-md border">
            <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                <TableRow>
                <TableHead>RMA #</TableHead>
                <TableHead>Order Context</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Approver / Date</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        No return requests found.
                    </TableCell>
                </TableRow>
                ) : (
                filtered.map(r => (
                    <TableRow key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                        {/* RMA & Order Info */}
                        <TableCell className="font-medium font-mono text-xs">
                            {r.returnNumber}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col text-sm">
                                <span className="font-medium">{r.customer}</span>
                                <span className="text-xs text-muted-foreground font-mono">{r.orderNumber}</span>
                            </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>{getStatusBadge(r.status)}</TableCell>

                        {/* Reason */}
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={r.reason}>
                            {r.reason}
                        </TableCell>

                        {/* Dates */}
                        <TableCell className="whitespace-nowrap">{r.requested}</TableCell>
                        <TableCell>
                            <div className="flex flex-col text-xs">
                                {r.approvedBy ? (
                                    <>
                                        <span className="font-medium">{r.approvedBy}</span>
                                        <span className="text-muted-foreground">{r.processedAt}</span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </div>
                        </TableCell>

                        {/* Region & Entity */}
                        <TableCell>
                             <div className="flex flex-col text-xs">
                                <span>{r.region}</span>
                                <span className="text-muted-foreground">{r.entity}</span>
                            </div>
                        </TableCell>

                        {/* Actions Menu */}
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>
                                        <FileText className="mr-2 h-4 w-4" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled={r.status !== 'pending'}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Approve RMA
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={r.status !== 'pending'}>
                                        <XCircle className="mr-2 h-4 w-4 text-red-600" /> Reject RMA
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}