// src/components/telecom/data/LiveSheetComponent.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// --- AG Grid Imports (The Free Alternative) ---
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// --- UI & Icon Imports ---
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// --- Type Definition for a single record ---
interface LiveRecord {
    id: number;
    transaction_date: string;
    agent_name: string;
    transaction_type: string;
    amount: number;
    notes: string | null;
}

export function LiveSheetComponent() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const { data: sheetData, isLoading } = useQuery({
        queryKey: ['liveSheetData'],
        queryFn: async (): Promise<LiveRecord[]> => {
            const { data, error } = await supabase.rpc('get_live_sheet_data');
            if (error) throw new Error(error.message);
            return data || [];
        },
    });

    const { mutate: updateRecord } = useMutation({
        mutationFn: async ({ id, column, value }: { id: number; column: string; value: any }) => {
            const { error } = await supabase.rpc('update_live_sheet_record', {
                p_record_id: id, p_column_name: column, p_new_value: value,
            });
            if (error) throw new Error(error.message);
        },
        onError: (err: Error) => toast.error(`Sync Error: ${err.message}`),
    });

    useEffect(() => {
        const channel = supabase
            .channel('live_sheet_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'telecom_transactions' }, (payload) => {
                toast.info("Data updated in real-time.");
                queryClient.invalidateQueries({ queryKey: ['liveSheetData'] });
            })
            .subscribe();
        
        return () => { supabase.removeChannel(channel); };
    }, [supabase, queryClient]);

    // Define the columns for AG Grid
    const columnDefs = useMemo<ColDef[]>(() => [
        { field: 'id', headerName: 'ID', editable: false, width: 80 },
        { field: 'transaction_date', headerName: 'Date', editable: true, filter: 'agDateColumnFilter' },
        { field: 'agent_name', headerName: 'Agent', editable: true, filter: true },
        { field: 'transaction_type', headerName: 'Type', editable: true, filter: true },
        { field: 'amount', headerName: 'Amount', editable: true, filter: 'agNumberColumnFilter', valueFormatter: p => `UGX ${p.value.toLocaleString()}` },
        { field: 'notes', headerName: 'Notes', editable: true, flex: 1 },
    ], []);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4">Loading Live Grid...</p></div>;
    }

    return (
        <div>
            <div className="flex justify-end mb-2">
                <Badge variant="secondary" className="flex items-center">
                    <span className="relative flex h-2 w-2 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live Sync Active
                </Badge>
            </div>
            {/* AG Grid component is themed with 'alpine-dark' for dark mode */}
            <div className="ag-theme-alpine-dark" style={{ height: '60vh', width: '100%' }}>
                <AgGridReact
                    rowData={sheetData}
                    columnDefs={columnDefs}
                    defaultColDef={{
                        sortable: true,
                        resizable: true,
                    }}
                    onCellValueChanged={(event) => {
                        // This event fires after a user edits a cell
                        const { id, ...data } = event.data;
                        const column = event.colDef.field as string;
                        const newValue = data[column];
                        updateRecord({ id, column, value: newValue });
                    }}
                />
            </div>
        </div>
    );
}