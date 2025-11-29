'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, Hourglass, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// --- EXPORTED INTERFACE ---
export interface DashboardStatsProps {
    activeClients: number;
    upcomingAppointments: number;
    overdueInvoices: number;
    unbilledHours: number;
}

export function DashboardStats({ stats }: { stats: DashboardStatsProps }) {
    // Enterprise Grade: Safe defaults if data is missing
    const safeStats = {
        activeClients: stats?.activeClients ?? 0,
        upcomingAppointments: stats?.upcomingAppointments ?? 0,
        overdueInvoices: stats?.overdueInvoices ?? 0,
        unbilledHours: stats?.unbilledHours ?? 0,
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Active Clients */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
                    <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{safeStats.activeClients}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total active accounts</p>
                </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Appointments</CardTitle>
                    <Calendar className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{safeStats.upcomingAppointments}</div>
                    <p className="text-xs text-muted-foreground mt-1">Scheduled for this week</p>
                </CardContent>
            </Card>

            {/* Overdue Invoices - Highlighting Critical State */}
            <Card className={cn("shadow-sm hover:shadow-md transition-shadow", safeStats.overdueInvoices > 0 ? "border-red-200 bg-red-50/10" : "")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Invoices</CardTitle>
                    <AlertCircle className={cn("h-4 w-4", safeStats.overdueInvoices > 0 ? "text-red-600" : "text-slate-400")} />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", safeStats.overdueInvoices > 0 ? "text-red-600" : "text-slate-900")}>
                        {safeStats.overdueInvoices}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Action required immediately</p>
                </CardContent>
            </Card>

            {/* Unbilled Hours */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Unbilled Hours</CardTitle>
                    <Hourglass className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{safeStats.unbilledHours.toFixed(1)}</div>
                    <div className="flex items-center text-xs text-green-600 mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>Ready to invoice</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}