'use client';

import React, { useState } from 'react';
import Link from "next/link";
import { 
  FileDown, 
  FileUp, 
  PlusCircle, 
  MoreHorizontal, 
  RefreshCcw, 
  Download, 
  History 
} from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';

// --- Sub-Components ---
import BillsDataTable from "@/components/accounting/BillsDataTable";
import OrdersToMakeTable from "@/components/accounting/OrdersToMakeTable";
import OrdersToUpsellTable from "@/components/accounting/OrdersToUpsellTable";
import AgedPayablesTable from "@/components/accounting/AgedPayablesTable";
import PriceListTable from "@/components/accounting/PriceListTable";
import InvoicesToBeIssuedTable from "@/components/accounting/InvoicesToBeIssuedTable";
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

    /**
     * Enterprise Refresh Logic
     * Invalidates all accounting queries to ensure the entire dashboard is in sync.
     */
    const refreshSystem = () => {
        queryClient.invalidateQueries({ queryKey: ['bills', businessId] });
        queryClient.invalidateQueries({ queryKey: ['payment_accounts', businessId] });
        toast.success("System synchronized with General Ledger");
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Page Header: The Mission Control for Payables */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight">Accounts Payable</h1>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                            Enterprise Engine v2.0
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
                    <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-md">
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
                            <DropdownMenuItem>
                                <History className="mr-2 h-4 w-4" /> View Audit Logs
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Main Navigation: All tabs are interconnected via the businessId */}
            <Tabs defaultValue="bills" className="space-y-6">
                <div className="bg-muted/40 p-1 rounded-lg border">
                    <TabsList className="w-full justify-start overflow-x-auto h-11 bg-transparent">
                        <TabsTrigger value="bills" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Bills & Items</TabsTrigger>
                        <TabsTrigger value="aged-payables" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Aged Payables</TabsTrigger>
                        <TabsTrigger value="orders-to-make" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Purchase Requests</TabsTrigger>
                        <TabsTrigger value="orders-to-upsell" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Upsell Intel</TabsTrigger>
                        <TabsTrigger value="price-list" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Supplier Pricing</TabsTrigger>
                        <TabsTrigger value="invoices-to-be-issued" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Awaiting Invoices</TabsTrigger>
                    </TabsList>
                </div>
                
                {/* 1. Main Bills Table */}
                <TabsContent value="bills" className="mt-0">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle>Bill Ledger</CardTitle>
                            <CardDescription>
                                Central list of all vendor obligations. All transactions here impact the Accounts Payable liability account.
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Payables Aging Analysis</CardTitle>
                            <CardDescription>
                                Live breakdown of outstanding debts grouped by time buckets. Essential for cash flow planning.
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
                    <Card>
                        <CardHeader><CardTitle>Purchase Requests</CardTitle></CardHeader>
                        <CardContent>
                            <OrdersToMakeTable businessId={businessId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="orders-to-upsell" className="mt-0">
                    <Card>
                        <CardHeader><CardTitle>Supplier Upsell Analytics</CardTitle></CardHeader>
                        <CardContent>
                            <OrdersToUpsellTable businessId={businessId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. Supply Chain Intel */}
                <TabsContent value="price-list" className="mt-0">
                    <Card>
                        <CardHeader><CardTitle>Vendor Price Intelligence</CardTitle></CardHeader>
                        <CardContent>
                            <PriceListTable businessId={businessId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices-to-be-issued" className="mt-0">
                    <Card>
                        <CardHeader><CardTitle>Pending Invoice Issuance</CardTitle></CardHeader>
                        <CardContent>
                            <InvoicesToBeIssuedTable businessId={businessId} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* 
                THE ENTERPRISE CONNECTED MODAL
                This is triggered by the Page Header but refreshes the whole system on success.
            */}
            <CreateBillModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                businessId={businessId}
                onSuccess={() => {
                    refreshSystem(); // Updates all tabs instantly
                }}
            />
        </div>
    );
}