// src/app/(dashboard)/accounting/bills/page.tsx

import BillsDataTable from "@/components/accounting/BillsDataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileUp, PlusCircle, MoreHorizontal } from "lucide-react";

export default function BillsPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">Accounts Payable</h1>
                    <p className="text-sm text-muted-foreground">
                        A centralized dashboard to manage, track, and pay all incoming bills from your suppliers.
                    </p>
                </div>
                
                {/* Scalable Actions Menu for Enterprise */}
                <div className="flex items-center space-x-2">
                    <Button>
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
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <FileUp className="mr-2 h-4 w-4" />
                                Import Bills
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <FileDown className="mr-2 h-4 w-4" />
                                Export All Bills
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Bills Data Table Section in a Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Manage Bills</CardTitle>
                    <CardDescription>
                        Review all recorded bills below. Use the filter to search by supplier or click column headers to sort.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <BillsDataTable />
                </CardContent>
            </Card>
            
        </div>
    );
}