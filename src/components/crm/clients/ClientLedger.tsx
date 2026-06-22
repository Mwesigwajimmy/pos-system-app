'use client';

import * as React from "react";
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
import { 
    ArrowUpDown, 
    Eye, 
    Trash2, 
    Download, 
    Search, 
    Filter, 
    AlertCircle, 
    CheckCircle2, 
    XCircle,
    Phone,
    Mail,
    Globe,
    CreditCard,
    TrendingDown,
    MoreHorizontal,
    FileText,
    Plus,
    UserPlus,
    Layers,
    Users,
    History,
    Coins,
    ChevronRight
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

// --- FORENSIC COMPONENT IMPORTS ---
import { RecordPaymentModal } from "./RecordPaymentModal";
import { CreatePackageModal } from "./PackageModal";
import { AddClientModal } from "./AddClientModal";

// --- TYPES ENHANCED FOR FORENSIC TRACKING ---
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
}

interface ClientIntelligenceLedgerProps {
    clients: ClientRecord[];
    businessId: string; 
}

// --- EXPORT LOGIC ---
const exportToExcel = (data: ClientRecord[]) => {
    const headers = "Name,Email,Phone,Business,Status,Debt,LTV,Billing Day\n";
    const rows = data.map(c => 
        `${c.full_name},${c.email},${c.phone},${c.nature_of_business},${c.contract_status},${c.active_debt_ugx || 0},${c.total_ltv_ugx || 0},${c.billing_day_of_month}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Forensic_Client_Ledger_${Date.now()}.csv`;
    a.click();
};

const generatePDFReport = (data: ClientRecord[]) => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text("Sovereign CRM: Global Client Subscription Ledger", 14, 20);
    
    autoTable(doc, {
        startY: 30,
        head: [['Client Name', 'Business Nature', 'Status', 'Debt Status', 'Billing Day', 'Total LTV']],
        body: data.map(c => [
            c.full_name,
            c.nature_of_business,
            c.contract_status,
            (c.active_debt_ugx || 0) > 0 ? `DEBT: ${(c.active_debt_ugx || 0).toLocaleString()} ${c.currency_code}` : 'CLEAN',
            `Every ${c.billing_day_of_month}th`,
            `${(c.total_ltv_ugx || 0).toLocaleString()} ${c.currency_code}`
        ]),
        headStyles: { fillColor: [15, 23, 42] }
    });
    doc.save(`Global_Client_Audit_${Date.now()}.pdf`);
};

