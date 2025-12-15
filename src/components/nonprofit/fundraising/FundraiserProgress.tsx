'use client';

import * as React from "react";
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { differenceInDays, format, isPast } from "date-fns";
import { Loader2, Target, TrendingUp, Clock, ChevronRight, AlertCircle, HeartHandshake } from "lucide-react";
import Link from "next/link";

// --- TYPES ---
interface TenantContext {
  tenantId: string;
  currency: string;
}

interface CampaignData {
  id: string;
  name: string;
  goal_amount: number;
  raised_amount: number;
  status: string;
  end_date: string;
}

// --- DATA FETCHING ---
async function fetchTargetCampaign(tenantId: string, campaignId?: string) {
  const db = createClient();
  let query = db.from('fundraising_campaigns').select('*').eq('tenant_id', tenantId);

  if (campaignId) {
    // Fetch specific
    query = query.eq('id', campaignId);
  } else {
    // Fetch most urgent active campaign
    query = query.eq('status', 'Active').order('end_date', { ascending: true }).limit(1);
  }

  const { data, error } = await query.single();
  
  // Supabase .single() returns error code PGRST116 if no rows found. We handle this gracefully.
  if (error && error.code !== 'PGRST116') throw error; 
  return data as CampaignData | null;
}

// --- COMPONENT ---
export default function FundraiserProgress({ 
  tenant, 
  campaignId 
}: { 
  tenant: TenantContext; 
  campaignId?: string;
}) {
  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ["fund-progress-widget", tenant.tenantId, campaignId || 'active'], 
    queryFn: () => fetchTargetCampaign(tenant.tenantId, campaignId),
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });

  // Loading State
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col justify-center items-center p-6 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50"/>
        <p className="text-xs text-muted-foreground">Loading campaign data...</p>
      </Card>
    );
  }

  // Empty/Error State
  if (isError || !campaign) {
    return (
      <Card className="h-full flex flex-col justify-center items-center p-6 text-center bg-muted/20 border-dashed">
        <HeartHandshake className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h4 className="font-semibold text-sm">No Active Campaign</h4>
        <p className="text-xs text-muted-foreground mt-1 mb-4">Start a fundraiser to track progress here.</p>
        <Link href="/nonprofit/fundraising">
            <Button variant="outline" size="sm">Go to Campaigns</Button>
        </Link>
      </Card>
    );
  }

  // --- LOGIC ---
  const safeGoal = campaign.goal_amount > 0 ? campaign.goal_amount : 1;
  const percentRaw = (campaign.raised_amount / safeGoal) * 100;
  const percent = Math.min(Math.max(percentRaw, 0), 100);
  const isCompleted = percent >= 100;
  
  const daysLeft = differenceInDays(new Date(campaign.end_date), new Date());
  const isExpired = isPast(new Date(campaign.end_date)) && !isCompleted;

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: tenant.currency }).format(amount);

  return (
    <Card className="overflow-hidden border-t-4 border-t-primary shadow-sm h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {campaignId ? 'Campaign Status' : 'Priority Fundraiser'}
            </p>
            <CardTitle className="text-lg font-bold leading-tight line-clamp-1" title={campaign.name}>
                {campaign.name}
            </CardTitle>
          </div>
          <Badge 
            variant={isCompleted ? "default" : isExpired ? "destructive" : "secondary"} 
            className={isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isCompleted ? "Goal Met" : isExpired ? "Ended" : "Active"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Big Percentage */}
        <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-foreground">
                {percent.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">funded</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
            <Progress 
                value={percent} 
                // FIX: Use Tailwind arbitrary child selector [&>*] to style the inner indicator
                // instead of the non-existent `indicatorClassName` prop.
                className={`h-3 bg-muted ${
                    percent >= 100 ? "[&>*]:bg-green-600" : 
                    percent >= 75 ? "[&>*]:bg-emerald-500" : 
                    percent >= 50 ? "[&>*]:bg-blue-500" : 
                    "[&>*]:bg-amber-500"
                }`}
            />
            <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-600"/> 
                    Raised: <span className="text-foreground">{formatMoney(campaign.raised_amount)}</span>
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3 text-blue-600"/> 
                    Goal: <span className="text-foreground">{formatMoney(campaign.goal_amount)}</span>
                </span>
            </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t bg-muted/10 flex justify-between items-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {isExpired 
                ? <span>Ended on {format(new Date(campaign.end_date), "MMM d, yyyy")}</span>
                : <span><strong className={daysLeft < 7 ? "text-amber-600" : ""}>{daysLeft} days</strong> remaining</span>
            }
        </div>
        <Link href={`/nonprofit/fundraising/${campaign.id}`} className="flex items-center hover:text-primary transition-colors">
            Details <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}