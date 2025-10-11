// src/app/(dashboard)/telecom/live-sheet/page.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LiveSheetComponent } from '@/components/telecom/data/LiveSheetComponent';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Zap } from 'lucide-react';

export default function LiveSheetPage() {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Live Data Grid</h1>
                <p className="text-muted-foreground">A real-time, collaborative spreadsheet for managing telecom transactions.</p>
            </header>

            <Alert>
                <Zap className="h-4 w-4" />
                <AlertTitle>This is a Live Page!</AlertTitle>
                <AlertDescription>
                    Any changes you make here are saved instantly and will be visible to all other online admins immediately.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Transactions Sheet</CardTitle>
                    <CardDescription>Click on any cell to edit it. Changes are saved automatically.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LiveSheetComponent />
                </CardContent>
            </Card>
        </div>
    );
}