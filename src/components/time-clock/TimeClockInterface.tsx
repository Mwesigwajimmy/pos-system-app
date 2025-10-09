'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Fetches the user's very last clock event to determine their current status.
async function getClockStatus() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('time_entries')
        .select('event_type')
        .eq('user_id', user.id)
        .order('event_timestamp', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') { // Ignore 'PGRST116' (no rows found)
        throw new Error(error.message);
    }
    // If no record is found, they are clocked out. Otherwise, return the last event type.
    return data ? data.event_type : 'CLOCK_OUT';
}

// Calls the secure backend function to clock in or out.
async function setClockStatus(eventType: 'CLOCK_IN' | 'CLOCK_OUT') {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('clock_in_out', { p_event_type: eventType });
    if (error) throw new Error(error.message);
    return data;
}

export default function TimeClockInterface() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const queryClient = useQueryClient();

    // Use React Query to fetch and manage the clock status.
    const { data: status, isLoading: isLoadingStatus } = useQuery({ 
        queryKey: ['clockStatus'], 
        queryFn: getClockStatus 
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const mutation = useMutation({
        mutationFn: setClockStatus,
        onSuccess: (data) => {
            toast.success(`Successfully Clocked ${data.current_status === 'CLOCK_IN' ? 'In' : 'Out'}!`);
            // Invalidate the query to refetch the new status.
            queryClient.invalidateQueries({ queryKey: ['clockStatus'] });
        },
        onError: (error: any) => toast.error(`Error: ${error.message}`),
    });

    const isClockedIn = status === 'CLOCK_IN';

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl">Employee Time Clock</CardTitle>
                <CardDescription>
                    {isLoadingStatus ? "Checking status..." : `You are currently Clocked ${isClockedIn ? 'In' : 'Out'}.`}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
                <div className="text-5xl font-bold bg-secondary p-4 rounded-lg">
                    {currentTime.toLocaleTimeString()}
                </div>
                <div className="flex gap-4">
                    <Button 
                        size="lg" 
                        className="w-full bg-green-600 hover:bg-green-700" 
                        onClick={() => mutation.mutate('CLOCK_IN')} 
                        disabled={isClockedIn || mutation.isPending || isLoadingStatus}
                    >
                        {mutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <LogIn className="mr-2 h-5 w-5"/>}
                        Clock In
                    </Button>
                    <Button 
                        size="lg" 
                        className="w-full bg-destructive hover:bg-red-700" 
                        onClick={() => mutation.mutate('CLOCK_OUT')} 
                        disabled={!isClockedIn || mutation.isPending || isLoadingStatus}
                    >
                        {mutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <LogOut className="mr-2 h-5 w-5"/>}
                        Clock Out
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}