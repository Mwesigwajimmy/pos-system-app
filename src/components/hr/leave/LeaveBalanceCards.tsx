'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, HeartPulse, Bed } from "lucide-react";

// Define the type for a single leave balance object.
// This should match the structure returned by your Supabase RPC function.
interface LeaveBalance {
    leave_type_name: string;
    available_days: number;
    accrued_days: number;
    used_days: number;
}

interface LeaveBalanceCardsProps {
    balances: LeaveBalance[];
}

// A simple utility to get a relevant icon based on the leave type name.
const getIconForLeaveType = (leaveType: string) => {
    const lowerCaseType = leaveType.toLowerCase();
    if (lowerCaseType.includes('annual') || lowerCaseType.includes('vacation')) {
        return <Briefcase className="h-6 w-6 text-muted-foreground" />;
    }
    if (lowerCaseType.includes('sick')) {
        return <HeartPulse className="h-6 w-6 text-muted-foreground" />;
    }
    return <Bed className="h-6 w-6 text-muted-foreground" />; // Default icon
};

export function LeaveBalanceCards({ balances }: LeaveBalanceCardsProps) {
    if (!balances || balances.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Leave Balances</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No leave balance information available. Please contact HR to set up your entitlements.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {balances.map((balance) => (
                <Card key={balance.leave_type_name}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {balance.leave_type_name}
                        </CardTitle>
                        {getIconForLeaveType(balance.leave_type_name)}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {balance.available_days} Days
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {balance.accrued_days} Accrued - {balance.used_days} Used
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}