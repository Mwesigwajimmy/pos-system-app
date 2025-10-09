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
interface AdminDashboardData {
  financialSummary: { total_revenue: number; total_expenses: number; net_profit: number; };
  lowStockItems: { product_name: string; variant_name: string; current_stock: number; }[];
  setupComplete: boolean;
}
interface LiveSale { id: number; total_amount: number; created_at: string; }
interface AIInsight { insight: string; }
interface SetupStatus { hasProducts: boolean; hasCustomers: boolean; }

// ----- DATA FETCHING FUNCTIONS -----
async function fetchDashboardData(): Promise<AdminDashboardData> {
    const supabase = createClient();
    const { data: dashboardData, error: dashboardError } = await supabase.rpc('get_admin_dashboard_data');
    if (dashboardError) throw new Error(dashboardError.message);

    const { data: business, error: businessError } = await supabase.from('businesses').select('setup_complete').limit(1).single();
    if (businessError && businessError.code !== 'PGRST116') throw new Error(businessError.message);

    return { ...dashboardData, setupComplete: business?.setup_complete ?? false };
}

async function fetchAIInsight(): Promise<AIInsight> {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('daily-insight-ai');
    if (error) throw new Error(error.message);
    return data;
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

// --- Sub-Component 1: The "Getting Started" Guide ---
const GettingStartedGuide = () => {
    const queryClient = useQueryClient();
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
            const { error } = await supabase.rpc('mark_setup_as_complete');
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Setup complete! Welcome to your dashboard.");
            // Invalidate the main dashboard query to refetch data and switch views
            queryClient.invalidateQueries({ queryKey: ['adminDashboardData'] });
        },
        onError: (error: any) => toast.error(`Error: ${error.message}`),
    });

    const pathname = usePathname();
    useEffect(() => { refetch(); }, [pathname, refetch]);

    const steps = [
        { title: "Add Your First Product", description: "Fill your inventory with items to sell.", link: "/inventory", complete: status?.hasProducts, icon: Boxes },
        { title: "Create a Customer", description: "Start building your client list.", link: "/customers", complete: status?.hasCustomers, icon: Users },
        { title: "Invite an Employee", description: "Add your team members and assign them roles.", link: "/employees", complete: false, icon: UsersRound },
        { title: "Configure Settings", description: "Update your business details and receipt.", link: "/settings", complete: false, icon: Settings },
    ];

    if (isLoading) return <div className="p-10 text-center">Loading setup guide...</div>;

    return (
        <Card className="w-full animate-in fade-in-50">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl">Welcome to UG-BizSuite!</CardTitle>
                <CardDescription>Follow these steps to get your business set up for success.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {steps.map(step => (
                    <div key={step.title} className="flex items-center gap-4 p-4 border rounded-lg">
                        {step.complete ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <Circle className="h-8 w-8 text-muted-foreground" />}
                        <div className="flex-1">
                            <h3 className="font-semibold">{step.title}</h3>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <Button variant="secondary" asChild><Link href={step.link}>Go</Link></Button>
                    </div>
                ))}
                <div className="pt-6 text-center">
                    <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending ? "Finalizing..." : "Finish Setup & Go to Dashboard"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Sub-Component 2: Live Sales Feed ---
const LiveSalesFeed = () => {
    const [liveSales, setLiveSales] = useState<LiveSale[]>([]);
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel('public:sales').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, (payload) => {
            const newSale = payload.new as LiveSale;
            setLiveSales(current => [newSale, ...current].slice(0, 5)); // Keep last 5
            toast.success(`New Sale #${newSale.id} processed!`);
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity /> Live Sales Feed</CardTitle></CardHeader>
            <CardContent>
                {liveSales.length === 0 ? <p className="text-center text-muted-foreground py-8">Waiting for new sales...</p> :
                    <AnimatePresence>
                        {liveSales.map(sale => (
                            <motion.div key={sale.id} layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-3 mb-2 border rounded-lg">
                                <div className="flex justify-between items-center"><span className="font-bold">Sale #{sale.id}</span><span className="text-green-500 font-semibold">{formatCurrency(sale.total_amount)}</span></div>
                                <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString()}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>}
            </CardContent>
        </Card>
    );
};

// --- Sub-Component 3: AI Insight Card ---
const AIInsightCard = () => {
    const { data: insightData, isLoading, error } = useQuery({ queryKey: ['aiInsight'], queryFn: fetchAIInsight });

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary" /> AI Daily Insight</CardTitle></CardHeader>
            <CardContent className="text-sm">
                {isLoading && "Generating your daily insight..."}
                {error && "Could not generate an insight at this time."}
                {insightData && <p>{insightData.insight}</p>}
            </CardContent>
        </Card>
    );
};

// --- Sub-Component 4: The Main Admin Dashboard Layout ---
const AdminDashboard = ({ data }: { data: AdminDashboardData }) => (
    <div className="space-y-6 animate-in fade-in-50">
        <AIInsightCard />
        <div className="grid gap-6 md:grid-cols-3">
            <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent className="text-3xl font-bold text-green-600">{formatCurrency(data.financialSummary.total_revenue)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Total Expenses</CardTitle></CardHeader><CardContent className="text-3xl font-bold text-red-600">{formatCurrency(data.financialSummary.total_expenses)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Net Profit</CardTitle></CardHeader><CardContent className={`text-3xl font-bold ${data.financialSummary.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(data.financialSummary.net_profit)}</CardContent></Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
            <LiveSalesFeed />
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" /> Low Stock Items</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Stock Remaining</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {data.lowStockItems?.length > 0 ? data.lowStockItems.map((item, i) => (
                                <TableRow key={i}><TableCell>{item.product_name} ({item.variant_name})</TableCell><TableCell className="text-right"><Badge variant="destructive">{item.current_stock}</Badge></TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={2} className="text-center h-24">No items are low on stock.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
);

// --- The Main Component that intelligently chooses which view to show ---
export default function DashboardClientPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['adminDashboardData'],
        queryFn: fetchDashboardData,
    });

    if (isLoading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
    if (error) return <div className="p-10 text-center text-red-500 rounded-lg border border-destructive bg-red-50"><strong>Error:</strong> {error.message}</div>;
    if (!data) return <div className="p-10 text-center">No data available.</div>;

    return data.setupComplete ? <AdminDashboard data={data} /> : <GettingStartedGuide />;
}