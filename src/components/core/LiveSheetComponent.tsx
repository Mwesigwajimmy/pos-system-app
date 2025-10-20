'use client';

import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueSetterParams } from 'ag-grid-community';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// AG Grid Styles
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css"; 

// UI Components
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// --- 1. Type Definitions ---

interface CellData {
  row_index: number;
  column_index: number;
  cell_value: string;
  workbook_id: string;
}

type SheetData = CellData[];
type GridRow = { [key: string]: string | number };
type RealtimeStatus = 'SUBSCRIBING' | 'SUBSCRIBED' | 'CLOSED' | 'ERROR';

const QUERY_KEY = (workbookId: string) => ['workbookData', workbookId];

// --- 2. Custom Hook for All Logic (`useLiveSheet`) ---

const useLiveSheet = (workbookId: string) => {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('CLOSED');

  // --- DATA FETCHING ---
  const { data: sheetData = [], isLoading } = useQuery<SheetData>({
    queryKey: QUERY_KEY(workbookId),
    queryFn: async () => {
      const { data, error } = await supabase.from('workbook_data').select('*').eq('workbook_id', workbookId);
      if (error) throw new Error(error.message);
      return data || [];
    },
    refetchOnWindowFocus: false,
  });

  // --- DATA MUTATION ---
  const { mutate: updateCell } = useMutation({
    mutationFn: async (params: { rowIndex: number; colIndex: number; value: string }) => {
      const { error } = await supabase.rpc('update_workbook_cell', {
        p_workbook_id: workbookId,
        p_row_index: params.rowIndex,
        p_col_index: params.colIndex,
        p_value: params.value,
      });
      if (error) throw new Error(error.message);
      return params;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY(workbookId) });
      const previousData = queryClient.getQueryData<SheetData>(QUERY_KEY(workbookId)) || [];
      queryClient.setQueryData<SheetData>(QUERY_KEY(workbookId), (old = []) => {
        const existingCell = old.find(c => c.row_index === newData.rowIndex && c.column_index === newData.colIndex);
        if (existingCell) {
          return old.map(c => (c === existingCell ? { ...c, cell_value: newData.value } : c));
        }
        return [...old, { workbook_id: workbookId, row_index: newData.rowIndex, column_index: newData.colIndex, cell_value: newData.value }];
      });
      return { previousData };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEY(workbookId), context.previousData);
      }
      toast.error(`Sync Error: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(workbookId) });
    },
  });

  // --- REAL-TIME SUBSCRIPTION ---
  useEffect(() => {
    setStatus('SUBSCRIBING');
    const channel: RealtimeChannel = supabase
      .channel(`workbook-${workbookId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'workbook_data', filter: `workbook_id=eq.${workbookId}` },
        (payload) => {
          const newCell = payload.new as CellData;
          toast.info("Sheet updated by another user.");
          queryClient.setQueryData<SheetData>(QUERY_KEY(workbookId), (old = []) => {
            const existingCellIndex = old.findIndex(c => c.row_index === newCell.row_index && c.column_index === newCell.column_index);
            if (existingCellIndex !== -1) {
              const updatedData = [...old];
              updatedData[existingCellIndex] = newCell;
              return updatedData;
            }
            return [...old, newCell];
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') setStatus('SUBSCRIBED');
        if (status === 'CHANNEL_ERROR' || err) {
          setStatus('ERROR');
          toast.error("Real-time connection error.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setStatus('CLOSED');
    };
  }, [supabase, queryClient, workbookId]);

  // --- DATA TRANSFORMATION for AG Grid ---
  const { rowData, columnDefs } = useMemo(() => {
    const MIN_ROWS = 100;
    const MIN_COLS = 26;

    const maxRow = sheetData.length > 0 ? Math.max(...sheetData.map(c => c.row_index)) : 0;
    const maxCol = sheetData.length > 0 ? Math.max(...sheetData.map(c => c.column_index)) : 0;

    const gridRowCount = Math.max(maxRow + 1, MIN_ROWS);
    const gridColCount = Math.max(maxCol + 1, MIN_COLS);
    
    const cellMap = new Map<string, string>();
    sheetData.forEach(cell => {
      cellMap.set(`${cell.row_index}:${cell.column_index}`, cell.cell_value);
    });

    const gridData: GridRow[] = Array.from({ length: gridRowCount }, (_, rowIndex) => {
      const row: GridRow = { id: rowIndex };
      for (let colIndex = 0; colIndex < gridColCount; colIndex++) {
        row[`col_${colIndex}`] = cellMap.get(`${rowIndex}:${colIndex}`) || '';
      }
      return row;
    });

    const valueSetter = useCallback((params: ValueSetterParams): boolean => {
      // FIX: Safely access rowIndex after checking that params.node exists and has a valid index.
      if (!params.node || params.node.rowIndex === null) {
        return false; // Cannot update if we don't know the row index.
      }
      const rowIndex = params.node.rowIndex;
      const colId = params.colDef.field!;
      const colIndex = parseInt(colId.split('_')[1], 10);
      
      if (params.newValue !== params.oldValue) {
        updateCell({ rowIndex, colIndex, value: String(params.newValue ?? '') });
      }
      return true;
    }, [updateCell]);
    
    const cols: ColDef[] = Array.from({ length: gridColCount }, (_, i) => ({
      headerName: String.fromCharCode(65 + i),
      field: `col_${i}`,
      editable: true,
      valueSetter,
    }));

    return { rowData: gridData, columnDefs: cols };
  }, [sheetData, updateCell]);

  return { isLoading, status, rowData, columnDefs };
};

// --- 3. UI Sub-components ---

const SheetLoader = memo(() => (
  <div className="flex justify-center items-center h-full w-full absolute inset-0 bg-background/50 z-10">
    <div className="flex items-center space-x-3 p-4 bg-background rounded-lg shadow-lg">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-lg font-medium">Loading Live Workbook...</p>
    </div>
  </div>
));
SheetLoader.displayName = 'SheetLoader';

const LiveSheetStatus = memo(({ status }: { status: RealtimeStatus }) => {
  const statusConfig = {
    SUBSCRIBING: { text: 'Connecting...', color: 'bg-yellow-400', ping: true },
    SUBSCRIBED: { text: 'Live Sync Active', color: 'bg-green-500', ping: true },
    CLOSED: { text: 'Disconnected', color: 'bg-gray-500', ping: false },
    ERROR: { text: 'Connection Error', color: 'bg-red-500', ping: false },
  };
  const config = statusConfig[status];

  return (
    <Badge variant="secondary" className="flex items-center space-x-2">
      <span className="relative flex h-2 w-2">
        {config.ping && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.color}`}></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`}></span>
      </span>
      <span>{config.text}</span>
    </Badge>
  );
});
LiveSheetStatus.displayName = 'LiveSheetStatus';

// --- 4. Main Component ---

export function LiveSheetComponent({ workbookId }: { workbookId: string }) {
  const { isLoading, status, rowData, columnDefs } = useLiveSheet(workbookId);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    minWidth: 100,
  }), []);

  return (
    <div className="relative h-[75vh] flex flex-col">
      <div className="flex justify-end mb-2">
        <LiveSheetStatus status={status} />
      </div>
      <div className="ag-theme-alpine-dark flex-grow">
        {isLoading && <SheetLoader />}
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(params) => params.data.id}
          rowBuffer={20}
        />
      </div>
    </div>
  );
}