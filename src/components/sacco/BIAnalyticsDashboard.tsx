'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
    Loader2,
    Users,
    Wallet,
    Briefcase,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Activity,
    Scale,
    RefreshCw,
    UserPlus,
    Banknote
} from "lucide-react";

interface BIStats {
    active_members: number;
    total_deposits: number;
    total_loans: number;
    delinquency_rate: number;
    portfolio_at_risk: number;
    staff_productivity_score: number;
    reporting_currency: string; // Enterprise: API tells us the currency

    // Optional metrics — rendered only when the RPC provides them, so the
    // dashboard degrades gracefully until the backend is extended.
    total_share_capital?: number;
    new_members_period?: number;
    loan_disbursements_period?: number;
    member_growth_pct?: number;
    deposit_growth_pct?: number;
    loan_growth_pct?: number;
}

async function fetchBI(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_sacco_analytics', { p_tenant_id: tenantId });
  if (error) throw new Error("Failed to load analytics");
  return data as BIStats;
}

type ColorKey = 'blue' | 'green' | 'indigo' | 'red' | 'amber' | 'orange' | 'cyan' | 'violet';

const COLOR_MAP: Record<ColorKey, { tint: string; icon: string }> = {
    blue: { tint: "bg-blue-50", icon: "text-blue-600" },
    green: { tint: "bg-green-50", icon: "text-green-600" },
    indigo: { tint: "bg-indigo-50", icon: "text-indigo-600" },
    red: { tint: "bg-red-50", icon: "text-red-600" },
    amber: { tint: "bg-amber-50", icon: "text-amber-600" },
    orange: { tint: "bg-orange-50", icon: "text-orange-600" },
    cyan: { tint: "bg-cyan-50", icon: "text-cyan-600" },
    violet: { tint: "bg-violet-50", icon: "text-violet-600" },
};

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: ColorKey;
    subtext?: string;
    trendPct?: number;
    trendLabel?: string;
}

const StatCard = ({ title, value, icon: Icon, color, subtext, trendPct, trendLabel }: StatCardProps) => {
    const palette = COLOR_MAP[color];
    const hasTrend = typeof trendPct === "number" && !Number.isNaN(trendPct);
    const trendPositive = hasTrend && trendPct! >= 0;

    return (
        <div className="p-4 bg-white rounded-xl border shadow-sm flex items-start gap-4 transition-all hover:shadow-md min-w-0">
            <div className={`p-3 rounded-lg ${palette.tint} shrink-0`}>
                <Icon className={`w-6 h-6 ${palette.icon}`} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold text-slate-900 leading-tight">{value}</h3>
                    {hasTrend && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trendPositive ? "text-green-600" : "text-red-600"}`}>
                            {trendPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {Math.abs(trendPct!).toFixed(1)}%
                        </span>
                    )}
                </div>
                {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}{trendLabel && hasTrend ? ` • ${trendLabel}` : ''}</p>}
            </div>
        </div>
    );
};

const StatCardSkeleton = () => (
    <div className="p-4 bg-white rounded-xl border shadow-sm flex items-start gap-4 animate-pulse">
        <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-6 w-20 bg-slate-100 rounded" />
            <div className="h-2.5 w-28 bg-slate-100 rounded" />
        </div>
    </div>
);

export default function BIAnalyticsDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useQuery({
      queryKey: ['bi-dashboard', tenantId],
      queryFn: () => fetchBI(tenantId),
      staleTime: 60000 // Cache 1 min
  });

  if (isLoading) {
      return (
          <div className="space-y-4">
              <div className="h-6 w-56 bg-slate-100 rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
          </div>
      );
  }

  if (isError) {
      return (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  System metrics unavailable. Please check your connection.
              </div>
              <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-md px-2.5 py-1.5 hover:bg-red-100 transition-colors shrink-0"
              >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
          </div>
      );
  }

  const currency = data?.reporting_currency || 'USD';
  const formatMoney = (val: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val);

  const totalDeposits = data?.total_deposits || 0;
  const totalLoans = data?.total_loans || 0;
  const loanToDepositRatio = totalDeposits > 0 ? (totalLoans / totalDeposits) * 100 : null;

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Performance Overview ({currency})</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
                {dataUpdatedAt && <span>Updated {format(new Date(dataUpdatedAt), 'PP p')}</span>}
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
                    aria-label="Refresh analytics"
                >
                    {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
                title="Active Members"
                value={data?.active_members || 0}
                icon={Users}
                color="blue"
                subtext="KYC Verified"
                trendPct={data?.member_growth_pct}
                trendLabel="vs last period"
            />
            <StatCard
                title="Total Deposits"
                value={formatMoney(totalDeposits)}
                icon={Wallet}
                color="green"
                subtext="Across all products"
                trendPct={data?.deposit_growth_pct}
                trendLabel="vs last period"
            />
            <StatCard
                title="Loan Portfolio"
                value={formatMoney(totalLoans)}
                icon={Briefcase}
                color="indigo"
                subtext="Principal outstanding"
                trendPct={data?.loan_growth_pct}
                trendLabel="vs last period"
            />
            <StatCard
                title="Delinquency Rate"
                value={`${data?.delinquency_rate || 0}%`}
                icon={AlertTriangle}
                color={(data?.delinquency_rate || 0) > 5 ? "red" : "amber"}
                subtext="Loans > 30 days due"
            />
            <StatCard
                title="Portfolio at Risk"
                value={formatMoney(data?.portfolio_at_risk || 0)}
                icon={TrendingUp}
                color="orange"
                subtext="Value at risk"
            />
            <StatCard
                title="Staff Efficiency"
                value={data?.staff_productivity_score || 0}
                icon={Activity}
                color="cyan"
                subtext="Clients / officer"
            />
            <StatCard
                title="Loan-to-Deposit Ratio"
                value={loanToDepositRatio !== null ? `${loanToDepositRatio.toFixed(1)}%` : '—'}
                icon={Scale}
                color="violet"
                subtext="Loans as a share of deposits"
            />

            {/* Rendered only once the RPC starts returning these fields */}
            {typeof data?.total_share_capital === "number" && (
                <StatCard
                    title="Total Share Capital"
                    value={formatMoney(data.total_share_capital)}
                    icon={Banknote}
                    color="green"
                    subtext="Member equity contributions"
                />
            )}
            {typeof data?.new_members_period === "number" && (
                <StatCard
                    title="New Members"
                    value={data.new_members_period}
                    icon={UserPlus}
                    color="blue"
                    subtext="This reporting period"
                />
            )}
            {typeof data?.loan_disbursements_period === "number" && (
                <StatCard
                    title="Loan Disbursements"
                    value={formatMoney(data.loan_disbursements_period)}
                    icon={Briefcase}
                    color="indigo"
                    subtext="This reporting period"
                />
            )}
        </div>
    </div>
  )
}