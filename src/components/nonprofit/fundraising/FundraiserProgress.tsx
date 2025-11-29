'use client';

import * as React from "react";
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Target, TrendingUp } from "lucide-react";

interface CampaignData {
  id: string;
  name: string;
  goal: number;
  raised: number;
  status: string;
  end_date: string;
}

async function fetchCampaign(tenantId: string, campaignId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('fundraising_campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', campaignId)
    .single();
  
  if (error) throw error; 
  return data as CampaignData;
}

export function FundraiserProgress({ tenantId, campaignId }: { tenantId: string; campaignId: string }) {
  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ["fund-campaign", tenantId, campaignId], 
    queryFn: () => fetchCampaign(tenantId, campaignId)
  });

  if (isLoading) return <Card className="w-full h-40 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground"/></Card>;
  if (isError || !campaign) return <Card className="p-4 text-red-500 border-red-200">Failed to load campaign data.</Card>;

  // Defensive math to avoid division by zero or negative percentages
  const safeGoal = campaign.goal > 0 ? campaign.goal : 1;
  const percent = Math.min(Math.max((campaign.raised / safeGoal) * 100, 0), 100);
  const isCompleted = percent >= 100;

  return (
    <Card className="overflow-hidden border-t-4 border-t-blue-600 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold">{campaign.name}</CardTitle>
          <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? "bg-green-600" : ""}>
            {isCompleted ? "Goal Met!" : "In Progress"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex justify-between text-sm mb-2 text-muted-foreground">
          <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4"/> Raised: <b>{campaign.raised.toLocaleString()}</b></span>
          <span className="flex items-center gap-1"><Target className="w-4 h-4"/> Goal: <b>{campaign.goal.toLocaleString()}</b></span>
        </div>
        <Progress value={percent} className="h-3" />
      </CardContent>
      <CardFooter className="pt-2 justify-end">
        <span className="text-sm font-bold text-blue-600">{percent.toFixed(1)}% Funded</span>
      </CardFooter>
    </Card>
  );
}