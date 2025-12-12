'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Building2, Package, AlertTriangle, CheckCircle2 } from "lucide-react";

// 1. Strict Interface Definition
export interface WarehouseStock {
  id: string;
  warehouseName: string;
  region: string;
  countryCode: string;
  sku: string;
  productName: string;
  totalQuantity: number; // Physical count
  reservedQuantity: number; // Allocated to open orders
  availableQuantity: number; // Sellable count
  reorderPoint: number;
  tenantId: string;
}

interface InventoryProps {
  initialStock: WarehouseStock[];
}

export function MultiWarehouseInventory({ initialStock }: InventoryProps) {
  const [filter, setFilter] = useState('');

  // 2. Client-Side Filtering & Sorting
  const filteredData = useMemo(() => {
    if (!filter) return initialStock;
    const lowerFilter = filter.toLowerCase();
    
    return initialStock.filter(item =>
        item.productName.toLowerCase().includes(lowerFilter) ||
        item.sku.toLowerCase().includes(lowerFilter) ||
        item.warehouseName.toLowerCase().includes(lowerFilter) ||
        item.region.toLowerCase().includes(lowerFilter)
    );
  }, [initialStock, filter]);

  // 3. Status Logic Helper
  const getStockStatus = (available: number, reorderPoint: number) => {
    if (available <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle };
    if (available <= reorderPoint) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertTriangle };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 };
  };

  return (
    <Card className="h-full border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5 text-primary" />
                    Multi-Warehouse Inventory
                </CardTitle>
                <CardDescription>
                  Real-time view of physical vs. sellable inventory across all facilities.
                </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search SKU, Product, or Location..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8"
                />
                {filter && (
                    <X 
                        className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                        onClick={() => setFilter("")}
                    />
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] rounded-md border">
            <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Product Details</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Physical Stock</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Sellable</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center">
                                <Package className="h-8 w-8 mb-2 opacity-20" />
                                No inventory records found.
                            </div>
                        </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item) => {
                        const status = getStockStatus(item.availableQuantity, item.reorderPoint);
                        const StatusIcon = status.icon;

                        return (
                            <TableRow key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.productName}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm">
                                        <span>{item.warehouseName}</span>
                                        <span className="text-xs text-muted-foreground">{item.region}, {item.countryCode}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                    {item.totalQuantity.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-mono text-amber-600 dark:text-amber-500">
                                    {item.reservedQuantity > 0 ? item.reservedQuantity.toLocaleString() : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                    {item.availableQuantity.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={`gap-1 border-0 ${status.color}`}>
                                        <StatusIcon className="h-3 w-3" />
                                        {status.label}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })
                  )}
                </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}