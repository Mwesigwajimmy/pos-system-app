// src/components/dsr/StartShiftCard.tsx
'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- CHANGE 1: The location ID is now a string (for the UUID) ---
interface Location { id: string; name: string; }

interface StartShiftCardProps {
    locations: Location[];
    isLoadingLocations: boolean;
}

export function StartShiftCard({ locations, isLoadingLocations }: StartShiftCardProps) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [selectedLocation, setSelectedLocation] = React.useState<string | null>(null);

    const { mutate: startShift, isPending: isStartingShift } = useMutation({
        // The mutation function now correctly expects a string (UUID)
        mutationFn: async (locationId: string) => {
            // We pass the locationId directly to the RPC call
            const { error } = await supabase.rpc('start_dsr_shift', { p_location_id: locationId });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Shift started successfully! Your balances have been carried over.");
            queryClient.invalidateQueries({ queryKey: ['activeDsrShift'] });
        },
        onError: (err: Error) => toast.error(`Failed to start shift: ${err.message}`),
    });

    const handleStartShift = () => {
        if (!selectedLocation) {
            toast.error("Please select a location to start your shift.");
            return;
        }
        // --- CHANGE 2: We no longer need to convert the ID to a number ---
        startShift(selectedLocation);
    };

    return (
        <div className="p-4 md:p-6 max-w-lg mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Start Your Day</CardTitle>
                    <CardDescription>Select your location to begin a new shift. Your closing balances from your last shift will be automatically carried over as your opening balances.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select onValueChange={setSelectedLocation} disabled={isStartingShift || isLoadingLocations}>
                        <SelectTrigger>
                            <SelectValue placeholder={isLoadingLocations ? "Loading locations..." : "Select your work location..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {/* The value is now correctly treated as a string (UUID) */}
                            {locations?.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleStartShift} disabled={isStartingShift || !selectedLocation} className="w-full">
                        {isStartingShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Start Shift
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}