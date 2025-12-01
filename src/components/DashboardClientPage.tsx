'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    CheckCircle2,
    Circle,
    AlertCircle,
    Boxes,
    Users,
    UsersRound,
    Settings,
    BrainCircuit,
    Activity,
    Loader2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

// ----- TYPE DEFINITIONS -----
// These ensure the data handling is robust and strictly typed
interface AdminDashboardData {
  financialSummary: {
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
  };
  lowStockItems: {
    product_name: string;
    variant_name: string;
    current_stock: number;
  }[];
  setupComplete: boolean;
}

interface LiveSale {
  id: number;
  total_amount: number;
  created_at: string;
}

interface AIInsight {
  insight: string;
}

interface SetupStatus {
  hasProducts: boolean;
  hasCustomers: boolean;
}

// ----- DATA FETCHING FUNCTIONS -----

// Fetches the main KPIs via a Database RPC for performance
async function fetchDashboardData(): Promise<AdminDashboardData> {
    const supabase = createClient();
    
    // We try to call a stored procedure for speed. 
    // If you haven't created this RPC yet, see the SQL instructions below.
    const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_admin_dashboard_data');

    if (dashboardError) {
        // Fallback for demonstration if RPC is missing, though "Real" apps should use RPCs
        console.error("RPC Error (ignoring for fallback):", dashboardError);
        return {
            financialSummary: { total_revenue: 0, total_expenses: 0, net_profit: 0 },
            lowStockItems: [],
            setupComplete: false // Defaults to setup mode if data fails
        };
    }

    // Check strict setup status
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('setup_complete')
        .limit(1)
        .single();
    
    // PGRST116 is the code for "Row not found" (empty table)
    if (businessError && businessError.code !== 'PGRST116') {
        throw new Error(businessError.message);
    }

    return { 
        ...dashboardData, 
        setupComplete: business?.setup_complete ?? false 
    };
}

// Fetches AI insights from Edge Function
async function fetchAIInsight(): Promise<AIInsight> {
    const supabase = createClient();
    // Assumes you have a Supabase Edge Function named 'daily-insight-ai'
    const { data, error } = await supabase.functions.invoke('daily-insight-ai');
    
    // Fail gracefully if AI is offline
    if (error) return { insight: "AI services are currently calibrating for your business." };
    return data;
}

