// src/components/telecom/data/ImportHistoryCard.tsx
'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// This interface defines the expected columns in the Excel file.
interface ImportedRow {
    Date: string;
    Agent: string;
    Type: string;
    Amount: number;
    'Customer Phone'?: string;
    Notes?: string;
}

export function ImportHistoryCard() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ImportedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        setIsParsing(true);
        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<ImportedRow>(worksheet);
                setParsedData(json);
                toast.success(`${json.length} records parsed from ${selectedFile.name}`);
            } catch (error) {
                toast.error("Failed to parse file. Please ensure it is a valid Excel/CSV format.");
                setParsedData([]);
            } finally {
                setIsParsing(false);
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const { mutate: importData, isPending } = useMutation({
        mutationFn: async (records: ImportedRow[]) => {
            const { error } = await supabase.rpc('bulk_import_telecom_transactions', {
                records: records // The RPC expects a JSON array with this structure
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Historical data imported successfully!");
            queryClient.invalidateQueries(); // Invalidate all queries to refresh data across the app
            setFile(null);
            setParsedData([]);
        },
        onError: (err: Error) => toast.error(`Import failed: ${err.message}`),
    });

    return (
        <div className="space-y-4">
            <Alert>
                <AlertTitle>Important: Column Names</AlertTitle>
                <AlertDescription>
                    Your Excel/CSV file must have headers named exactly: <strong>Date, Agent, Type, Amount</strong>. Optional columns: <strong>Customer Phone, Notes</strong>.
                </AlertDescription>
            </Alert>
            <Input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} disabled={isParsing} />
            
            {isParsing && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div>}

            {parsedData.length > 0 && (
                <div className="space-y-4">
                    <p className="text-sm font-medium">Data Preview (First 5 Rows)</p>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {parsedData.slice(0, 5).map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{row.Date}</TableCell>
                                        <TableCell>{row.Agent}</TableCell>
                                        <TableCell>{row.Type}</TableCell>
                                        <TableCell className="text-right">{row.Amount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <Button className="w-full" onClick={() => importData(parsedData)} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm & Import {parsedData.length} Records
                    </Button>
                </div>
            )}
        </div>
    );
}