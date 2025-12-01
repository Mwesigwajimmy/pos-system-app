'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';

// --- Imports matching your Named Exports ---
import { StartShiftCard } from '@/components/dsr/StartShiftCard';
import { RecordActivityForm } from '@/components/dsr/RecordActivityForm';
import { EndShiftDialog } from '@/components/dsr/EndShiftDialog';
import { UploadReceiptCard } from '@/components/dsr/UploadReceiptCard';
import { CashDepositForm } from '@/components/dsr/CashDepositForm';

// --- Type Definitions ---
interface Location {
  id: string;
  name: string;
}

interface Service {
  id: number;
  service_name: string;
}

interface ActiveShift {
  id: number; // Your UploadReceiptCard expects a number
  start_time: string;
  // Add other fields from your DB if needed
}

interface DsrClientViewProps {
  user: any;
  activeShift: ActiveShift | null;
  locations: Location[];
  services: Service[];
}

export default function DsrClientView({ 
  user, 
  activeShift, 
  locations, 
  services 
}: DsrClientViewProps) {
  const [isEndShiftDialogOpen, setIsEndShiftDialogOpen] = useState(false);

  // Helper to determine if shift is active
  const isShiftActive = !!activeShift;
  const shiftStartTime = activeShift ? new Date(activeShift.start_time) : null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Daily Sales Report
          </h2>
          <div className="flex items-center mt-2 space-x-2">
            <p className="text-muted-foreground text-sm">
              {isShiftActive 
                ? "Shift active. Record transactions and manage cash." 
                : "No active shift. Select location to start."}
            </p>
            {isShiftActive && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
        </div>

        {/* Header Actions */}
        {isShiftActive && (
          <div className="flex items-center gap-4 bg-card border rounded-lg p-2 px-4 shadow-sm">
            <div className="hidden md:block text-right border-r pr-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Shift Started
              </div>
              <div className="text-sm font-mono font-medium flex items-center justify-end">
                <Clock className="w-3 h-3 mr-1.5 text-primary" />
                {shiftStartTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setIsEndShiftDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              End Shift
            </Button>
          </div>
        )}
      </div>

      <Separator className="my-4" />

      {/* --- DASHBOARD CONTENT --- */}
      <div className="animate-in fade-in-50 duration-500">
        
        {!isShiftActive ? (
          // STATE A: NO SHIFT
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 max-w-5xl mx-auto mt-8">
            <div className="lg:col-span-2">
              <StartShiftCard 
                locations={locations} 
                isLoadingLocations={false} 
              />
            </div>
            
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-6">
                 <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-sm">Operator Notice</h3>
                 </div>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   Please ensure you have counted your opening float before starting the shift. All actions are logged under <strong>{user?.email}</strong>.
                 </p>
              </div>
            </div>
          </div>
        ) : (
          // STATE B: ACTIVE SHIFT
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            
            {/* Left Column: Sales & Activities */}
            <div className="lg:col-span-7 space-y-6">
              <RecordActivityForm services={services} />
            </div>

            {/* Right Column: Cash Management */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* FIXED: No shiftId prop passed here, matching your file */}
              <CashDepositForm />
              
              {/* FIXED: Passed shiftId as number, matching your file */}
              <UploadReceiptCard shiftId={Number(activeShift!.id)} />

            </div>
          </div>
        )}
      </div>

      {/* --- DIALOGS --- */}
      <EndShiftDialog 
        isOpen={isEndShiftDialogOpen} 
        onClose={() => setIsEndShiftDialogOpen(false)} 
      />
    </div>
  );
}