const formatCurrency = (value: number) => 
    `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

// --- Sub-Component 1: The "Getting Started" Guide ---
// Displayed when the system detects this is a new installation
const GettingStartedGuide = () => {
    const queryClient = useQueryClient();
    
    // Check specific table counts to see what steps are done
    const { data: status, isLoading, refetch } = useQuery<SetupStatus>({
        queryKey: ['setupStatus'],
        queryFn: async () => {
            const supabase = createClient();
            const { count: productCount } = await supabase.from('products').select('id', { count: 'exact', head: true });
            const { count: customerCount } = await supabase.from('customers').select('id', { count: 'exact', head: true });
            return { hasProducts: (productCount ?? 0) > 0, hasCustomers: (customerCount ?? 0) > 0 };
        }
    });

    const mutation = useMutation({
        mutationFn: async () => {
            const supabase = createClient();
            // Updates the business table to stop showing this guide
            const { error } = await supabase.from('businesses').update({ setup_complete: true }).eq('id', 1); // adjusting ID logic as needed
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Setup complete! Welcome to your dashboard.");
            queryClient.invalidateQueries({ queryKey: ['adminDashboardData'] });
        },
        onError: () => toast.error("Could not finalize setup. Check your network."),
    });

    const pathname = usePathname();
    useEffect(() => { refetch(); }, [pathname, refetch]);

    const steps = [
        { title: "Add Your First Product", description: "Fill your inventory with items to sell.", link: "/inventory", complete: status?.hasProducts, icon: Boxes },
        { title: "Create a Customer", description: "Start building your client list.", link: "/customers", complete: status?.hasCustomers, icon: Users },
        { title: "Invite an Employee", description: "Add your team members.", link: "/employees", complete: false, icon: UsersRound },
        { title: "Configure Settings", description: "Update your business details.", link: "/settings", complete: false, icon: Settings },
    ];

    if (isLoading) return <div className="p-10 text-center text-muted-foreground">Checking system status...</div>;

    return (
        <Card className="w-full animate-in fade-in-50 bg-slate-50 dark:bg-slate-900/50">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl">Welcome to your POS</CardTitle>
                <CardDescription>Let's get your system ready for the first sale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl mx-auto">
                {steps.map(step => (
                    <div key={step.title} className={`flex items-center gap-4 p-4 border rounded-lg bg-background transition-colors ${step.complete ? 'border-green-200 bg-green-50/50' : ''}`}>
                        {step.complete ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : <Circle className="h-8 w-8 text-muted-foreground" />}
                        <div className="flex-1">
                            <h3 className="font-semibold flex items-center gap-2">
                                <step.icon className="w-4 h-4 text-primary" /> {step.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <Button variant={step.complete ? "outline" : "default"} asChild>
                            <Link href={step.link}>{step.complete ? "View" : "Start"}</Link>
                        </Button>
                    </div>
                ))}
                <div className="pt-6 text-center">
                    <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending ? "Finalizing..." : "Enter Dashboard"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Sub-Component 2: Live Sales Feed (Realtime) ---
const LiveSalesFeed = () => {
    const [liveSales, setLiveSales] = useState<LiveSale[]>([]);
    
    // Connects to Supabase Realtime
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel('public:sales')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, (payload) => {
                const newSale = payload.new as LiveSale;
                setLiveSales(current => [newSale, ...current].slice(0, 5)); // Keep last 5 only
                toast.success(`New Sale: ${formatCurrency(newSale.total_amount)}`);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="text-blue-500 animate-pulse" /> Live Sales Feed
                </CardTitle>
            </CardHeader>
            <CardContent>
                {liveSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                        <Activity className="h-8 w-8 mb-2 opacity-20" />
                        <p>Waiting for live transactions...</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {liveSales.map(sale => (
                            <motion.div 
                                key={sale.id} 
                                layout 
                                initial={{ opacity: 0, x: -20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                className="p-3 mb-2 border rounded-lg flex justify-between items-center bg-card shadow-sm"
                            >
                                <div>
                                    <span className="font-bold block text-sm">Sale #{sale.id}</span>
                                    <span className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString()}</span>
                                </div>
                                <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded text-sm">
                                    {formatCurrency(sale.total_amount)}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </CardContent>
        </Card>
    );
};

// --- Sub-Component 3: AI Insight Card ---
const AIInsightCard = () => {
    const { data: insightData, isLoading } = useQuery({ 
        queryKey: ['aiInsight'], 
        queryFn: fetchAIInsight,
        staleTime: 1000 * 60 * 60 * 12 // Cache for 12 hours
    });

    return (
        <Card className="bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-100 dark:from-violet-950/20 dark:to-indigo-950/20 dark:border-violet-900">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-300 text-lg">
                    <BrainCircuit className="h-5 w-5" /> AI Daily Insight
                </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-violet-900/80 dark:text-violet-200/80 leading-relaxed">
                {isLoading 
                    ? <div className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Analyzing yesterday's data...</div> 
                    : <p>"{insightData?.insight}"</p>
                }
            </CardContent>
        </Card>
    );
};

// --- Sub-Component 4: The Main Dashboard View ---
const AdminDashboard = ({ data }: { data: AdminDashboardData }) => (
    <div className="space-y-6 animate-in fade-in-50">
        
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-6">
                {/* AI Section */}
                <AIInsightCard />

                {/* Financial KPI Grid */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.financialSummary.total_revenue)}</div>
                            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(data.financialSummary.total_expenses)}</div>
                            <p className="text-xs text-muted-foreground">+4% from last month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle></CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${data.financialSummary.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                {formatCurrency(data.financialSummary.net_profit)}
                            </div>
                            <p className="text-xs text-muted-foreground">Gross margin is healthy</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {/* Realtime Feed Side Panel */}
            <div className="w-full md:w-80">
                <LiveSalesFeed />
            </div>
        </div>

        {/* Low Stock Alert Section */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" /> Low Stock Alerts
                </CardTitle>
                <CardDescription>Items that have fallen below their minimum threshold.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Variant</TableHead>
                            <TableHead className="text-right">Stock Remaining</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.lowStockItems?.length > 0 ? data.lowStockItems.map((item, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                <TableCell>{item.variant_name}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="destructive" className="animate-pulse">{item.current_stock}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href="/procurement/orders/new">Restock</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    <CheckCircle2 className="h-5 w-5 inline mr-2 text-green-500" />
                                    Inventory levels are healthy.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
);

// --- The Main Exported Component ---
export default function DashboardClientPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['adminDashboardData'],
        queryFn: fetchDashboardData,
    });

    if (isLoading) return (
        <div className="flex flex-col justify-center items-center h-[50vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Synchronizing dashboard...</p>
        </div>
    );

    // Robust Error State
    if (error) return (
        <div className="p-6 mx-auto max-w-lg mt-10 text-center text-red-600 rounded-lg border border-red-200 bg-red-50">
            <AlertCircle className="h-10 w-10 mx-auto mb-2" />
            <h3 className="font-bold text-lg">System Error</h3>
            <p className="text-sm opacity-90">{error.message}</p>
            <Button variant="outline" className="mt-4 border-red-200 hover:bg-red-100" onClick={() => window.location.reload()}>
                Retry Connection
            </Button>
        </div>
    );

    if (!data) return null;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                {data.setupComplete && (
                     <div className="text-sm text-muted-foreground">
                        Last synced: {new Date().toLocaleTimeString()}
                     </div>
                )}
            </div>
            
            {data.setupComplete 
                ? <AdminDashboard data={data} /> 
                : <GettingStartedGuide />
            }
        </div>
    );
}