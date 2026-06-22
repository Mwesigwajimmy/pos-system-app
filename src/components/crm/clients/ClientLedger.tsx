'use client';

import * as React from "react";
import Link from "next/link";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { format, isValid } from "date-fns";
import { 
    Phone,
    Mail,
    TrendingDown,
    MoreHorizontal,
    Download,
    Search,
    AlertCircle,
    CheckCircle2,
    Lock,
    Users,
    History,
    Coins,
    Layers,
    FileText,
    Clock,
    CalendarDays,
    Trash2
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

// COMPONENT IMPORTS
import { RecordPaymentModal } from "./RecordPaymentModal";
import { CreatePackageModal } from "./PackageModal";
import { AddClientModal } from "./AddClientModal";
import { ClientVaultModal } from "./ClientVaultModal";

export interface ClientRecord {
    contact_id: string;
    business_id: string; 
    full_name: string;
    email: string;
    phone: string;
    nature_of_business: string;
    country_code: string;
    currency_code: string;
    contract_status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED';
    billing_day_of_month: number;
    active_debt_ugx: number;
    total_ltv_ugx: number;
    is_overdue: boolean;
    created_at: string;
}

interface ClientIntelligenceLedgerProps {
    clients: ClientRecord[];
    businessId: string; 
}

// EXPORT UTILITIES
const exportToExcel = (data: ClientRecord[]) => {
    const headers = "Name,Email,Phone,Business,Status,Debt,LTV,Billing Day\n";
    const rows = data.map(c => 
        `${c.full_name},${c.email},${c.phone},${c.nature_of_business},${c.contract_status},${c.active_debt_ugx || 0},${c.total_ltv_ugx || 0},${c.billing_day_of_month}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Report_${Date.now()}.csv`;
    a.click();
};

const generatePDFReport = (data: ClientRecord[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text("Customer Audit Report", 14, 20);
    
    autoTable(doc, {
        startY: 30,
        head: [['Customer Name', 'Industry', 'Status', 'Balance', 'Billing Day', 'Total Value']],
        body: data.map(c => [
            c.full_name,
            c.nature_of_business || 'General',
            c.contract_status,
            `${(c.active_debt_ugx || 0).toLocaleString()} ${c.currency_code}`,
            `Day ${c.billing_day_of_month}`,
            `${(c.total_ltv_ugx || 0).toLocaleString()} ${c.currency_code}`
        ]),
        headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`Customer_Audit_${Date.now()}.pdf`);
};

export function ClientIntelligenceLedger({ clients, businessId }: ClientIntelligenceLedgerProps) {
    const { toast } = useToast();
    const supabase = createClient();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    
    const [vaultOpen, setVaultOpen] = React.useState(false);
    const [activeVaultClient, setActiveVaultClient] = React.useState<any>(null);
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [activeClient, setActiveClient] = React.useState<any>(null);
    const [packages, setPackages] = React.useState<any[]>([]);

    const fetchCatalog = React.useCallback(async () => {
        const { data } = await supabase
            .from('crm_subscription_packages')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });
        if (data) setPackages(data);
    }, [businessId, supabase]);

    React.useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    const columns: ColumnDef<ClientRecord>[] = [
        {
            accessorKey: "full_name",
            header: "Customer Name",
            cell: ({ row }) => (
                <div className="flex flex-col py-1">
                    <span className="font-bold text-slate-900 text-sm">{row.original.full_name}</span>
                    <span className="text-xs font-medium text-slate-500 mt-0.5">
                        {row.original.nature_of_business || 'General Business'}
                    </span>
                </div>
            )
        },
        {
            accessorKey: "contact_info",
            header: "Contact Details",
            cell: ({ row }) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center text-xs font-medium text-slate-600">
                        <Phone size={12} className="mr-2 text-slate-400" /> {row.original.phone || 'No Phone'}
                    </div>
                    <div className="flex items-center text-xs font-medium text-slate-600">
                        <Mail size={12} className="mr-2 text-slate-400" /> {row.original.email || 'No Email'}
                    </div>
                </div>
            )
        },
        {
            accessorKey: "contract_status",
            header: "Status",
            cell: ({ row }) => (
                <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className={`text-[10px] font-bold px-2 py-0.5 w-fit ${
                        row.original.contract_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                        {row.original.contract_status}
                    </Badge>
                    {row.original.is_overdue && (
                        <span className="text-[10px] font-semibold text-red-600 flex items-center gap-1">
                            <AlertCircle size={10} /> Payment Overdue
                        </span>
                    )}
                </div>
            )
        },
        {
            accessorKey: "financials",
            header: "Financial Summary",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <div className={`text-xs font-bold ${(row.original.active_debt_ugx || 0) > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        Balance: {(row.original.active_debt_ugx || 0).toLocaleString()} {row.original.currency_code}
                    </div>
                    <div className="text-[11px] font-medium text-emerald-600 mt-0.5">
                        Total Value: {(row.original.total_ltv_ugx || 0).toLocaleString()}
                    </div>
                </div>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 border border-slate-200">
                                <MoreHorizontal size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 shadow-lg border-slate-200">
                            <DropdownMenuLabel className="text-xs text-slate-500 font-bold px-3 py-2">Customer Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                                setActiveVaultClient({ id: row.original.contact_id, name: row.original.full_name });
                                setVaultOpen(true);
                            }} className="text-sm font-medium hover:bg-slate-50 cursor-pointer">
                                <Lock className="mr-2 h-4 w-4 text-blue-500" /> View Customer Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-sm font-medium text-emerald-600 hover:bg-emerald-50 cursor-pointer" onClick={() => {
                                setActiveClient({ id: row.original.contact_id, name: row.original.full_name, current_debt: row.original.active_debt_ugx || 0, currency: row.original.currency_code, business_id: row.original.business_id });
                                setPaymentModalOpen(true);
                            }}>
                                <TrendingDown className="mr-2 h-4 w-4" /> Record Payment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> Deactivate Account
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        }
    ];

    const table = useReactTable({
        data: clients,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="space-y-6">
            {/* ACTION BAR: Clean, well-structured layout */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="relative group min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <Input 
                        placeholder="Search customers..." 
                        className="h-10 pl-10 border-slate-200 bg-white text-sm font-medium rounded-lg focus:ring-1 focus:ring-blue-500"
                        value={(table.getColumn("full_name")?.getFilterValue() as string) ?? ""}
                        onChange={(e) => table.getColumn("full_name")?.setFilterValue(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-3">
                    <CreatePackageModal businessId={businessId} />
                    <AddClientModal businessId={businessId} />

                    <div className="h-6 w-[1px] bg-slate-200 mx-1" />

                    <Button variant="outline" onClick={() => generatePDFReport(clients)} className="h-10 text-xs font-semibold gap-2 border-slate-200 px-4">
                        <FileText size={16} /> PDF Audit
                    </Button>
                    <Button variant="outline" onClick={() => exportToExcel(clients)} className="h-10 text-xs font-semibold gap-2 border-slate-200 px-4">
                        <Download size={16} /> Export CSV
                    </Button>
                </div>
            </div>

            <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-0">
                    <Tabs defaultValue="ledger" className="w-full">
                        <div className="px-6 border-b border-slate-100 bg-white">
                            <TabsList className="bg-transparent h-14 gap-8">
                                <TabsTrigger value="ledger" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent font-bold text-xs text-slate-500 data-[state=active]:text-blue-600 px-1 h-full transition-all">
                                    <Users size={16} className="mr-2" /> Active Customers
                                </TabsTrigger>
                                <TabsTrigger value="catalog" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent font-bold text-xs text-slate-500 data-[state=active]:text-blue-600 px-1 h-full transition-all">
                                    <Layers size={16} className="mr-2" /> Service Packages
                                </TabsTrigger>
                                <TabsTrigger value="timeline" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent font-bold text-xs text-slate-500 data-[state=active]:text-blue-600 px-1 h-full transition-all">
                                    <History size={16} className="mr-2" /> Registration History
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* TABLE CONTENT */}
                        <TabsContent value="ledger" className="m-0 border-none outline-none">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id} className="border-slate-100">
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id} className="px-6 h-12 text-xs font-bold text-slate-700">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className="px-6 py-4">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center text-sm font-medium text-slate-500">
                                                No customer records found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="catalog" className="m-0 outline-none">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100">
                                        <TableHead className="px-6 h-12 text-xs font-bold text-slate-700">Package Name</TableHead>
                                        <TableHead className="px-6 h-12 text-xs font-bold text-slate-700">Description</TableHead>
                                        <TableHead className="px-6 h-12 text-xs font-bold text-slate-700 text-center">Billing Cycle</TableHead>
                                        <TableHead className="px-6 h-12 text-xs font-bold text-slate-700 text-right">Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {packages.map((pkg) => (
                                        <TableRow key={pkg.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                                                        {pkg.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold text-sm text-slate-900">{pkg.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 text-sm text-slate-600">{pkg.description || 'Standard Service Tier'}</TableCell>
                                            <TableCell className="px-6 text-center">
                                                <Badge className="bg-blue-600 text-white font-semibold text-[10px] px-3 py-0.5 rounded-full">
                                                    {pkg.billing_interval}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Coins size={14} className="text-emerald-500" />
                                                    <span className="font-bold text-slate-900 text-base">{(pkg.price || 0).toLocaleString()}</span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{pkg.currency_code}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="timeline" className="m-0 outline-none">
                            <div className="p-8 space-y-8 bg-white min-h-[400px]">
                                <div className="space-y-8 relative ml-4 border-l border-slate-100 pl-8">
                                    {clients.map((c, i) => {
                                        const dateObj = c.created_at ? new Date(c.created_at) : null;
                                        const isDateOk = isValid(dateObj);

                                        return (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-[41px] top-1 h-5 w-5 bg-white rounded-full border-2 border-emerald-500 shadow-sm flex items-center justify-center">
                                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                                </div>
                                                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-blue-200 transition-all">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-bold text-slate-900">Registration Complete: {c.full_name}</p>
                                                            <p className="text-xs font-medium text-slate-500">Customer record added to system.</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-100 bg-white px-2">
                                                            ID-{i + 1001}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center text-[11px] font-semibold text-slate-500">
                                                            <Clock size={12} className="mr-1.5" /> {isDateOk ? format(dateObj!, 'HH:mm') : '00:00'}
                                                        </div>
                                                        <div className="flex items-center text-[11px] font-semibold text-slate-500">
                                                            <CalendarDays size={12} className="mr-1.5" /> {isDateOk ? format(dateObj!, 'dd MMM yyyy') : 'Pending'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {clients.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                            <History size={40} className="opacity-20 mb-3" />
                                            <span className="text-sm font-medium">No registration history available.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* MODAL STATES */}
                    {activeVaultClient && (
                        <ClientVaultModal 
                            isOpen={vaultOpen} 
                            onOpenChange={setVaultOpen} 
                            clientId={activeVaultClient.id} 
                            clientName={activeVaultClient.name} 
                        />
                    )}

                    {activeClient && (
                        <RecordPaymentModal 
                            isOpen={paymentModalOpen} 
                            onOpenChange={setPaymentModalOpen} 
                            client={activeClient} 
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}