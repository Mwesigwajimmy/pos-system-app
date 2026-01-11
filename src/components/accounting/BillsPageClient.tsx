'use client';

import React, { useState } from 'react';
import { 
  FileDown, 
  FileUp, 
  PlusCircle, 
  MoreHorizontal, 
  RefreshCcw, 
  Download, 
  History,
  ShieldCheck,
  Activity
} from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';

// --- Sub-Components ---
import BillsDataTable from "@/components/accounting/BillsDataTable";
import OrdersToMakeTable from "@/components/accounting/OrdersToMakeTable";
import OrdersToUpsellTable from "@/components/accounting/OrdersToUpsellTable";
import AgedPayablesTable from "@/components/accounting/AgedPayablesTable";
import PriceListTable from "@/components/accounting/PriceListTable";
import InvoicesToBeIssuedTable from "@/components/accounting/InvoicesToBeIssuedTable";
import AuditTrailTable from "@/components/accounting/AuditTrailTable"; // New Enterprise Component
import CreateBillModal from "@/components/accounting/CreateBillModal";

// --- UI Library ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

// Type definition for the enterprise Bill
import { Bill } from "@/components/accounting/BillsDataTable";

interface BillsPageClientProps {
    initialBills: Bill[];
    businessId: string;
}

export default function BillsPageClient({ initialBills, businessId }: BillsPageClientProps) {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("bills"); // Controlled state for enterprise navigation

    /**
     * Enterprise Refresh Logic
     * Invalidates all accounting queries to ensure the entire dashboard is in sync.
     */
    const refreshSystem = () => {
        queryClient.invalidateQueries({ queryKey: ['bills', businessId] });
        queryClient.invalidateQueries({ queryKey: ['payables', businessId] });
        queryClient.invalidateQueries({ queryKey: ['audit_logs', businessId] });
        toast.success("General Ledger Synchronized");
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Page Header: The Mission Control for Payables */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight">Accounts Payable</h1>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 flex gap-1 items-center">
                            <ShieldCheck className="w-3 h-3" />
                            Enterprise Engine v2.5
                        </Badge>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        Supplier management, real-time ledger synchronization, and aged liability analysis. 
                        Fully interconnected with the General Ledger and Multi-Tenant Reporting.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Sync Button: Standard for Enterprise Apps */}
                    <Button variant="outline" size="icon" onClick={refreshSystem} title="Sync with Ledger">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>

                    {/* Primary Action: Opens the Interconnected Modal */}
                    <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-md bg-primary hover:bg-primary/90">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Bill
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More Actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Data Operations</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <FileUp className="mr-2 h-4 w-4" /> Bulk Import (CSV/Excel)
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <FileDown className="mr-2 h-4 w-4" /> Export Current View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Reporting Shortcuts</DropdownMenuLabel>
                            <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4 text-green-600" /> Export Aged Payables (PDF)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActiveTab("audit-trail")}>
                                <History className="mr-2 h-4 w-4 text-blue-600" /> View Audit Logs
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Main Navigation: All tabs are interconnected via the businessId */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="bg-muted/40 p-1 rounded-lg border">
                    <TabsList className="w-full justify-start overflow-x-auto h-11 bg-transparent">
                        <TabsTrigger value="bills" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Bills & Items</TabsTrigger>
                        <TabsTrigger value="aged-payables" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Aged Payables</TabsTrigger>
                        <TabsTrigger value="orders-to-make" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Purchase Requests</TabsTrigger>
                        <TabsTrigger value="price-list" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Supplier Pricing</TabsTrigger>
                        <TabsTrigger value="audit-trail" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2">
                             <Activity className="w-4 h-4" /> Audit Trail
                        </TabsTrigger>
                    </TabsList>
                </div>
                
                {/* 1. Main Bills Table */}
                <TabsContent value="bills" className="mt-0">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle>Bill Ledger</CardTitle>
                            <CardDescription>
                                Central list of all vendor obligations and payment workflows.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <BillsDataTable 
                                initialBills={initialBills} 
                                businessId={businessId} 
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. Aged Payables Report */}
                <TabsContent value="aged-payables" className="mt-0">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>Payables Aging Analysis</CardTitle>
                            <CardDescription>
                                Live breakdown of outstanding debts grouped by time buckets.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AgedPayablesTable 
                                initialBills={initialBills} 
                                businessId={businessId} 
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. Procurement Modules */}
                <TabsContent value="orders-to-make" className="mt-0">
                    <Card className="border-none shadow-sm">
                        <CardHeader><CardTitle>Purchase Requests</CardTitle></CardHeader>
                        <CardContent>
                            <OrdersToMakeTable businessId={businessId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. Supply Chain Intel */}
                <TabsContent value="price-list" className="mt-0">
                    <Card className="border-none shadow-sm">
                        <CardHeader><CardTitle>Vendor Price Intelligence</CardTitle></CardHeader>
                        <CardContent>
                            <PriceListTable businessId={businessId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 5. Enterprise Audit Trail (Security & Compliance) */}
                <TabsContent value="audit-trail" className="mt-0">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>Compliance & Audit Logs</CardTitle>
                            <CardDescription>
                                Immutable record of every transaction, approval, and adjustment within the payables system.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AuditTrailTable businessId={businessId} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* 
                THE ENTERPRISE CONNECTED MODAL
            */}
            <CreateBillModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                businessId={businessId}
                onSuccess={() => {
                    refreshSystem(); 
                }}
            />
        </div>
    );
}