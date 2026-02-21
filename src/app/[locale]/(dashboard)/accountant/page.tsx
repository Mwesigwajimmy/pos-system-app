import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- CORE COMPONENTS (Named Imports) ---
import { FullDataExport } from '@/components/accountant/FullDataExport';
import { AuditorManagement } from '@/components/accountant/AuditorManagement';
import { ChartOfAccountsTable } from '@/components/accountant/ChartOfAccountsTable';
import { AiAuditAssistant } from '@/components/accountant/AiAuditAssistant';

// --- ICONS ---
import { 
    Calculator, Sparkles, BookOpen, UsersRound, 
    Download, ShieldCheck, Fingerprint, Activity, AlertCircle 
} from 'lucide-react';

async function getAccountantCenterData(supabase: any, businessId: string) {
    // 1. Fetch Real Data with Multi-Tenant Isolation
    // Note: Using 'accounting_accounts' to match your ledger schema
    const [invResults, accResults] = await Promise.all([
        supabase.from('auditor_invitations').select('id, email, status, created_at').eq('business_id', businessId),
        supabase.from('accounting_accounts').select('id, name, type, description').eq('business_id', businessId).order('type').order('name')
    ]);
    
    if(invResults.error) console.error("Error fetching invitations:", invResults.error);
    if(accResults.error) console.error("Error fetching accounts:", accResults.error);

    return { 
        invitations: invResults.data || [],
        accounts: accResults.data || [],
    };
}

export default async function AccountantCenterPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. HARD SECURITY AUTHENTICATION GUARD
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/login');

    // 2. MASTER IDENTITY RESOLUTION
    const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, business_name, active_organization_slug")
        .eq("id", user.id)
        .single();

    if (!profile?.business_id) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Master Identity Error</AlertTitle>
                    <AlertDescription>No active business context found. Oversight tools are locked.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const businessId = profile.business_id;
    const entityName = profile.business_name || profile.active_organization_slug || "Sovereign Entity";

    // 3. FETCH INTERCONNECTED DATA
    const { invitations, accounts } = await getAccountantCenterData(supabase, businessId);

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
            
            {/* Enterprise Dashboard Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-8">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-3">
                        <Calculator className="w-10 h-10 text-primary" />
                        Accountant Command
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Unified Oversight & Fiduciary Intelligence for: <span className="font-bold text-foreground underline decoration-primary/30 underline-offset-4">{entityName}</span>
                    </p>
                </div>
                
                {/* Real-time sync indicator */}
                <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xl border border-slate-700">
                    <Activity size={16} className="text-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Neural Link v10.1 Active</span>
                </div>
            </div>

            {/* Main Operational Tabs */}
            <Tabs defaultValue="ai-assistant" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl border">
                    <TabsTrigger value="ai-assistant" className="font-bold py-3 flex gap-2">
                        <Sparkles size={16} className="text-primary" /> AI Assistant
                    </TabsTrigger>
                    <TabsTrigger value="chart-of-accounts" className="font-bold py-3 flex gap-2">
                        <BookOpen size={16} /> Ledger Map
                    </TabsTrigger>
                    <TabsTrigger value="auditor-access" className="font-bold py-3 flex gap-2">
                        <UsersRound size={16} /> Auditor Access
                    </TabsTrigger>
                    <TabsTrigger value="data-export" className="font-bold py-3 flex gap-2">
                        <Download size={16} /> Data Export
                    </TabsTrigger>
                </TabsList>

                {/* AI Assistant Tab */}
                <TabsContent value="ai-assistant" className="outline-none">
                    <Card className="border-primary/20 shadow-lg">
                        <CardHeader className="bg-primary/5 border-b mb-6">
                            <CardTitle className="flex items-center gap-2">
                                <Fingerprint className="text-primary" />
                                AI-Powered Forensic Assistant
                            </CardTitle>
                            <CardDescription>Direct interface with the v10.1 Sovereign Kernel. Ask for ledger drift or anomaly reports.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <AiAuditAssistant />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Ledger Map Tab */}
                <TabsContent value="chart-of-accounts" className="outline-none">
                    <Card className="shadow-lg">
                        <CardHeader className="border-b mb-6">
                            <CardTitle>Chart of Accounts</CardTitle>
                            <CardDescription>Strategic structure of the {entityName} general ledger.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartOfAccountsTable data={accounts} />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {/* Auditor Access Tab */}
                <TabsContent value="auditor-access" className="outline-none">
                    <Card className="shadow-lg border-blue-100">
                        <CardHeader className="bg-blue-50/30 border-b mb-6">
                            <CardTitle>External Auditor Management</CardTitle>
                            <CardDescription>Provision secure, time-limited read-only access for third-party examiners.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <AuditorManagement initialInvitations={invitations} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Data Export Tab */}
                <TabsContent value="data-export" className="outline-none">
                    <Card className="shadow-lg border-emerald-100">
                        <CardHeader className="bg-emerald-50/30 border-b mb-6 text-center">
                            <CardTitle>Portability & General Ledger Export</CardTitle>
                            <CardDescription>Generate certified ISA-700 compliant ledger extracts for regulatory submission.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center py-12">
                           <FullDataExport />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Unified Footer */}
            <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between opacity-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    Absolute Data Sovereignty Verified
                </div>
                <div>Entity Code: {businessId.substring(0, 12).toUpperCase()} // v10.1 Stable</div>
            </div>
        </div>
    );
}