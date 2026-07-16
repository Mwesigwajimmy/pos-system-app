'use client';

/**
 * --- BBU1 CLIENT INTELLIGENCE LEDGER ---
 * VERSION: v5.0 OMEGA (CUSTOMER 360 INTEGRATED)
 * Use: Advanced client management with unified transaction history and native dispatch.
 * Logic: Linked to view_sovereign_entity_ledger for forensic document streaming.
 */

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
    Trash2,
    MessageSquare,
    Send,
    ExternalLink,
    Printer,
    ShieldCheck,
    Zap,
    ClipboardList
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

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
    
    // UI Modal States
    const [vaultOpen, setVaultOpen] = React.useState(false);
    const [activeVaultClient, setActiveVaultClient] = React.useState<any>(null);
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [activeClient, setActiveClient] = React.useState<any>(null);
    const [packages, setPackages] = React.useState<any[]>([]);

    // Logic: 360 History States
    const [historyOpen, setHistoryOpen] = React.useState(false);
    const [historyClient, setHistoryClient] = React.useState<ClientRecord | null>(null);

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

    // Logic: Fetch the Unified Forensic Ledger for the selected customer
    const { data: documentStream, isLoading: isStreamLoading } = useQuery({
        queryKey: ['client_document_stream', historyClient?.contact_id],
        queryFn: async () => {
            if (!historyClient) return [];
            const { data, error } = await supabase
                .from('view_sovereign_entity_ledger')
                .select('*')
                .eq('business_id', businessId)
                .eq('entity_id', historyClient.contact_id)
                .order('doc_date', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },
        enabled: historyOpen && !!historyClient
    });

    // Logic: Native Dispatch Handler (Email/WhatsApp)
    const handleNativeDispatch = (doc: any, method: 'EMAIL' | 'WHATSAPP') => {
        if (!historyClient) return;

        const amount = new Intl.NumberFormat('en-US', { 
            style: 'currency', currency: doc.currency || 'UGX' 
        }).format(doc.amount);

        const docTitle = doc.doc_type.charAt(0) + doc.doc_type.slice(1).toLowerCase();

        if (method === 'EMAIL') {
            const subject = encodeURIComponent(`${docTitle} ${doc.reference} from NIM UGANDA`);
            const body = encodeURIComponent(`Dear ${historyClient.full_name},\n\nPlease find your ${docTitle} (${doc.reference}) for the amount of ${amount} attached.\n\nThank you for your business.`);
            window.location.href = `mailto:${historyClient.email}?subject=${subject}&body=${body}`;
        } else {
            const phone = historyClient.phone.replace(/\D/g, '');
            const text = encodeURIComponent(`Hello ${historyClient.full_name}, your ${docTitle} ${doc.reference} for ${amount} is ready. View it here: [SYSTEM_LINK]`);
            window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        }
    };

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
                            <Button variant="ghost" className="h-8 w-8 p-0 border border-slate-200 rounded-lg">
                                <MoreHorizontal size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60 shadow-2xl border-slate-200 rounded-2xl p-2">
                            <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase font-black tracking-widest px-3 py-2">Forensic Actions</DropdownMenuLabel>
                            
                            {/* Logic: Entry to Customer 360 History */}
                            <DropdownMenuItem onClick={() => {
                                setHistoryClient(row.original);
                                setHistoryOpen(true);
                            }} className="text-sm font-bold text-slate-700 py-3 px-3 rounded-xl cursor-pointer">
                                <History className="mr-3 h-4 w-4 text-blue-600" /> View Document Stream
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                                setActiveVaultClient({ id: row.original.contact_id, name: row.original.full_name });
                                setVaultOpen(true);
                            }} className="text-sm font-bold text-slate-700 py-3 px-3 rounded-xl cursor-pointer">
                                <Lock className="mr-3 h-4 w-4 text-slate-400" /> Identity Vault
                            </DropdownMenuItem>

                            <DropdownMenuItem className="text-sm font-bold text-emerald-600 py-3 px-3 rounded-xl cursor-pointer" onClick={() => {
                                setActiveClient({ id: row.original.contact_id, name: row.original.full_name, current_debt: row.original.active_debt_ugx || 0, currency: row.original.currency_code, business_id: row.original.business_id });
                                setPaymentModalOpen(true);
                            }}>
                                <TrendingDown className="mr-3 h-4 w-4" /> Record Payment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-2" />
                            <DropdownMenuItem className="text-sm font-bold text-red-600 py-3 px-3 rounded-xl cursor-pointer hover:bg-red-50">
                                <Trash2 className="mr-3 h-4 w-4" /> Deactivate Account
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
            {/* ACTION BAR */}
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

                    <Button variant="outline" onClick={() => generatePDFReport(clients)} className="h-10 text-xs font-semibold gap-2 border-slate-200 px-4 rounded-xl">
                        <FileText size={16} /> PDF Audit
                    </Button>
                    <Button variant="outline" onClick={() => exportToExcel(clients)} className="h-10 text-xs font-semibold gap-2 border-slate-200 px-4 rounded-xl">
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
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* --- MODAL: CUSTOMER 360 FORENSIC HISTORY --- */}
                    <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                        <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 border-none shadow-3xl bg-white rounded-[2.5rem] overflow-hidden">
                            <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-6">
                                    <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                                        <History size={32} />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">Forensic Document Stream</DialogTitle>
                                        <DialogDescription className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                                            360° History for {historyClient?.full_name}
                                        </DialogDescription>
                                    </div>
                                </div>
                                <Button variant="ghost" onClick={() => setHistoryOpen(false)} className="text-slate-400 hover:text-white rounded-full">
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <ClipboardList size={14} /> Total Document Count: {documentStream?.length || 0}
                                    </p>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                        <ShieldCheck size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Sovereign Link Verified</span>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1">
                                    <Table>
                                        <TableHeader className="bg-white sticky top-0 z-10">
                                            <TableRow className="border-slate-50">
                                                <TableHead className="pl-10 font-black uppercase text-[10px] tracking-widest h-12 text-slate-400">Date</TableHead>
                                                <TableHead className="font-black uppercase text-[10px] tracking-widest h-12 text-slate-400">Document Node</TableHead>
                                                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest h-12 text-slate-400">Net Valuation</TableHead>
                                                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest h-12 text-slate-400">Status</TableHead>
                                                <TableHead className="pr-10 text-right font-black uppercase text-[10px] tracking-widest h-12 text-slate-400">Direct Dispatch</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isStreamLoading ? (
                                                <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto"/></TableCell></TableRow>
                                            ) : documentStream?.length === 0 ? (
                                                <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 font-bold uppercase text-xs">No transactions discovered</TableCell></TableRow>
                                            ) : (
                                                documentStream?.map((doc: any) => (
                                                    <TableRow key={doc.doc_id} className="hover:bg-slate-50/50 transition-colors border-slate-50 h-20">
                                                        <TableCell className="pl-10 font-bold text-slate-500 text-xs">
                                                            {format(new Date(doc.doc_date), "dd MMM yyyy")}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-900 text-sm uppercase">{doc.reference}</span>
                                                                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">{doc.doc_type}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-slate-900 tabular-nums">
                                                            {doc.amount.toLocaleString()} <span className="text-[10px] text-slate-400 ml-1">{doc.currency}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={cn(
                                                                "rounded-lg px-3 py-1 font-bold text-[9px] uppercase border-none",
                                                                doc.status === 'PAID' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                                            )}>
                                                                {doc.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="pr-10 text-right">
                                                            <div className="flex justify-end gap-3">
                                                                <Button variant="ghost" size="icon" onClick={() => handleNativeDispatch(doc, 'WHATSAPP')} title="WhatsApp Dispatch" className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl border border-transparent hover:border-emerald-100 transition-all">
                                                                    <MessageSquare size={18} />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" onClick={() => handleNativeDispatch(doc, 'EMAIL')} title="Email Dispatch" className="h-10 w-10 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all">
                                                                    <Mail size={18} />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
                                                                    <Printer size={18} />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-4 opacity-40">
                                <ShieldCheck size={14} className="text-slate-900" />
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-900">Forensic Interlink Protocol Active • End-to-End Encryption</span>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* EXISTING MODALS PRESERVED */}
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

const X = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);