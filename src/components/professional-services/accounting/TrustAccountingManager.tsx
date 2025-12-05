'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet,
  CheckCircle2,
  Building2,
  Search,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";

// --- Types ---

interface TrustAccountConfig {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  currency: string;
}

interface TrustTransaction {
  id: string;
  transaction_date: string;
  type: 'deposit' | 'withdrawal' | 'retainer_usage';
  amount: number;
  description: string;
  client: {
    first_name: string;
    last_name: string;
    company_name: string;
  } | null;
}

interface TrustAccountingManagerProps {
  tenantId: string;
  currency: string;
  trustAccountConfig: TrustAccountConfig | null;
  initialTransactions: TrustTransaction[];
}

type SortConfig = {
  key: keyof TrustTransaction | 'client_name';
  direction: 'asc' | 'desc';
};

export default function TrustAccountingManager({ 
  tenantId, 
  currency, 
  trustAccountConfig, 
  initialTransactions 
}: TrustAccountingManagerProps) {

  // --- State for Data Grid ---
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'transaction_date', direction: 'desc' });

  // --- Configuration Check ---
  if (!trustAccountConfig) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="bg-white border-red-200 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div className="ml-2">
            <AlertTitle className="text-red-700 font-semibold">Configuration Error</AlertTitle>
            <AlertDescription className="text-red-600 mt-1">
              Trust Liability Account not configured in Chart of Accounts.
              <br />
              Please ensure a Liability account named <strong>"Client Trust Funds"</strong> exists.
            </AlertDescription>
            <div className="mt-3">
               <Link href="/accounting/chart-of-accounts">
                 <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                   Go to Chart of Accounts
                 </Button>
               </Link>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  // --- Helper: Format Currency ---
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  });

  // --- Data Processing Engine (Memoized) ---
  const processedData = useMemo(() => {
    let data = [...initialTransactions];

    // 1. Filter by Search Term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter((t) => {
        const clientName = t.client?.company_name || `${t.client?.first_name} ${t.client?.last_name}`;
        return (
          t.description?.toLowerCase().includes(lowerTerm) ||
          clientName.toLowerCase().includes(lowerTerm) ||
          t.amount.toString().includes(lowerTerm)
        );
      });
    }

    // 2. Filter by Type
    if (typeFilter !== 'all') {
      data = data.filter((t) => t.type === typeFilter);
    }

    // 3. Sorting
    data.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof TrustTransaction];
      let bValue: any = b[sortConfig.key as keyof TrustTransaction];

      // Special handling for nested client name
      if (sortConfig.key === 'client_name') {
        aValue = a.client?.company_name || `${a.client?.first_name} ${a.client?.last_name}`;
        bValue = b.client?.company_name || `${b.client?.first_name} ${b.client?.last_name}`;
      }
      
      // Special handling for Date comparisons
      if (sortConfig.key === 'transaction_date') {
        aValue = new Date(a.transaction_date).getTime();
        bValue = new Date(b.transaction_date).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [initialTransactions, searchTerm, typeFilter, sortConfig]);

  // --- Sorting Handler ---
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // --- Render Sort Icon ---
  const SortIcon = ({ columnKey }: { columnKey: SortConfig['key'] }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground opacity-50" />;
    return <ArrowUpDown className={cn("ml-2 h-4 w-4", sortConfig.direction === 'asc' ? "text-primary" : "text-primary rotate-180 transition-transform")} />;
  };

  return (
    <div className="space-y-6">
      {/* Top Status Bar */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between bg-green-50/50 p-4 rounded-lg border border-green-100">
        <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Trust Accounting System Active</span>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Linked Account: <span className="font-mono text-green-700">{trustAccountConfig.name}</span>
        </div>
      </div>

      {/* KPI Cards (Always showing totals based on FULL dataset for overview) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trust Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {formatter.format(trustAccountConfig.current_balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available funds held for clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Deposits</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
                {formatter.format(initialTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + Number(t.amount), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total active deposits loaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Withdrawals / Usage</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-blue-600">
                {formatter.format(initialTransactions.filter(t => t.type !== 'deposit').reduce((sum, t) => sum + Number(t.amount), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Funds utilized or refunded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Data Grid */}
      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Trust Transactions</CardTitle>
                    <CardDescription>History of all client deposits and retainer usage.</CardDescription>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Record Transaction
                </Button>
            </div>
            
            {/* --- Filter Toolbar --- */}
            <div className="flex flex-col md:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search clients, description, or amount..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-[200px]">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Filter by Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="deposit">Deposits</SelectItem>
                            <SelectItem value="withdrawal">Withdrawals</SelectItem>
                            <SelectItem value="retainer_usage">Retainer Usage</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            {/* Sortable Header: Date */}
                            <TableHead className="w-[150px]">
                                <Button variant="ghost" className="p-0 hover:bg-transparent font-medium" onClick={() => handleSort('transaction_date')}>
                                    Date <SortIcon columnKey="transaction_date" />
                                </Button>
                            </TableHead>
                            
                            {/* Sortable Header: Client */}
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent font-medium" onClick={() => handleSort('client_name')}>
                                    Client <SortIcon columnKey="client_name" />
                                </Button>
                            </TableHead>
                            
                            <TableHead>Description</TableHead>
                            
                            {/* Sortable Header: Type */}
                            <TableHead>
                                <Button variant="ghost" className="p-0 hover:bg-transparent font-medium" onClick={() => handleSort('type')}>
                                    Type <SortIcon columnKey="type" />
                                </Button>
                            </TableHead>
                            
                            {/* Sortable Header: Amount */}
                            <TableHead className="text-right">
                                <Button variant="ghost" className="p-0 hover:bg-transparent font-medium" onClick={() => handleSort('amount')}>
                                    Amount <SortIcon columnKey="amount" />
                                </Button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                    {searchTerm || typeFilter !== 'all' 
                                        ? "No transactions match your filters." 
                                        : "No transactions found."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            processedData.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium text-muted-foreground">
                                        {format(new Date(t.transaction_date), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {t.client?.company_name || `${t.client?.first_name || ''} ${t.client?.last_name || ''}`}
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={t.description}>
                                        {t.description}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "capitalize font-normal",
                                            t.type === 'deposit' 
                                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                                                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                        )}>
                                            {t.type.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-right font-mono font-medium",
                                        t.type === 'deposit' ? "text-green-600" : "text-slate-600"
                                    )}>
                                        {t.type === 'deposit' ? '+' : '-'}{formatter.format(Math.abs(t.amount))}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
                Showing {processedData.length} of {initialTransactions.length} transaction(s)
            </div>
        </CardContent>
      </Card>
    </div>
  );
}