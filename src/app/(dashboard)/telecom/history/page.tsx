// src/app/(dashboard)/telecom/history/page.tsx
'use client';

import React from 'react';

// --- UI & Icon Imports ---
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { History, Upload, Download } from 'lucide-react';

// --- Custom Component Imports ---
// We will create these two new components in the next steps.
import { ExportRecordsCard } from '@/components/telecom/data/ExportRecordsCard';
import { ImportHistoryCard } from '@/components/telecom/data/ImportHistoryCard';

export default function FinancialHistoryPage() {
    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Financial History & Data Tools</h1>
                <p className="text-muted-foreground">Export, print, and import historical financial records for your telecom business.</p>
            </header>

            <Tabs defaultValue="export" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="export"><Download className="mr-2 h-4 w-4"/> Export & Print Records</TabsTrigger>
                    <TabsTrigger value="import"><Upload className="mr-2 h-4 w-4"/> Import Historical Data</TabsTrigger>
                </TabsList>
                
                <TabsContent value="export">
                    <Card>
                        <CardHeader>
                            <CardTitle>Export Transaction Records</CardTitle>
                            <CardDescription>
                                Select a date range to download a CSV file or print a report of all transactions, perfect for monthly filing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ExportRecordsCard />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="import">
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Historical Data from Excel/CSV</CardTitle>
                            <CardDescription>
                                Migrate your old records into the system. Upload a file with columns for date, type, amount, etc.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ImportHistoryCard />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}