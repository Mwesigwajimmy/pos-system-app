// src/components/dashboard/InsightsGrid.tsx
'use client';

import React from 'react';
import InsightCard from './InsightCard'; // This path now correctly resolves to InsightCard.tsx
import { Loader2, ServerCrash } from 'lucide-react';
import { useProactiveInsights } from '@/hooks/useProactiveInsights';

interface InsightsGridProps {
    onAskAI: (prompt: string) => void;
}

export default function InsightsGrid({ onAskAI }: InsightsGridProps) {
    const { data: insights, isLoading, isError, error } = useProactiveInsights();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>Aura is analyzing your business...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-destructive bg-destructive/10 rounded-lg">
                <ServerCrash className="h-8 w-8 mb-2" />
                <p className="font-semibold">Failed to Load AI Insights</p>
                <p className="text-xs">{error.message}</p>
            </div>
        );
    }

    if (!insights || insights.length === 0) {
        return (
            <div className="text-center h-48 flex flex-col justify-center items-center bg-muted/20 rounded-lg">
                <h3 className="font-semibold">All Clear!</h3>
                <p className="text-sm text-muted-foreground">Aura has not found any immediate actionable insights for you.</p>
            </div>
        );
    }

    return (
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} onAskAI={onAskAI} />
            ))}
        </div>
    );
}