// src/components/FinancialCharts.tsx
'use client';

import { Card, Title, LineChart, BarChart } from '@tremor/react';
import { DailyTrendItem } from '@/types/dashboard';

export default function FinancialCharts({ dailyTrend }: { dailyTrend: DailyTrendItem[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
      <Card className="lg:col-span-3">
        <Title>Revenue Trend (Last 30 Days)</Title>
        <LineChart
          className="mt-6"
          data={dailyTrend}
          index="date"
          categories={['sales']}
          colors={['blue']}
          yAxisWidth={60}
        />
      </Card>
      <Card className="lg:col-span-2">
        <Title>Expense Breakdown</Title>
        <BarChart
            className="mt-6"
            // NOTE: This is populated with placeholder data
            data={[ 
              { name: 'Rent', 'Amount': 5000000 },
              { name: 'Salaries', 'Amount': 12000000 },
              { name: 'Utilities', 'Amount': 1500000 },
            ]}
            index="name"
            categories={['Amount']}
            colors={['cyan']}
            yAxisWidth={60}
        />
      </Card>
    </div>
  );
}