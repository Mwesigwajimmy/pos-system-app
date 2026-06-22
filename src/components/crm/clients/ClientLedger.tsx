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
    FileText
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
import { useToast } from "@/components/ui/use-toast";

// --- IMPORT THE PAYMENT COMPONENT ---
import { RecordPaymentModal } from "./RecordPaymentModal";

// --- TYPES ENHANCED FOR FORENSIC TRACKING ---
export interface ClientRecord {
    contact_id: string;
    business_id: string; // Required for tenant isolation
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

// --- EXPORT LOGIC ---
const exportToExcel = (data: ClientRecord[]) => {
    const headers = "Name,Email,Phone,Business,Status,Debt,LTV,Billing Day\n";
    const rows = data.map(c => 
        `${c.full_name},${c.email},${c.phone},${c.nature_of_business},${c.contract_status},${c.active_debt_ugx},${c.total_ltv_ugx},${c.billing_day_of_month}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Client_Ledger_Export_${Date.now()}.csv`;
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
    doc.save(`Client_Forensic_Report_${Date.now()}.pdf`);
};

export function ClientIntelligenceLedger({ clients }: { clients: ClientRecord[] }) {
    const { toast } = useToast();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    
    // --- PAYMENT ORCHESTRATION STATE ---
    const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
    const [activeClient, setActiveClient] = React.useState<any>(null);

    const columns: ColumnDef<ClientRecord>[] = [
        {
            accessorKey: "full_name",
            header: "Client DNA",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{row.original.full_name}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-100">
                            {row.original.nature_of_business || 'General'}
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
                        <Phone size={10} className="mr-1.5" /> {row.original.phone || 'No Phone'}
                    </div>
                    <div className="flex items-center text-[11px] font-bold text-slate-500">
                        <Mail size={10} className="mr-1.5" /> {row.original.email || 'No Email'}
                    </div>
                </div>
            )
        },
        {
            accessorKey: "contract_status",
            header: "Subscription Status",
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
                                <AlertCircle size={8} /> BILLING OVERDUE
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
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal size={16} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 font-semibold">
                            <DropdownMenuLabel>Forensic Actions</DropdownMenuLabel>
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View 360 Audit</DropdownMenuItem>
                            
                            {/* --- WIRE UP PAYMENT RECORDING --- */}
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
                {/* FORENSIC HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between px-6 py-6 bg-slate-50/50 border-b gap-4">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">Client Intelligence Ledger</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Sovereign-grade debt & subscription tracking</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative mr-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <Input 
                                placeholder="Search Client DNA..." 
                                className="h-10 pl-9 w-64 border-slate-200 bg-white font-semibold text-xs"
                                value={(table.getColumn("full_name")?.getFilterValue() as string) ?? ""}
                                onChange={(e) => table.getColumn("full_name")?.setFilterValue(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={() => exportToExcel(clients)} className="h-10 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200">
                            <Download size={14} /> CSV
                        </Button>
                        <Button variant="outline" onClick={() => generatePDFReport(clients)} className="h-10 font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200">
                            <FileText size={14} /> PDF
                        </Button>
                    </div>
                </div>

                {/* THE LEDGER TABLE */}
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-100">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="h-12 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="px-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-xs font-bold text-slate-400">
                                        No active client records found in the ledger.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {/* --- ORCHESTRATED PAYMENT MODAL --- */}
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