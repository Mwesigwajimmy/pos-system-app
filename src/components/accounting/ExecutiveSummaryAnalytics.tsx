"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface AccountData {
  id: string;
  name: string;
  account_type: string; // 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
  subtype: string; // 'Current Asset', 'Current Liability', 'Cash', etc.
  balance: number;
  currency: string;
  entity: string;
  country: string;
}

interface ExecutiveSummaryKPI {
  kpi: string;
  value: number;
  currency: string;
  entity: string;
  country: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface ExecutiveSummaryRatio {
  ratio: string;
  value: string | number;
  entity: string;
  country: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface Props {
  tenantId?: string;
}

export default function ExecutiveSummaryAnalytics({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [kpis, setKpis] = useState<ExecutiveSummaryKPI[]>([]);
  const [ratios, setRatios] = useState<ExecutiveSummaryRatio[]>([]);
  const [loading, setLoading] = useState(true);

  // 3. Data Fetching & Aggregation
  useEffect(() => {
    if (!tenantId) return;

    const calculateFinancials = async () => {
      try {
        // Fetch account balances (assuming a view or table with current balances)
        const { data: accounts, error } = await supabase
          .from('accounting_accounts')
          .select('id, name, account_type, subtype, balance, currency, entity, country')
          .eq('tenant_id', tenantId);

        if (error) throw error;

        if (accounts) {
          const typedAccounts = accounts as AccountData[];
          
          // Group by Entity + Currency to separate financial contexts
          const entityGroups: Record<string, AccountData[]> = {};
          
          typedAccounts.forEach(acc => {
            const key = `${acc.entity}||${acc.country}||${acc.currency}`;
            if (!entityGroups[key]) entityGroups[key] = [];
            entityGroups[key].push(acc);
          });

          const calculatedKpis: ExecutiveSummaryKPI[] = [];
          const calculatedRatios: ExecutiveSummaryRatio[] = [];

          // Process each entity group
          Object.entries(entityGroups).forEach(([key, entityAccounts]) => {
            const [entity, country, currency] = key.split('||');

            // --- Aggregations ---
            const totalAssets = entityAccounts
              .filter(a => a.account_type === 'Asset')
              .reduce((sum, a) => sum + a.balance, 0);

            const totalLiabilities = entityAccounts
              .filter(a => a.account_type === 'Liability')
              .reduce((sum, a) => sum + a.balance, 0);

            const totalEquity = entityAccounts
              .filter(a => a.account_type === 'Equity')
              .reduce((sum, a) => sum + a.balance, 0);

            const cashInBank = entityAccounts
              .filter(a => a.subtype?.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank'))
              .reduce((sum, a) => sum + a.balance, 0);
              
            const currentAssets = entityAccounts
              .filter(a => a.subtype === 'Current Asset' || a.account_type === 'Asset') // Fallback to Asset if subtype missing
              .reduce((sum, a) => sum + a.balance, 0);

            const currentLiabilities = entityAccounts
              .filter(a => a.subtype === 'Current Liability' || a.account_type === 'Liability')
              .reduce((sum, a) => sum + a.balance, 0);

            // --- KPI Generation ---
            calculatedKpis.push(
              { kpi: "Total Assets", value: totalAssets, currency, entity, country, trend: 'up' },
              { kpi: "Total Liabilities", value: totalLiabilities, currency, entity, country, trend: 'down' },
              { kpi: "Total Equity", value: totalEquity, currency, entity, country, trend: 'up' },
              { kpi: "Cash Position", value: cashInBank, currency, entity, country, trend: 'neutral' }
            );

            // --- Ratio Generation ---
            
            // 1. Current Ratio (Current Assets / Current Liabilities)
            const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0;
            calculatedRatios.push({
              ratio: "Current Ratio",
              value: currentRatio.toFixed(2),
              entity,
              country,
              status: currentRatio > 1.5 ? 'healthy' : currentRatio < 1 ? 'critical' : 'warning'
            });

            // 2. Debt-to-Equity (Total Liabilities / Total Equity)
            const debtToEquity = totalEquity !== 0 ? totalLiabilities / totalEquity : 0;
            calculatedRatios.push({
              ratio: "Debt-to-Equity",
              value: debtToEquity.toFixed(2),
              entity,
              country,
              status: debtToEquity < 2 ? 'healthy' : 'warning'
            });

            // 3. Equity Ratio (Total Equity / Total Assets)
            const equityRatio = totalAssets !== 0 ? (totalEquity / totalAssets) * 100 : 0;
            calculatedRatios.push({
              ratio: "Equity Ratio",
              value: `${equityRatio.toFixed(1)}%`,
              entity,
              country,
              status: equityRatio > 50 ? 'healthy' : 'warning'
            });
          });

          setKpis(calculatedKpis);
          setRatios(calculatedRatios);
        }
      } catch (error) {
        console.error("Error calculating executive summary:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateFinancials();
  }, [tenantId, supabase]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary & Analytics</CardTitle>
          <CardDescription>Loading financial health indicators...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-14">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive Summary & Analytics</CardTitle>
        <CardDescription>
          Cross-country, multi-entity financial KPIs and key ratios calculated from live account balances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* Section 1: KPIs */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-lg">Key Financial Indicators</h2>
            </div>
            {kpis.length === 0 ? (
               <p className="text-sm text-muted-foreground italic">No account data available.</p>
            ) : (
              <ul className="space-y-3">
                {kpis.map((kpi, i) => (
                  <li key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-semibold">{kpi.kpi}</p>
                      <p className="text-xs text-muted-foreground">{kpi.entity} • {kpi.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-medium">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: kpi.currency }).format(kpi.value)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Section 2: Ratios */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="font-bold text-lg">Financial Ratios</h2>
            </div>
            {ratios.length === 0 ? (
               <p className="text-sm text-muted-foreground italic">Insufficient data for ratios.</p>
            ) : (
              <ul className="space-y-3">
                {ratios.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-semibold">{r.ratio}</p>
                      <p className="text-xs text-muted-foreground">{r.entity} • {r.country}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium
                        ${r.status === 'healthy' ? 'bg-green-100 text-green-700' : 
                          r.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'}`
                      }>
                        {r.status}
                      </span>
                      <p className="font-mono text-lg font-bold">{r.value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </CardContent>
    </Card>
  );
}