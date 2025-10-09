// src/components/KpiCardGrid.tsx
'use client';

import { Card, Metric, Text } from '@tremor/react';
import { Kpis } from '@/types/dashboard';

// A simple utility to format numbers as currency
const formatCurrency = (value: number) => 
  `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

export default function KpiCardGrid({ kpis }: { kpis: Kpis }) {
  const netProfit = kpis.total_sales - kpis.total_cost;
  const profitColor = netProfit >= 0 ? 'text-green-500' : 'text-red-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <Text>Total Revenue</Text>
        <Metric>{formatCurrency(kpis.total_sales)}</Metric>
      </Card>
      <Card>
        <Text>Total Cost of Goods</Text>
        <Metric>{formatCurrency(kpis.total_cost)}</Metric>
      </Card>
      <Card>
        <Text>Net Profit / Loss</Text>
        <Metric className={profitColor}>{formatCurrency(netProfit)}</Metric>
      </Card>
      <Card>
        <Text>Transactions</Text>
        <Metric>{kpis.transaction_count}</Metric>
      </Card>
    </div>
  );
}