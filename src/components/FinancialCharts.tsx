'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

// --- Types ---
interface DailyTrendItem {
  date: string;
  sales: number;
}

interface ExpenseItem {
  category: string;
  amount: number;
}

// --- Fetch Function for Expenses ---
async function fetchExpenseBreakdown() {
  const supabase = createClient();
  // Fetch raw expenses from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .gte('date', thirtyDaysAgo.toISOString());

  if (error) throw new Error(error.message);

  // Aggregate data by category in JavaScript to avoid complex SQL grouping on the client
  const aggregated: Record<string, number> = {};
  
  data?.forEach((item) => {
    // Normalize category names (e.g., "Rent" vs "rent")
    const cat = (item.category || 'Uncategorized').charAt(0).toUpperCase() + (item.category || 'Uncategorized').slice(1);
    aggregated[cat] = (aggregated[cat] || 0) + item.amount;
  });

  // Convert to array for Recharts
  return Object.entries(aggregated)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value); // Sort highest expenses first
}

const formatCurrency = (val: number) => `UGX ${(val / 1000).toFixed(0)}k`;

export default function FinancialCharts({ dailyTrend }: { dailyTrend: DailyTrendItem[] }) {
  const { data: expenseData, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenseBreakdown'],
    queryFn: fetchExpenseBreakdown
  });

  const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
      {/* --- LEFT: Revenue Trend Chart --- */}
      <Card className="lg:col-span-3 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <TrendingUp className="h-5 w-5 text-green-500" /> Revenue Trend
          </CardTitle>
          <CardDescription>Sales performance over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {day: 'numeric', month: 'short'})}
                    tick={{fontSize: 12, fill: '#6b7280'}}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis 
                    tickFormatter={formatCurrency}
                    tick={{fontSize: 12, fill: '#6b7280'}}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                    formatter={(value: number) => [`UGX ${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#0ea5e9" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* --- RIGHT: Real Expense Breakdown --- */}
      <Card className="lg:col-span-2 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" /> Expense Analysis
          </CardTitle>
          <CardDescription>Where money is being spent (Last 30 Days)</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExpenses ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !expenseData || expenseData.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
               <DollarSign className="h-10 w-10 opacity-20 mb-2" />
               <p>No expenses recorded recently.</p>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={expenseData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    tick={{fontSize: 12, fill: '#374151', fontWeight: 500}}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    formatter={(value: number) => [`UGX ${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}