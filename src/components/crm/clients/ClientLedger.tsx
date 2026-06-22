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
    ChevronRight,
    Lock,
    Zap,
    RefreshCcw,
    FileUp,
    FileSearch,
    ShieldCheck
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
import { ClientVaultModal } from "./ClientVaultModal";

// --- TYPES ENHANCED FOR ENTERPRISE TRACKING ---
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

// --- FORENSIC EXPORT LOGIC ---
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
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontStyle: 'bold' }
    });
    doc.save(`Global_Client_Audit_${Date.now()}.pdf`);
};

export function ClientIntelligenceLedger({ clients, businessId }: ClientIntelligenceLedgerProps) {
    const { toast } = useToast();
    const supabase = createClient();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    
    // --- MULTI-MODAL ORCHESTRATION ---
    const [vaultOpen, setVaultOpen] = React.useState(false);
    const [activeVaultClient, setActiveVaultClient] = React.useState<any>(null);
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [activeClient, setActiveClient] = React.useState<any>(null);
    const [packages, setPackages] = React.useState<any[]>([]);
    const [isLoadingCatalog, setIsLoadingCatalog] = React.useState(false);

    const fetchCatalog = React.useCallback(async () => {
        setIsLoadingCatalog(true);
        const { data } = await supabase
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
            header: "Client Identity",
            cell: ({ row }) => (
                <div className="flex flex-col group-hover:translate-x-1 transition-transform">
                    <span className="font-black text-slate-900 tracking-tight text-sm uppercase">{row.original.full_name}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-100 bg-slate-50 group-hover:bg-white group-hover:text-blue-600 transition-colors">
                            {row.original.nature_of_business || 'Standard Business'}
                        </Badge>
                    </div>
                </div>
            )
        },
        {
            accessorKey: "contact_info",
            header: "Contact DNA",
            cell: ({ row }) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center text-[10px] font-black text-slate-500">
                        <Phone size={10} className="mr-1.5 text-slate-300" /> {row.original.phone || 'NO_PHONE'}
                    </div>
                    <div className="flex items-center text-[10px] font-black text-slate-500">
                        <Mail size={10} className="mr-1.5 text-slate-300" /> {row.original.email || 'NO_EMAIL'}
                    </div>
                </div>
            )
        },
        {
            accessorKey: "contract_status",
            header: "Lifecycle Status",
            cell: ({ row }) => (
                <div className="flex flex-col gap-1">
                    <Badge className={`text-[9px] font-black uppercase px-2 py-0 ${
                        row.original.contract_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                        {row.original.contract_status}
                    </Badge>
                    {row.original.is_overdue && (
                        <span className="text-[8px] font-black text-red-600 flex items-center gap-1">
                            <AlertCircle size={8} /> BILLING_OVERDUE
                        </span>
                    )}
                </div>
            )
        },
        {
            accessorKey: "financial_standing",
            header: "Financial Exposure",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <div className={`text-[11px] font-black ${(row.original.active_debt_ugx || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        DEBT: {(row.original.active_debt_ugx || 0).toLocaleString()} {row.original.currency_code}
                    </div>
                    <div className="text-[10px] font-black text-emerald-600 uppercase">
                        Value: {(row.original.total_ltv_ugx || 0).toLocaleString()}
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
                            <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-blue-600 hover:text-white transition-all rounded-xl shadow-sm border border-transparent">
                                <MoreHorizontal size={18} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 font-black border-slate-100 shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400 px-3 py-2">Forensic Orchestration</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                                setActiveVaultClient({ id: row.original.contact_id, name: row.original.full_name });
                                setVaultOpen(true);
                            }} className="hover:bg-blue-50 cursor-pointer">
                                <Lock className="mr-2 h-4 w-4 text-blue-500" /> Open Forensic Vault
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-emerald-600 hover:bg-emerald-50 cursor-pointer" onClick={() => {
                                setActiveClient({ id: row.original.contact_id, name: row.original.full_name, current_debt: row.original.active_debt_ugx || 0, currency: row.original.currency_code, business_id: row.original.business_id });
                                setPaymentModalOpen(true);
                            }}>
                                <TrendingDown className="mr-2 h-4 w-4" /> Reconcile Payment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> Terminate Node
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
        <Card className="border-slate-100 shadow-sm overflow-hidden bg-white rounded-2xl">
            <CardContent className="p-0">
                
                {/* SOVEREIGN FORENSIC HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between px-8 py-8 bg-slate-50/50 border-b gap-6">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-slate-200 group-hover:scale-105 transition-transform">
                            <ShieldCheck size={32} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Client Intelligence</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-[0.3em]">Identity, fulfillment & Forensic Revenue management</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative mr-2 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-600 transition-colors" size={16} />
                            <Input 
                                placeholder="Search Client DNA..." 
                                className="h-11 pl-10 w-64 border-slate-200 bg-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20"
                                value={(table.getColumn("full_name")?.getFilterValue() as string) ?? ""}
                                onChange={(e) => table.getColumn("full_name")?.setFilterValue(e.target.value)}
                            />
                        </div>
                        
                        {/* --- PRIMARY ACTIONS --- */}
                        <CreatePackageModal businessId={businessId} />
                        <AddClientModal businessId={businessId} />

                        <div className="h-10 w-[1px] bg-slate-200 mx-2" />

                        <Button variant="outline" onClick={() => exportToExcel(clients)} className="h-11 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                            <Download size={16} /> CSV Ledger
                        </Button>
                        <Button variant="outline" onClick={() => generatePDFReport(clients)} className="h-11 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                            <FileSearch size={16} /> Identity Audit
                        </Button>
                    </div>
                </div>

                {/* --- TABBED FORENSIC ORCHESTRATION --- */}
                <Tabs defaultValue="ledger" className="w-full">
                    <div className="px-8 border-b bg-white">
                        <TabsList className="bg-transparent h-20 gap-12">
                            <TabsTrigger value="ledger" className="data-[state=active]:border-b-4 data-[state=active]:border-blue-600 rounded-none bg-transparent font-black text-[12px] uppercase tracking-widest text-slate-400 data-[state=active]:text-blue-600 px-0 h-full transition-all hover:text-blue-500">
                                <Users size={18} className="mr-3" /> Active Client Ledger
                            </TabsTrigger>
                            <TabsTrigger value="catalog" className="data-[state=active]:border-b-4 data-[state=active]:border-blue-600 rounded-none bg-transparent font-black text-[12px] uppercase tracking-widest text-slate-400 data-[state=active]:text-blue-600 px-0 h-full transition-all hover:text-blue-500">
                                <Layers size={18} className="mr-3" /> Package Architect Catalog
                            </TabsTrigger>
                            <TabsTrigger value="timeline" className="data-[state=active]:border-b-4 data-[state=active]:border-blue-600 rounded-none bg-transparent font-black text-[12px] uppercase tracking-widest text-slate-400 data-[state=active]:text-blue-600 px-0 h-full transition-all hover:text-blue-500">
                                <History size={18} className="mr-3" /> Identity Audit trail
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="ledger" className="mt-0 outline-none">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id} className="border-slate-100 h-14">
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id} className="px-8 font-black text-[11px] uppercase tracking-widest text-slate-400">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id} className="group hover:bg-blue-50 transition-colors h-24 border-slate-50 cursor-pointer">
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className="px-8">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-80 text-center text-xs font-black text-slate-300 uppercase tracking-[0.4em]">
                                                Zero identities located in current business node.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="catalog" className="mt-0 outline-none">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 h-14">
                                        <TableHead className="px-8 font-black text-[11px] uppercase tracking-widest text-slate-400">Strategy identity</TableHead>
                                        <TableHead className="px-8 font-black text-[11px] uppercase tracking-widest text-slate-400">Description</TableHead>
                                        <TableHead className="px-8 font-black text-[11px] uppercase tracking-widest text-slate-400 text-center">Billing Cycle</TableHead>
                                        <TableHead className="px-8 font-black text-[11px] uppercase tracking-widest text-slate-400 text-right">Standard Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {packages.map((pkg) => (
                                        <TableRow key={pkg.id} className="group hover:bg-blue-50 transition-colors h-24 border-slate-50 cursor-pointer">
                                            <TableCell className="px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-200">
                                                        {pkg.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-black text-slate-900 uppercase text-xs">{pkg.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8 text-[11px] font-bold text-slate-500 max-w-sm">{pkg.description || 'Global Service Package Entry'}</TableCell>
                                            <TableCell className="px-8 text-center">
                                                <Badge className="bg-blue-600 text-white font-black text-[10px] uppercase px-4 py-1 rounded-full shadow-md">
                                                    {pkg.billing_interval}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-8 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Coins size={14} className="text-emerald-500" />
                                                    <span className="font-black text-slate-900 text-lg">{(pkg.price || 0).toLocaleString()}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pkg.currency_code}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="timeline" className="mt-0 outline-none">
                         <div className="h-96 flex flex-col items-center justify-center text-slate-300 gap-4">
                            <History size={64} className="opacity-20" />
                            <span className="text-sm font-black uppercase tracking-[0.3em]">Historical Timeline Generating...</span>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* --- ORCHESTRATED OVERLAY LAYER --- */}
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
    );
}