// 1. FORCE DYNAMIC: Ensures calculations are real-time (Automatic)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
    Users, 
    HeartHandshake, 
    DollarSign, 
    TrendingUp, 
    ArrowRight, 
    Activity, 
    Megaphone,
    LayoutDashboard
} from 'lucide-react';

// --- DATA FETCHING ---
async function getExecutiveSummary(supabase: any, tenantId: string) {
    const today = new Date();
    // Get ISO string for the 1st day of the current month
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // EXECUTE QUERIES IN PARALLEL FOR PERFORMANCE
    const [
        donorsRes,
        donationsRes,
        volunteersRes,
        campaignsRes
    ] = await Promise.all([
        // 1. Total Active Donors
        supabase.from('donors')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('status', 'Active'),
        
        // 2. Donations this Month (Fetch amounts only to calculate Sum)
        supabase.from('donations')
            .select('amount')
            .eq('tenant_id', tenantId)
            .gte('date', firstDayOfMonth),

        // 3. Active Volunteers
        supabase.from('volunteers')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('status', 'Active'),

        // 4. Active Campaigns (Top 3 Priority by End Date)
        supabase.from('fundraising_campaigns')
            .select('id, name, raised_amount, goal_amount, end_date')
            .eq('tenant_id', tenantId)
            .eq('status', 'Active')
            .order('end_date', { ascending: true })
            .limit(3)
    ]);

    // AUTOMATIC CALCULATION: Sum up the donations array
    const totalDonationsMonth = donationsRes.data?.reduce((sum: number, record: any) => {
        return sum + (Number(record.amount) || 0);
    }, 0) || 0;

    return {
        donorCount: donorsRes.count || 0,
        monthlyDonations: totalDonationsMonth,
        volunteerCount: volunteersRes.count || 0,
        activeCampaigns: campaignsRes.data || []
    };
}

// --- PAGE COMPONENT ---
export default async function NonprofitDashboardPage({ params: { locale } }: { params: { locale: string } }) {
    // 1. Initialize Supabase
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 2. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}/auth/login`);

    // 3. Get Tenant Context (Security)
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("business_id, currency") 
        .eq("id", user.id)
        .single();

    if (error || !profile?.business_id) {
        return (
            <div className="flex h-[50vh] items-center justify-center p-8 text-destructive flex-col gap-2">
                <LayoutDashboard className="h-10 w-10 opacity-20" />
                <h2 className="text-lg font-semibold">Dashboard Unavailable</h2>
                <p className="text-muted-foreground">No Organization linked to this account.</p>
            </div>
        );
    }

    const tenantId = profile.business_id;
    const currency = profile.currency || 'USD';

    // 4. Fetch Real-Time Data
    const stats = await getExecutiveSummary(supabase, tenantId);

    // 5. Currency Formatter
    const formatMoney = (amount: number) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Executive Overview</h2>
                    <p className="text-muted-foreground">
                        Real-time impact metrics and fundraising performance.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/nonprofit/donations">
                        <Button className="shadow-sm">
                            <DollarSign className="mr-2 h-4 w-4" /> Log Donation
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Metric 1: Monthly Revenue */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMoney(stats.monthlyDonations)}</div>
                        <p className="text-xs text-muted-foreground">
                            Processed donations
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 2: Active Donors */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Donors</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.donorCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently engaged
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 3: Volunteer Force */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volunteer Force</CardTitle>
                        <HeartHandshake className="h-4 w-4 text-rose-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.volunteerCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Active volunteers
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 4: Campaigns */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <Megaphone className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeCampaigns.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Running initiatives
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Content Split: Campaigns vs Quick Links */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                
                {/* Left Column: Active Campaigns List */}
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle>Priority Campaigns</CardTitle>
                        <CardDescription>Top active fundraising initiatives approaching deadlines.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {stats.activeCampaigns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <Activity className="h-12 w-12 opacity-10 mb-3" />
                                <p>No active campaigns found.</p>
                                <Link href="/nonprofit/fundraising" className="text-primary text-sm font-medium hover:underline mt-1">
                                    Start a new fundraiser →
                                </Link>
                            </div>
                        ) : (
                            stats.activeCampaigns.map((c: any) => {
                                // Defensive Math: Avoid division by zero
                                const goal = c.goal_amount > 0 ? c.goal_amount : 1;
                                const percent = Math.min((c.raised_amount / goal) * 100, 100);
                                
                                // Conditional Styling for completed goals
                                // We use a CSS descendant selector via Tailwind to target the inner indicator
                                const progressBarClass = percent >= 100 ? "[&>*]:!bg-green-600" : "";

                                return (
                                    <div key={c.id} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-sm text-foreground">{c.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Ends {format(new Date(c.end_date), 'MMM d, yyyy')}
                                                </div>
                                            </div>
                                            <div className="text-sm font-bold text-primary">
                                                {percent.toFixed(0)}%
                                            </div>
                                        </div>
                                        {/* Progress Bar with safe dynamic styling */}
                                        <Progress 
                                            value={percent} 
                                            className={`h-2.5 ${progressBarClass}`} 
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                            <span>{formatMoney(c.raised_amount)} raised</span>
                                            <span>Goal: {formatMoney(c.goal_amount)}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Right Column: Module Shortcuts */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Quick Access</CardTitle>
                        <CardDescription>Navigate to core NGO modules.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <Link href="/nonprofit/donations">
                            <Button variant="outline" className="w-full justify-between h-11 hover:bg-muted/50">
                                <span className="flex items-center gap-3">
                                    <Users className="h-4 w-4 text-blue-500"/> Donor Management
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </Link>
                        <Link href="/nonprofit/grants">
                            <Button variant="outline" className="w-full justify-between h-11 hover:bg-muted/50">
                                <span className="flex items-center gap-3">
                                    <DollarSign className="h-4 w-4 text-green-500"/> Grants & Funding
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </Link>
                        <Link href="/nonprofit/communication">
                            <Button variant="outline" className="w-full justify-between h-11 hover:bg-muted/50">
                                <span className="flex items-center gap-3">
                                    <Megaphone className="h-4 w-4 text-purple-500"/> Campaigns & Comms
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </Link>
                        <Link href="/nonprofit/volunteering">
                            <Button variant="outline" className="w-full justify-between h-11 hover:bg-muted/50">
                                <span className="flex items-center gap-3">
                                    <HeartHandshake className="h-4 w-4 text-rose-500"/> Volunteers
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </Link>
                        <Link href="/nonprofit/impact">
                            <Button variant="outline" className="w-full justify-between h-11 hover:bg-muted/50">
                                <span className="flex items-center gap-3">
                                    <TrendingUp className="h-4 w-4 text-orange-500"/> Impact Reporting
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}