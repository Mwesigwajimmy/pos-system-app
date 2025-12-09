'use client';

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, Phone, Mail, TrendingUp, MoreVertical, Search, Briefcase, UserPlus, LayoutGrid, List as ListIcon 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// --- Types ---
interface OfficerMetrics {
    active_loans: number;
    portfolio_value: number;
    par_30_rate: number; // Portfolio at Risk > 30 Days (%)
    monthly_target_achievement: number; // 0-100%
}

interface LoanOfficer {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
    status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED';
    branch_name: string;
    metrics: OfficerMetrics;
}

// --- Fetcher ---
async function fetchOfficers(tenantId: string) {
    const supabase = createClient();
    // RPC call to get aggregated officer performance
    const { data, error } = await supabase.rpc('get_loan_officer_performance', { 
        p_tenant_id: tenantId 
    });
    if (error) throw new Error(error.message);
    return data as LoanOfficer[];
}

export function LoanOfficersList({ tenantId }: { tenantId: string }) {
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
    const [search, setSearch] = React.useState('');

    const { data: officers, isLoading } = useQuery({
        queryKey: ['loan-officers', tenantId],
        queryFn: () => fetchOfficers(tenantId)
    });

    // Client-side filtering
    const filteredOfficers = officers?.filter(o => 
        o.full_name.toLowerCase().includes(search.toLowerCase()) || 
        o.email.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search officers..." 
                        className="pl-8" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <div className="border rounded-md flex p-1 bg-slate-100">
                        <Button 
                            variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                            size="sm" 
                            className="h-7 px-3"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={viewMode === 'list' ? 'default' : 'ghost'} 
                            size="sm" 
                            className="h-7 px-3"
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4"/> Add Officer
                    </Button>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOfficers?.map((officer) => (
                        <Card key={officer.id} className="hover:shadow-md transition-shadow group">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                        <AvatarImage src={officer.avatar_url || ''} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                            {officer.full_name.slice(0,2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base">{officer.full_name}</CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant={officer.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5">
                                                {officer.status.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{officer.branch_name}</span>
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4 text-muted-foreground"/></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Manage</DropdownMenuLabel>
                                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                                        <DropdownMenuItem>Reassign Portfolio</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">Suspend Access</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm mt-2">
                                <div className="grid grid-cols-2 gap-4 py-3 border-t border-b bg-slate-50/50 rounded-lg px-2">
                                    <div>
                                        <p className="text-muted-foreground text-xs font-medium uppercase">Portfolio Value</p>
                                        <p className="font-bold text-blue-700 text-lg">{formatCurrency(officer.metrics.portfolio_value)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted-foreground text-xs font-medium uppercase">Active Loans</p>
                                        <p className="font-bold text-lg">{officer.metrics.active_loans}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium text-slate-600">Monthly Target</span>
                                            <span className="text-xs font-bold">{officer.metrics.monthly_target_achievement}%</span>
                                        </div>
                                        <Progress value={officer.metrics.monthly_target_achievement} className="h-2" />
                                    </div>

                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="text-xs text-slate-600">Portfolio at Risk (30+)</span>
                                        <span className={`text-sm font-bold ${officer.metrics.par_30_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                            {officer.metrics.par_30_rate}%
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 gap-2">
                                <Button variant="outline" size="sm" className="w-full h-8 text-xs" asChild>
                                    <a href={`mailto:${officer.email}`}><Mail className="w-3 h-3 mr-2"/> Email</a>
                                </Button>
                                <Button variant="outline" size="sm" className="w-full h-8 text-xs" asChild>
                                    <a href={`tel:${officer.phone}`}><Phone className="w-3 h-3 mr-2"/> Call</a>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Officer Name</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Active Loans</TableHead>
                                <TableHead className="text-right">Portfolio Value</TableHead>
                                <TableHead className="text-right">Risk (PaR)</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOfficers?.map((officer) => (
                                <TableRow key={officer.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={officer.avatar_url || ''} />
                                            <AvatarFallback>{officer.full_name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {officer.full_name}
                                    </TableCell>
                                    <TableCell>{officer.branch_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={officer.status === 'ACTIVE' ? 'outline' : 'secondary'}>{officer.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{officer.metrics.active_loans}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(officer.metrics.portfolio_value)}</TableCell>
                                    <TableCell className={`text-right font-bold ${officer.metrics.par_30_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                        {officer.metrics.par_30_rate}%
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">View</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}