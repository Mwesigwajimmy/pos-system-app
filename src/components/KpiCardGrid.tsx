'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard, Wallet, Activity } from 'lucide-react';

// --- Type Definition ---
export interface Kpis {
  total_sales: number;
  total_cost: number;
  transaction_count: number;
}

const formatCurrency = (value: number) => 
  `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function KpiCardGrid({ kpis }: { kpis: Kpis }) {
  // Safe calculation to prevent NaN
  const safeSales = kpis?.total_sales ?? 0;
  const safeCost = kpis?.total_cost ?? 0;
  const netProfit = safeSales - safeCost;
  
  // Dynamic styling based on business health
  const isProfitable = netProfit >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeSales)}</div>
          <p className="text-xs text-muted-foreground mt-1">Gross income from sales</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Costs</CardTitle>
          <CreditCard className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeCost)}</div>
          <p className="text-xs text-muted-foreground mt-1">COGS + Expenses</p>
        </CardContent>
      </Card>

      <Card className={`border-l-4 shadow-sm ${isProfitable ? 'border-l-green-500' : 'border-l-red-500'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          <Wallet className={`h-4 w-4 ${isProfitable ? 'text-green-500' : 'text-red-500'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isProfitable ? 'You are profitable!' : 'Currently operating at a loss'}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          <Activity className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis?.transaction_count ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Total sales completed</p>
        </CardContent>
      </Card>
    </div>
  );
}