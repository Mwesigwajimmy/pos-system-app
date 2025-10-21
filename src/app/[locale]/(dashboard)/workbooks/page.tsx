// src/app/(dashboard)/workbooks/page.tsx
'use client';

import React, { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useUserRole } from '@/hooks/useUserRole';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, PlusCircle, FileSpreadsheet, AlertTriangle, Inbox } from 'lucide-react';
import { CreateWorkbookModal } from '@/components/core/CreateWorkbookModal';

// --- 1. Type Definitions & Custom Hook ---

interface Workbook {
    id: string;
    name: string;
    created_at: string;
}

/**
 * Custom hook to fetch the user's workbooks.
 * Encapsulates data fetching, loading, and error states.
 */
const useWorkbooks = () => {
    const supabase = createClient();
    return useQuery<Workbook[]>({
        queryKey: ['myWorkbooks'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_my_workbooks');
            if (error) throw new Error(error.message || 'Failed to fetch workbooks.');
            return data || [];
        }
    });
};

// --- 2. UI Sub-components ---

const WorkbooksPageHeader = memo(({ userRole, onOpenCreateModal }: { userRole?: string; onOpenCreateModal: () => void; }) => (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Workbooks</h1>
            <p className="text-muted-foreground">Access shared, real-time spreadsheets for collaborative tasks.</p>
        </div>
        {userRole === 'admin' && (
            <Button onClick={onOpenCreateModal} className="mt-4 sm:mt-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Create & Share New Workbook
            </Button>
        )}
    </header>
));
WorkbooksPageHeader.displayName = 'WorkbooksPageHeader';

const WorkbookCard = memo(({ workbook }: { workbook: Workbook }) => (
    <Link href={`/workbooks/${workbook.id}`} passHref legacyBehavior>
        <a className="block p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group">
            <div className="flex items-center">
                <FileSpreadsheet className="h-6 w-6 mr-3 text-primary transition-transform group-hover:scale-110" />
                <div>
                    <h3 className="font-semibold leading-snug">{workbook.name}</h3>
                    <p className="text-sm text-muted-foreground">
                        Created: {new Date(workbook.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </a>
    </Link>
));
WorkbookCard.displayName = 'WorkbookCard';

const WorkbookList = memo(({ workbooks }: { workbooks: Workbook[] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workbooks.map(wb => <WorkbookCard key={wb.id} workbook={wb} />)}
    </div>
));
WorkbookList.displayName = 'WorkbookList';

const LoadingSkeleton = memo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center p-4 border rounded-lg">
                <Skeleton className="h-8 w-8 mr-3 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
        ))}
    </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

const InfoState = memo(({ icon: Icon, title, message }: { icon: React.ElementType, title: string, message: string }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12">
        <Icon className="h-12 w-12 mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p>{message}</p>
    </div>
));
InfoState.displayName = 'InfoState';

// --- 3. Main Page Component ---

export default function WorkbooksHubPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { role } = useUserRole();
    const { data: workbooks, isLoading, isError, error } = useWorkbooks();

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSkeleton />;
        }
        if (isError) {
            return <InfoState icon={AlertTriangle} title="Failed to Load Workbooks" message={error.message} />;
        }
        if (!workbooks || workbooks.length === 0) {
            return <InfoState icon={Inbox} title="No Workbooks Found" message="No workbooks have been created or shared with you yet." />;
        }
        return <WorkbookList workbooks={workbooks} />;
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <WorkbooksPageHeader userRole={role} onOpenCreateModal={() => setIsCreateModalOpen(true)} />

            <Card>
                <CardHeader>
                    <CardTitle>Your Workbooks</CardTitle>
                    <CardDescription>Click on a workbook to open the live collaborative sheet.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>

            {role === 'admin' && <CreateWorkbookModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />}
        </div>
    );
}