export function ClientIntelligenceLedger({ clients, businessId }: ClientIntelligenceLedgerProps) {
    const { toast } = useToast();
    const supabase = createClient();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    
    // --- STATE FOR VISIBILITY ---
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [activeClient, setActiveClient] = React.useState<any>(null);
    const [packages, setPackages] = React.useState<any[]>([]);
    const [isLoadingCatalog, setIsLoadingCatalog] = React.useState(false);

    // --- FETCH CATALOG DATA ---
    const fetchCatalog = React.useCallback(async () => {
        setIsLoadingCatalog(true);
        const { data, error } = await supabase
            .from('crm_subscription_packages')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });
        
        if (data) setPackages(data);
        setIsLoadingCatalog(false);
    }, [businessId, supabase]);

    React.useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    const columns: ColumnDef<ClientRecord>[] = [
        {
            accessorKey: "full_name",
            header: "Client DNA",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 tracking-tight">{row.original.full_name}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-100">
                            {row.original.nature_of_business || 'General Business'}
                        </Badge>
                        <span className="text-[10px] text-slate-300 font-bold uppercase">{row.original.country_code}</span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: "contact_info",
            header: "Contact Intelligence",
            cell: ({ row }) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center text-[11px] font-bold text-slate-500">
                        <Phone size={10} className="mr-1.5 text-slate-300" /> {row.original.phone || 'No Phone'}
                    </div>
                    <div className="flex items-center text-[11px] font-bold text-slate-500">
                        <Mail size={10} className="mr-1.5 text-slate-300" /> {row.original.email || 'No Email'}
                    </div>
                </div>
            )
        },
        {
            accessorKey: "contract_status",
            header: "Subscription status",
            cell: ({ row }) => {
                const status = row.original.contract_status;
                const overdue = row.original.is_overdue;
                return (
                    <div className="flex flex-col gap-1">
                        <Badge className={`text-[9px] font-black uppercase ${
                            status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                            {status}
                        </Badge>
                        {overdue && (
                            <span className="text-[8px] font-black text-red-500 flex items-center gap-1 animate-pulse">
                                <AlertCircle size={8} /> OVERDUE
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: "financial_standing",
            header: "Financial Standing",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <div className={`text-[11px] font-black ${(row.original.active_debt_ugx || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        DEBT: {(row.original.active_debt_ugx || 0).toLocaleString()} {row.original.currency_code}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600">
                        LTV: {(row.original.total_ltv_ugx || 0).toLocaleString()} {row.original.currency_code}
                    </div>
                </div>
            )
        },
        {
            accessorKey: "billing_day_of_month",
            header: "Billing Day",
            cell: ({ row }) => (
                <div className="flex items-center text-[11px] font-bold text-slate-900">
                    <CreditCard size={12} className="mr-2 text-slate-300" />
                    Every {row.original.billing_day_of_month}th
                </div>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"><MoreHorizontal size={16} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 font-semibold">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Forensic Actions</DropdownMenuLabel>
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View 360 Audit</DropdownMenuItem>
                            
                            <DropdownMenuItem 
                                className="text-blue-600"
                                onClick={() => {
                                    setActiveClient({
                                        id: row.original.contact_id,
                                        name: row.original.full_name,
                                        current_debt: row.original.active_debt_ugx || 0,
                                        currency: row.original.currency_code,
                                        business_id: row.original.business_id
                                    });
                                    setPaymentModalOpen(true);
                                }}
                            >
                                <TrendingDown className="mr-2 h-4 w-4" /> Record Payment
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Terminate Contract
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
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
                
                {/* SOVEREIGN FORENSIC HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between px-8 py-8 bg-slate-50/50 border-b gap-6">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                            <Users size={28} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Client Intelligence</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-[0.2em]">Global forensic subscription & catalog management</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative mr-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <Input 
                                placeholder="Search Client DNA..." 
                                className="h-10 pl-9 w-56 border-slate-200 bg-white font-semibold text-xs rounded-xl shadow-sm"
                                value={(table.getColumn("full_name")?.getFilterValue() as string) ?? ""}
                                onChange={(e) => table.getColumn("full_name")?.setFilterValue(e.target.value)}
                            />
                        </div>
                        
                        <CreatePackageModal businessId={businessId} />
                        <AddClientModal businessId={businessId} />

                        <div className="h-8 w-[1px] bg-slate-200 mx-2" />

                        <Button variant="outline" onClick={() => exportToExcel(clients)} className="h-10 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200 rounded-xl hover:bg-slate-50">
                            <Download size={14} /> CSV
                        </Button>
                        <Button variant="outline" onClick={() => generatePDFReport(clients)} className="h-10 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200 rounded-xl hover:bg-slate-50">
                            <FileText size={14} /> Audit
                        </Button>
                    </div>
                </div>

                {/* --- TABBED ORCHESTRATION SYSTEM --- */}
                <Tabs defaultValue="ledger" className="w-full">
                    <div className="px-8 border-b bg-white">
                        <TabsList className="bg-transparent h-16 gap-10">
                            <TabsTrigger value="ledger" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent font-black text-[11px] uppercase tracking-widest text-slate-400 data-[state=active]:text-blue-600 px-0 h-full transition-all">
                                <Users size={16} className="mr-2" /> Active Client Ledger
                            </TabsTrigger>
                            <TabsTrigger value="catalog" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent font-black text-[11px] uppercase tracking-widest text-slate-400 data-[state=active]:text-blue-600 px-0 h-full transition-all">
                                <Layers size={16} className="mr-2" /> Package Architect Catalog
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* CONTENT TAB 1: CLIENTS */}
                    <TabsContent value="ledger" className="mt-0 outline-none">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/40">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id} className="border-slate-100">
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id} className="h-14 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors h-24">
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className="px-8">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-64 text-center text-xs font-bold text-slate-400 uppercase tracking-widest italic opacity-50">
                                                Zero client identities established in forensic memory.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* CONTENT TAB 2: PACKAGE CATALOG */}
                    <TabsContent value="catalog" className="mt-0 outline-none">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/40">
                                    <TableRow className="border-slate-100">
                                        <TableHead className="h-14 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Package identity</TableHead>
                                        <TableHead className="h-14 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Description</TableHead>
                                        <TableHead className="h-14 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Billing Cycle</TableHead>
                                        <TableHead className="h-14 px-8 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Standard Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {packages.map((pkg) => (
                                        <TableRow key={pkg.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors h-24">
                                            <TableCell className="px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-xs">
                                                        {pkg.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-900">{pkg.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8 text-xs font-medium text-slate-500 max-w-xs truncate">{pkg.description || 'No forensic description provided.'}</TableCell>
                                            <TableCell className="px-8 text-center">
                                                <Badge variant="outline" className="text-[10px] font-black uppercase text-blue-600 border-blue-100 bg-blue-50/30 px-3">
                                                    {pkg.billing_interval}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-8 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Coins size={12} className="text-emerald-500" />
                                                    <span className="font-black text-slate-900">{(pkg.price || 0).toLocaleString()}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">{pkg.currency_code}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {packages.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-64 text-center text-xs font-bold text-slate-400 uppercase tracking-widest italic opacity-50">
                                                No subscription strategies defined in package catalog.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* --- ORCHESTRATED PAYMENT OVERLAY --- */}
                {activeClient && (
                    <RecordPaymentModal 
                        isOpen={paymentModalOpen} 
                        onOpenChange={setPaymentModalOpen} 
                        client={activeClient} 
                    />
                )}
            </CardContent>
        </Card>
    );
}