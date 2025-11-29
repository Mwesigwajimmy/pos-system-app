'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, MapPin, CheckCircle, TrendingUp } from "lucide-react";

interface ImpactMetrics {
  peopleServed: number;
  communitiesServed: number;
  projectsCompleted: number;
  fundsUtilized: number;
  annualGoal: number;
}

async function fetchImpact(tenantId: string) {
  const db = createClient();
  const { data, error } = await db.rpc('get_impact_dashboard', { tenant_id: tenantId });
  if (error) throw error;
  return data as ImpactMetrics;
}

export function ImpactDashboard({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['impact', tenantId], 
    queryFn: () => fetchImpact(tenantId) 
  });

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;
  if (!data) return <div className="p-4 text-red-500">Could not load impact data.</div>;

  const annualProgress = data.annualGoal > 0 ? (data.peopleServed / data.annualGoal) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">People Served</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.peopleServed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Lives impacted this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Communities</CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.communitiesServed}</div>
            <p className="text-xs text-muted-foreground">Unique locations reached</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects Done</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.projectsCompleted}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funds Utilized</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.fundsUtilized.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Direct program spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle>Annual Impact Goal</CardTitle>
          <CardDescription>Progress towards serving {data.annualGoal.toLocaleString()} people this year.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current: {data.peopleServed.toLocaleString()}</span>
              <span className="font-bold">{Math.round(annualProgress)}%</span>
            </div>
            <Progress value={annualProgress} className="h-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}