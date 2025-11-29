'use client';

import BillsDataTable from "@/components/accounting/BillsDataTable";
import OrdersToMakeTable from "@/components/accounting/OrdersToMakeTable";
import OrdersToUpsellTable from "@/components/accounting/OrdersToUpsellTable";
import AgedPayablesTable from "@/components/accounting/AgedPayablesTable";
import PriceListTable from "@/components/accounting/PriceListTable";
import InvoicesToBeIssuedTable from "@/components/accounting/InvoicesToBeIssuedTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileUp, PlusCircle, MoreHorizontal } from "lucide-react";
import Link from "next/link";

export default function BillsPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">Accounts Payable & Supplier Management</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage, track, and pay all supplier bills. Streamlined control over payables and supplier relations.
                    </p>
                </div>
                {/* Actions: Add Bill, Bulk Import/Export */}
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/accounting/bills/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New Bill
                        </Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More Actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <FileUp className="mr-2 h-4 w-4" /> Import Bills
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <FileDown className="mr-2 h-4 w-4" /> Export All Bills
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <Link href="/accounting/aged-payables" className="flex items-center">
                                    <FileDown className="mr-2 h-4 w-4" /> Download Aged Payables
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Tabs for advanced payable management */}
            <Tabs defaultValue="bills" className="space-y-6">
                <TabsList className="w-full grid grid-cols-6">
                    <TabsTrigger value="bills">Bills</TabsTrigger>
                    <TabsTrigger value="orders-to-make">Orders To Make</TabsTrigger>
                    <TabsTrigger value="orders-to-upsell">Orders To Upsell</TabsTrigger>
                    <TabsTrigger value="aged-payables">Aged Payables</TabsTrigger>
                    <TabsTrigger value="price-list">Price List</TabsTrigger>
                    <TabsTrigger value="invoices-to-be-issued">Invoices To Be Issued</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bills">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bills Management</CardTitle>
                            <CardDescription>
                                Review, filter, and process all supplier bills. Use advanced filtering tools for vendor, due date, and more.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BillsDataTable />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="orders-to-make">
                    <Card>
                        <CardHeader>
                            <CardTitle>Orders To Make</CardTitle>
                            <CardDescription>
                                Generate and track internal purchase requests to keep your stock and supplies flowing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OrdersToMakeTable />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="orders-to-upsell">
                    <Card>
                        <CardHeader>
                            <CardTitle>Orders To Upsell</CardTitle>
                            <CardDescription>
                                Review suggested upsell opportunities based on supplier history or new offers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OrdersToUpsellTable />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="aged-payables">
                    <Card>
                        <CardHeader>
                            <CardTitle>Aged Payables</CardTitle>
                            <CardDescription>
                                Analyze your outstanding payables, grouped by due date buckets to assess liquidity risk.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AgedPayablesTable />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="price-list">
                    <Card>
                        <CardHeader>
                            <CardTitle>Supplier Price List</CardTitle>
                            <CardDescription>
                                Track pricing agreements and negotiate better deals with supplier price intelligence.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PriceListTable />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="invoices-to-be-issued">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoices To Be Issued</CardTitle>
                            <CardDescription>
                                Identify bills that are awaiting invoice issuance from suppliers. Manage communications to accelerate processing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InvoicesToBeIssuedTable />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}