import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullDataExport } from '@/components/accountant/FullDataExport';
import { AuditorManagement } from '@/components/accountant/AuditorManagement';
import { ChartOfAccountsTable } from '@/components/accountant/ChartOfAccountsTable';
import { AiAuditAssistant } from '@/components/accountant/AiAuditAssistant';

async function getAccountantCenterData(supabase: any) {
    const { data: invitations, error: invError } = await supabase.from('auditor_invitations').select('id, email, status, created_at');
    const { data: accounts, error: accError } = await supabase.from('accounts').select('id, name, type, description').order('type').order('name');
    
    if(invError) console.error("Error fetching invitations:", invError);
    if(accError) console.error("Error fetching accounts:", accError);

    return { 
        invitations: invitations || [],
        accounts: accounts || [],
    };
}

export default async function AccountantCenterPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { invitations, accounts } = await getAccountantCenterData(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Accountant & Auditor Command Center</h1>
                <p className="text-muted-foreground">The central hub for financial oversight, data export, and external collaboration.</p>
            </div>

            <Tabs defaultValue="ai-assistant" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="ai-assistant">AI Audit Assistant</TabsTrigger>
                    <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
                    <TabsTrigger value="auditor-access">Auditor Access</TabsTrigger>
                    <TabsTrigger value="data-export">Data Export</TabsTrigger>
                </TabsList>

                <TabsContent value="ai-assistant">
                    <Card>
                        <CardHeader>
                            <CardTitle>AI-Powered Audit Assistant</CardTitle>
                            <CardDescription>Ask complex questions about your financial data in plain English. The agent will find the answers for you.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <AiAuditAssistant />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="chart-of-accounts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Chart of Accounts</CardTitle>
                            <CardDescription>Review and manage the foundational accounts of your general ledger.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartOfAccountsTable data={accounts} />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="auditor-access">
                    <Card>
                        <CardHeader>
                            <CardTitle>External Auditor Access</CardTitle>
                            <CardDescription>Securely invite and manage access for your external auditors.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <AuditorManagement initialInvitations={invitations} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="data-export">
                    <Card>
                        <CardHeader>
                            <CardTitle>Full Data Export</CardTitle>
                            <CardDescription>
                                Download a complete, machine-readable history of all financial transactions for auditing or migration.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <FullDataExport />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}