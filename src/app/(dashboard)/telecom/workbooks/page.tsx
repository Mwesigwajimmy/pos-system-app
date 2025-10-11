// src/app/(dashboard)/telecom/workbooks/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, FileSpreadsheet } from 'lucide-react';
import { CreateWorkbookModal } from '@/components/telecom/data/CreateWorkbookModal'; // We will create this next
import { useUserRole } from '@/hooks/useUserRole'; // Assuming you have this hook

interface Workbook {
    id: string;
    name: string;
    created_at: string;
}

export default function WorkbooksHubPage() {
    const supabase = createClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { role } = useUserRole(); // Check if the user is an admin

    const { data: workbooks, isLoading } = useQuery({
        queryKey: ['myWorkbooks'],
        queryFn: async (): Promise<Workbook[]> => {
            const { data, error } = await supabase.rpc('get_my_workbooks');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Live Workbooks</h1>
                    <p className="text-muted-foreground">Access shared, real-time spreadsheets for your daily tasks.</p>
                </div>
                {role === 'admin' && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4 sm:mt-0">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create & Share New Workbook
                    </Button>
                )}
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Your Workbooks</CardTitle>
                    <CardDescription>Click on a workbook to open the live sheet.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                    !workbooks || workbooks.length === 0 ? <p className="text-center text-muted-foreground py-8">No workbooks have been shared with you yet.</p> :
                    (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workbooks.map(wb => (
                                <Link key={wb.id} href={`/telecom/workbooks/${wb.id}`} passHref>
                                    <div className="p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                                        <div className="flex items-center">
                                            <FileSpreadsheet className="h-6 w-6 mr-3 text-primary"/>
                                            <h3 className="font-semibold">{wb.name}</h3>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* The modal is only rendered if the user is an admin */}
            {role === 'admin' && <CreateWorkbookModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />}
        </div>
    );
}