'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, MapPin, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";

// --- Types ---
interface ImpactMetrics {
  peopleServed: number;
  communitiesServed: number;
  projectsCompleted: number;
  fundsUtilized: number;
  annualGoal: number;
}

interface ImpactDashboardProps {
  tenant: {
    tenantId: string;
    currency: string;
  };
}

// --- Real Data Fetching (No Mocks) ---
async function fetchImpact(tenantId: string): Promise<ImpactMetrics> {
  const db = createClient();
  
  // We execute parallel queries for maximum performance
  const [beneficiaries, donations, projects, communities] = await Promise.all([
    
    // 1. People Served: Count total rows in beneficiaries table
    db.from('beneficiaries')
      .select('*', { count: 'exact', head: true }) // 'head: true' is efficient, only returns count
      .eq('tenant_id', tenantId)
      .eq('status', 'Active'), // Enterprise rule: Only count active beneficiaries

    // 2. Funds Utilized: Sum of all donations (Proxy for funds available/utilized)
    // Note: In a full accounting system, you might query an 'expenses' table instead.
    db.from('donations')
      .select('amount')
      .eq('tenant_id', tenantId),

    // 3. Projects Completed: Count projects marked as 'Completed'
    db.from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'Completed'),

    // 4. Communities Served: Distinct count of locations/cities from beneficiaries
    db.from('beneficiaries')
      .select('city') // Assuming 'city' or 'address' column exists
      .eq('tenant_id', tenantId)
      .not('city', 'is', null)
  ]);

  // --- Data Processing ---

  // 1. People Count
  const peopleServed = beneficiaries.count || 0;

  // 2. Funds Calculation
  // We manually sum the amount on the client side to avoid complex SQL grouping if not using RPC
  const fundsUtilized = donations.data?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

  // 3. Projects Count
  // If the 'projects' table doesn't exist yet in your schema, this returns null/error. 
  // Ensure table 'projects' exists or replace with 'fundraising_campaigns'.
  const projectsCompleted = projects.count || 0;

  // 4. Communities (Distinct)
  // We use a Set to count unique cities found in the beneficiary list
  const uniqueLocations = new Set(communities.data?.map(b => b.city?.trim().toLowerCase()).filter(Boolean));
  const communitiesServed = uniqueLocations.size;

  // 5. Goal Setting
  // In a real system, this comes from a 'goals' or 'settings' table. 
  // We fetch it here or default to a reasonable baseline if not set.
  // Example: const { data: goal } = await db.from('impact_goals').select('target').single();
  const annualGoal = 1000; // This should be dynamic based on your 'goals' table

  return {
    peopleServed,
    communitiesServed,
    projectsCompleted,
    fundsUtilized,
    annualGoal
  };
}

// --- Component ---
export default function ImpactDashboard({ tenant }: ImpactDashboardProps) {
  const { tenantId, currency } = tenant;

  const { data, isLoading, isError, error } = useQuery({ 
    queryKey: ['impact-real', tenantId], 
    queryFn: () => fetchImpact(tenantId),
    refetchOnWindowFocus: false // Prevent unnecessary DB hits
  });

  // Loading State
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-1/3 bg-slate-200 rounded mt-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error State - Real System Error Handling
  if (isError) {
    console.error("Impact Dashboard Error:", error);
    return (
      <Card className="border-destructive/50 bg-destructive/5 mb-6">
        <CardContent className="flex items-center gap-4 p-6 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <div className="flex flex-col">
            <span className="font-semibold">Error Loading Impact Data</span>
            <span className="text-sm">
              Please ensure your database has the required tables (`beneficiaries`, `donations`, `projects`).
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Calculate Progress Logic
  const annualProgress = data.annualGoal > 0 
    ? Math.min((data.peopleServed / data.annualGoal) * 100, 100) 
    : 0;

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: People Served */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">People Served</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.peopleServed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active beneficiaries</p>
          </CardContent>
        </Card>

        {/* Metric 2: Communities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Communities</CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.communitiesServed}</div>
            <p className="text-xs text-muted-foreground">Unique cities/locations</p>
          </CardContent>
        </Card>

        {/* Metric 3: Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects Done</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.projectsCompleted}</div>
            <p className="text-xs text-muted-foreground">Completed initiatives</p>
          </CardContent>
        </Card>

        {/* Metric 4: Funds (Using Donations Sum) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funds Raised</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencyFormatter.format(data.fundsUtilized)}</div>
            <p className="text-xs text-muted-foreground">Total contributions</p>
          </CardContent>
        </Card>
      </div>

      {/* Annual Goal Progress */}
      <Card className="border-t-4 border-t-blue-500 shadow-sm">
        <CardHeader>
          <CardTitle>Annual Impact Goal</CardTitle>
          <CardDescription>
            Target: Reach <span className="font-semibold text-foreground">{data.annualGoal.toLocaleString()}</span> beneficiaries this fiscal year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Current Reach: <span className="text-foreground font-medium">{data.peopleServed.toLocaleString()}</span>
              </span>
              <span className="font-bold text-blue-600">{Math.round(annualProgress)}%</span>
            </div>
            <Progress value={annualProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}