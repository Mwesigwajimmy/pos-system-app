'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';

interface AIInsight { insight: string; }

async function fetchAIInsight(): Promise<AIInsight> {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('daily-insight-ai');
    if (error) throw new Error(`AI Insight Error: ${error.message}`);
    return data;
}

export default function AIInsightCard() {
    const { data: insightData, isLoading, error } = useQuery({ 
        queryKey: ['aiInsight'], 
        queryFn: fetchAIInsight,
        staleTime: 60 * 60 * 1000, // Refetch insight every hour
    });

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary"/> AI Daily Insight</CardTitle></CardHeader>
            <CardContent className="text-sm">
                {isLoading && "Generating your daily insight..."}
                {error && `Could not generate an insight: ${error.message}`}
                {insightData && <p>{insightData.insight}</p>}
            </CardContent>
        </Card>
    );
}