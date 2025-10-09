// src/components/distribution/DistributionDashboard.tsx

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, Route, ClipboardCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

async function fetchDistributionSummary() {
    const supabase = createClient();
    // This is a placeholder for a real RPC function you would build to get summary data
    // For example: `get_distribution_summary`
    const { data: activeLoads } = await supabase.from('van_loads').select('*').eq('status', 'Loaded');
    return {
        activeRoutes: 5, // Placeholder
        vehiclesInFleet: 10, // Placeholder
        activeLoads: activeLoads || [],
    };
}

export default function DistributionDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['distributionSummary'],
        queryFn: fetchDistributionSummary,
    });

    const features = [
        { title: "Manage Routes & Vehicles", description: "Define sales routes and manage your fleet.", href: "/distribution/routes", icon: Route },
        { title: "Van Loading", description: "Load inventory onto vehicles for daily sales routes.", href: "/distribution/loading", icon: Truck },
        { title: "Route Settlement", description: "Reconcile van sales, cash, and inventory at end of day.", href: "/distribution/settlement", icon: ClipboardCheck },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Distribution & Van Sales</h1>
                <p className="text-muted-foreground">The central hub for managing your entire supply chain and route-to-market operations.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                {features.map(feature => (
                    <Card key={feature.title} className="flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <feature.icon className="h-8 w-8 text-primary" />
                                <div>
                                    <CardTitle>{feature.title}</CardTitle>
                                    <CardDescription>{feature.description}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <div className="flex-grow"></div>
                        <div className="p-4 pt-0">
                            <Button asChild className="w-full">
                                <Link href={feature.href}>Go to Feature</Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Active Van Loads</CardTitle>
                    <CardDescription>Vans currently out on their sales routes.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Load ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.activeLoads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No active van loads.</TableCell>
                                    </TableRow>
                                ) : (
                                    data?.activeLoads.map((load: any) => (
                                        <TableRow key={load.id}>
                                            <TableCell className="font-medium">#{load.id}</TableCell>
                                            <TableCell>{format(new Date(load.load_date), 'PPP')}</TableCell>
                                            <TableCell><span className="text-green-600 font-semibold">{load.status}</span></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}