'use client';

/**
 * --- BBU1 SOVEREIGN E-COMMERCE ORDER MANAGEMENT CENTER ---
 * VERSION: v11.0 OMEGA (REALTIME ONLINE ORDER & FULFILLMENT ENGINE)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Digital Commerce
 */

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { 
    ArrowUpDown, Eye, Truck, CheckCircle2, 
    Package, XCircle, AlertCircle, Filter, 
    Check, Printer, Download, Loader2, Share2, 
    DollarSign, Globe, Building2, User, Mail, 
    MapPin, CreditCard, Sparkles, Clock, ShoppingBag, Lock
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const supabase = createClient();

// --- TYPES ---
interface Customer { 
    id: string; 
    name: string; 
    email?: string;
    phone?: string;
}

export interface OrderItem {
    id: string;
    product_id: number;
    quantity: number;
    price_at_purchase: number;
    product_name?: string;
}

export interface Order {
    id: string;
    order_uid: string;
    status: 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
    total_amount: number;
    currency_code?: string;
    payment_gateway?: string;
    customer_email?: string;
    shipping_address?: any;
    created_at: string;
    customers: Customer | null;
    items?: OrderItem[];
}

// --- CONFIG ---
export const statuses = [
    { value: "PENDING", label: "Pending", icon: Package },
    { value: "PAID", label: "Paid", icon: CheckCircle2 },
    { value: "SHIPPED", label: "Shipped", icon: Truck },
    { value: "COMPLETED", label: "Completed", icon: CheckCircle2 },
    { value: "CANCELLED", label: "Cancelled", icon: XCircle },
];

const getStatusColor = (status: Order['status']) => {
    switch (status) {
        case 'COMPLETED': return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case 'PAID': return "bg-blue-100 text-blue-800 border-blue-200";
        case 'SHIPPED': return "bg-purple-100 text-purple-800 border-purple-200";
        case 'CANCELLED': return "bg-rose-100 text-rose-800 border-rose-200";
        default: return "bg-amber-100 text-amber-800 border-amber-200";
    }
};

// --- MAIN COMPONENT ---
export function OrderList({ orders: propOrders }: { orders?: Order[] }) {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = useState({});

    // ORDER DETAILS MODAL STATE
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // 1. DATA: Identity Context & Currency
    const { data: profile } = useQuery({
        queryKey: ['active_profile_order_list'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
            return data;
        }
    });

    const businessCurrency = profile?.currency || 'UGX';
    const activeBusinessId = profile?.business_id;

    // 2. DATA: Real-Time Live Online Orders Query
    const { data: liveOrders, isLoading } = useQuery({
        queryKey: ['live_online_orders', activeBusinessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('online_orders')
                .select(`
                    *,
                    customers ( id, name, email, phone ),
                    online_order_items ( id, product_id, quantity, price_at_purchase )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((o: any) => ({
                id: o.id,
                order_uid: o.order_uid || `ORD-${o.id.substring(0,6)}`,
                status: (o.status?.toUpperCase() || 'PENDING') as Order['status'],
                total_amount: Number(o.total_amount || 0),
                currency_code: o.currency_code || businessCurrency,
                payment_gateway: o.payment_gateway || 'Mobile Money',
                customer_email: o.customer_email,
                shipping_address: o.shipping_address,
                created_at: o.created_at,
                customers: o.customers || (o.customer_email ? { id: '0', name: o.customer_email } : null),
                items: o.online_order_items || []
            })) as Order[];
        },
        enabled: !propOrders
    });

    const displayedOrders = useMemo(() => {
        return propOrders || liveOrders || [];
    }, [propOrders, liveOrders]);

    // MUTATION: Update Order Status & Process Stock Fulfillment
    const updateStatusMutation = useMutation({
        mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
            const { error } = await supabase
                .from('online_orders')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Order Fulfillment Status Updated!");
            if (selectedOrder) {
                setSelectedOrder(prev => prev ? { ...prev, status: selectedOrder.status } : null);
            }
            queryClient.invalidateQueries({ queryKey: ['live_online_orders'] });
        },
        onError: (err: any) => toast.error(`Status Update Failed: ${err.message}`)
    });

    // EXPORT PACKING SLIP PDF
    const exportPackingSlipPdf = (order: Order) => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text((profile?.business_name || "BBU1 E-COMMERCE STORE").toUpperCase(), 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("OFFICIAL E-COMMERCE PACKING SLIP & DISPATCH INVOICE", 14, 27);
        doc.text(`Order UID: #${order.order_uid} | Date: ${new Date(order.created_at).toLocaleString()}`, 14, 33);
        doc.line(14, 36, 196, 36);

        autoTable(doc, {
            startY: 40,
            head: [['Customer Identity', 'Payment Gateway', 'Fulfillment Status', 'Total Fee']],
            body: [[
                order.customers?.name || order.customer_email || 'Guest Online Buyer',
                order.payment_gateway || 'Mobile Money',
                order.status,
                `${businessCurrency} ${order.total_amount.toLocaleString()}`
            ]],
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("DESTINATION SHIPPING ADDRESS:", 14, (doc as any).lastAutoTable.finalY + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(typeof order.shipping_address === 'string' ? order.shipping_address : JSON.stringify(order.shipping_address || "Standard Express Delivery"), 14, (doc as any).lastAutoTable.finalY + 18);

        const currentY = (doc as any).lastAutoTable.finalY + 35;
        doc.setFont('helvetica', 'bold');
        doc.text("Dispatcher Verification: ___________________________", 14, currentY);
        doc.text("Customer Receipt Signature: ___________________________", 110, currentY);

        doc.save(`Packing_Slip_${order.order_uid}.pdf`);
        toast.success("Packing Slip Downloaded!");
    };

    // COLUMN DEFINITIONS
    const columns = useMemo<ColumnDef<Order>[]>(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "order_uid",
            header: "Order ID",
            cell: ({ row }) => (
                <button 
                    onClick={() => setSelectedOrder(row.original)} 
                    className="font-mono font-bold text-blue-600 hover:underline transition-colors text-xs"
                >
                    #{row.getValue("order_uid")}
                </button>
            ),
        },
        {
            accessorKey: "customers",
            header: "Customer",
            cell: ({ row }) => {
                const customer = row.original.customers;
                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs">{customer?.name || row.original.customer_email || 'Guest Checkout'}</span>
                        <span className="text-[10px] font-medium text-slate-400">{row.original.payment_gateway || 'Online Wallet'}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const statusVal = row.getValue("status") as Order['status'];
                const statusConfig = statuses.find(s => s.value === statusVal);
                const Icon = statusConfig?.icon || AlertCircle;
                
                return (
                    <Badge variant="outline" className={cn("pl-1 pr-2.5 py-0.5 font-bold text-[9px] uppercase border-0", getStatusColor(statusVal))}>
                        <Icon className="mr-1 h-3 w-3" />
                        {statusConfig?.label || statusVal}
                    </Badge>
                );
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id));
            },
        },
        {
            accessorKey: "total_amount",
            header: () => <div className="text-right font-bold text-xs uppercase">Total ({businessCurrency})</div>,
            cell: ({ row }) => {
                const amount = Number(row.getValue("total_amount") || 0);
                return <div className="text-right font-black text-xs text-slate-900 tabular-nums">{amount.toLocaleString()}</div>;
            },
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => (
                <Button variant="ghost" className="pl-0 font-bold text-xs uppercase" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Date <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="text-xs font-medium text-slate-500">
                    {format(new Date(row.getValue("created_at")), "MMM dd, yyyy")}
                </span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <Button 
                        onClick={() => setSelectedOrder(row.original)}
                        variant="ghost" 
                        size="sm"
                        className="h-8 px-3 font-bold text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> View Order
                    </Button>
                </div>
            ),
        },
    ], [businessCurrency]);

    const table = useReactTable({
        data: displayedOrders,
        columns,
        state: { sorting, columnFilters, rowSelection },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const isFiltered = table.getState().columnFilters.length > 0;

    return (
        <div className="space-y-6">
            <Card className="h-full border-slate-200 shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                                <ShoppingBag className="text-blue-600 h-6 w-6" /> Online Customer Orders Journal
                            </CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500">
                                Manage online customer orders, payment confirmations, and dispatch fulfillment status.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Search Filter */}
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Filter by customer or Order ID..."
                                value={(table.getColumn("customers")?.getFilterValue() as string) ?? ""}
                                onChange={(event) => table.getColumn("customers")?.setFilterValue(event.target.value)}
                                className="pl-10 h-10 rounded-xl font-bold text-xs border-slate-200"
                            />
                        </div>
                        
                        {/* Status Faceted Filter */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {table.getColumn("status") && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-10 border-slate-200 font-bold text-xs rounded-xl">
                                            <Filter className="mr-2 h-4 w-4 text-blue-600" />
                                            Status Filter
                                            {(table.getColumn("status")?.getFilterValue() as string[])?.length > 0 && (
                                                <>
                                                    <Separator orientation="vertical" className="mx-2 h-4" />
                                                    <Badge variant="secondary" className="rounded-sm px-1.5 font-bold text-[9px] bg-blue-50 text-blue-600">
                                                        {(table.getColumn("status")?.getFilterValue() as string[])?.length} selected
                                                    </Badge>
                                                </>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0 rounded-2xl shadow-2xl border-slate-100" align="end">
                                        <Command>
                                            <CommandList>
                                                <CommandGroup>
                                                    {statuses.map((status) => {
                                                        const isSelected = (table.getColumn("status")?.getFilterValue() as string[])?.includes(status.value);
                                                        return (
                                                            <CommandItem
                                                                key={status.value}
                                                                onSelect={() => {
                                                                    const filterValue = (table.getColumn("status")?.getFilterValue() as string[]) || [];
                                                                    if (isSelected) {
                                                                        table.getColumn("status")?.setFilterValue(filterValue.filter((val) => val !== status.value));
                                                                    } else {
                                                                        table.getColumn("status")?.setFilterValue([...filterValue, status.value]);
                                                                    }
                                                                }}
                                                                className="font-bold text-xs py-2.5"
                                                            >
                                                                <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-slate-300", isSelected ? "bg-blue-600 text-white border-blue-600" : "opacity-50")}>
                                                                    <Check className={cn("h-3 w-3")} />
                                                                </div>
                                                                <span>{status.label}</span>
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                                {isFiltered && (
                                                    <>
                                                        <CommandSeparator />
                                                        <CommandGroup>
                                                            <CommandItem
                                                                onSelect={() => table.getColumn("status")?.setFilterValue(undefined)}
                                                                className="justify-center text-center font-bold text-xs text-rose-600 py-2.5"
                                                            >
                                                                Reset Filters
                                                            </CommandItem>
                                                        </CommandGroup>
                                                    </>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                            
                            {isFiltered && (
                                <Button
                                    variant="ghost"
                                    onClick={() => table.resetColumnFilters()}
                                    className="h-10 px-3 font-bold text-xs text-slate-500"
                                >
                                    Reset
                                    <XCircle className="ml-1.5 h-4 w-4 text-rose-500" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="h-12">
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={columns.length} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600"/> Synchronizing E-Commerce Orders...</TableCell></TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="h-16 hover:bg-slate-50/50">
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center py-6">
                                                <Package className="h-8 w-8 mb-2 opacity-20" />
                                                <p className="text-xs font-bold uppercase">No e-commerce orders found matching criteria.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between py-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Showing {table.getFilteredRowModel().rows.length} orders
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded-xl font-bold h-9">
                                Previous
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded-xl font-bold h-9">
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ==================================================================== */}
            {/* ORDER INSPECTION & PACKING SLIP DRAWER MODAL */}
            {/* ==================================================================== */}
            <Dialog open={!!selectedOrder} onOpenChange={open => { if (!open) setSelectedOrder(null); }}>
                <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xl text-white shadow-lg">
                                <ShoppingBag size={24} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight">Order #{selectedOrder?.order_uid}</DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs font-medium mt-0.5">
                                    Date: {selectedOrder?.created_at ? format(new Date(selectedOrder.created_at), "PPP p") : 'N/A'}
                                </DialogDescription>
                            </div>
                        </div>

                        <Badge className={cn("border-none text-[10px] font-black uppercase px-3 py-1", getStatusColor(selectedOrder?.status || 'PENDING'))}>
                            {selectedOrder?.status}
                        </Badge>
                    </div>

                    <ScrollArea className="max-h-[70vh] p-8 space-y-6 bg-white">
                        
                        {/* CUSTOMER & PAYMENT SUMMARY */}
                        <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Customer Identity</span>
                                <p className="text-sm font-bold text-slate-900">{selectedOrder?.customers?.name || selectedOrder?.customer_email || 'Guest Online Buyer'}</p>
                                <p className="text-xs text-slate-500 font-mono">{selectedOrder?.customer_email || 'Email Unspecified'}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Payment Channel</span>
                                <p className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                                    <CreditCard size={14} /> {selectedOrder?.payment_gateway || 'Mobile Money'}
                                </p>
                                <p className="text-xs font-black text-emerald-600 tabular-nums">
                                    Total: {businessCurrency} {selectedOrder?.total_amount?.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* FULFILLMENT STATUS UPDATE SELECTOR */}
                        <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                            <Label className="text-[10px] font-black uppercase text-blue-800 tracking-widest">Update Order Fulfillment State</Label>
                            <div className="flex gap-3">
                                <Select value={selectedOrder?.status || 'PENDING'} onValueChange={v => {
                                    if (selectedOrder) {
                                        updateStatusMutation.mutate({ orderId: selectedOrder.id, newStatus: v });
                                    }
                                }}>
                                    <SelectTrigger className="h-11 bg-white border-blue-200 rounded-xl font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING" className="font-bold text-xs text-amber-600">PENDING (Awaiting Dispatch)</SelectItem>
                                        <SelectItem value="PAID" className="font-bold text-xs text-blue-600">PAID (Stock Reconciled)</SelectItem>
                                        <SelectItem value="SHIPPED" className="font-bold text-xs text-purple-600">SHIPPED (In Transit)</SelectItem>
                                        <SelectItem value="COMPLETED" className="font-bold text-xs text-emerald-600">COMPLETED (Delivered)</SelectItem>
                                        <SelectItem value="CANCELLED" className="font-bold text-xs text-rose-600">CANCELLED (Order Void)</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button onClick={() => selectedOrder && exportPackingSlipPdf(selectedOrder)} variant="outline" className="h-11 px-5 border-slate-200 bg-white font-bold text-xs rounded-xl">
                                    <Printer size={16} className="mr-2 text-blue-600" /> Packing Slip
                                </Button>
                            </div>
                        </div>

                    </ScrollArea>

                    <DialogFooter className="p-6 bg-slate-50 border-t">
                        <Button onClick={() => setSelectedOrder(null)} className="w-full h-12 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl uppercase text-xs">
                            Close Order Inspection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}