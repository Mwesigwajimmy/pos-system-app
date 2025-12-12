'use client';

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Users, MapPin, Building2 } from "lucide-react";

// 1. Types Definition (Exported for use in Server Page)
export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  segment: 'VIP' | 'Regular' | 'New' | 'Inactive';
  ordersCount: number;
  lastOrder: string; // ISO String or Formatted Date
  totalSpent: number;
  region: string;
  entity: string;
  tenantId: string;
}

interface Customer360ViewProps {
  initialCustomers: CustomerProfile[];
}

export function Customer360View({ initialCustomers }: Customer360ViewProps) {
  const [filter, setFilter] = useState('');

  // 2. High-Performance Filtering using useMemo
  const filtered = useMemo(() => {
    if (!filter) return initialCustomers;
    
    const lowerFilter = filter.toLowerCase();
    return initialCustomers.filter(c =>
        c.name.toLowerCase().includes(lowerFilter) ||
        c.email.toLowerCase().includes(lowerFilter) ||
        c.region.toLowerCase().includes(lowerFilter) ||
        c.entity.toLowerCase().includes(lowerFilter)
    );
  }, [initialCustomers, filter]);

  // Utility for currency formatting
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  // Utility for Segment Badge Color
  const getSegmentBadge = (segment: string) => {
    switch(segment) {
      case 'VIP': return "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300";
      case 'New': return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      case 'Inactive': return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300";
    }
  };

  return (
    <Card className="h-full border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="h-5 w-5 text-primary" />
                    Customer 360° View
                </CardTitle>
                <CardDescription>
                Analyze every customer: orders, spend, status, and region assignments.
                </CardDescription>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full max-w-xs">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, email, region..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8 h-9"
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
        <ScrollArea className="h-[500px] rounded-md border">
            <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Region & Entity</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No customers found matching "{filter}".
                    </TableCell>
                </TableRow>
                ) : (
                filtered.map(c => (
                    <TableRow key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground">{c.email}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={`border-0 ${getSegmentBadge(c.segment)}`}>
                                {c.segment}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{c.ordersCount}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(c.totalSpent)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{c.lastOrder}</TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 opacity-50"/> {c.region}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Building2 className="h-3 w-3 opacity-50"/> {c.entity}
                                </div>
                            </div>
                        </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}