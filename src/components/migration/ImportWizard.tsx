// src/components/migration/ImportWizard.tsx
'use client';

import React, { useState, useMemo, memo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, UploadCloud, CheckCircle, AlertTriangle, FileText, X } from 'lucide-react';

// --- 1. Type Definitions & Main Hook ---

type ImportStep = 'upload' | 'preview' | 'processing' | 'complete';
type ParsedRow = Record<string, string>;

interface ImportResult {
  status: 'success' | 'error';
  created?: number;
  updated?: number;
  total?: number;
  message?: string;
}

interface ImportWizardProps {
  dataType: string;         // e.g., 'products'
  rpcName: string;          // e.g., 'bulk_upsert_products'
  templateUrl: string;      // Path to the CSV template
  requiredColumns: string[];// Array of required header columns
}

/**
 * Custom hook to manage the state and logic of the import wizard.
 */
const useImportWizard = ({ requiredColumns, rpcName, dataType }: ImportWizardProps) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const supabase = createClient();

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setError(null);
    setFile(selectedFile);

    Papa.parse<ParsedRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const missingCols = requiredColumns.filter(col => !headers.includes(col));
        if (missingCols.length > 0) {
          setError(`File is missing required columns: ${missingCols.join(', ')}`);
          setFile(null);
        } else {
          setParsedData(results.data);
          setStep('preview');
        }
      },
      error: (err) => {
        setError(`Failed to parse file: ${err.message}`);
        setFile(null);
      }
    });
  };

  const { mutate: runImport, isPending } = useMutation({
    mutationFn: async (data: ParsedRow[]) => {
      const { data: resultData, error: rpcError } = await supabase.rpc(rpcName, { records: data });
      if (rpcError) throw new Error(rpcError.message);
      return resultData;
    },
    onSuccess: (data) => {
      setResult({ status: 'success', ...data });
      setStep('complete');
      toast.success(`Successfully imported ${data.total || 0} ${dataType}.`);
    },
    onError: (err) => {
      setResult({ status: 'error', message: err.message });
      setStep('complete');
      toast.error(`Import failed: ${err.message}`);
    }
  });

  const handleConfirmImport = () => {
    setStep('processing');
    runImport(parsedData);
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setError(null);
    setResult(null);
  };

  return { step, file, parsedData, error, result, isPending, handleFileSelect, handleConfirmImport, handleReset };
};


// --- 2. UI Sub-components for each Step ---

const UploadStep = memo(({ onFileSelect, templateUrl, requiredColumns, error, dataType }: { onFileSelect: (f: File) => void; templateUrl: string; requiredColumns: string[]; error: string | null; dataType: string; }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  return (
    <CardContent className="space-y-4">
      <label
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); onFileSelect(e.dataTransfer.files[0]); }}
        onDragOver={(e) => e.preventDefault()}
        className={`flex flex-col items-center justify-center w-full h-32 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent ${isDragging ? 'border-primary' : ''} ${error ? 'border-destructive' : ''}`}
      >
        <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-center text-muted-foreground">Click or drag & drop a .CSV file here</p>
        <input type="file" className="hidden" accept=".csv" onChange={(e) => onFileSelect(e.target.files?.[0]!)} />
      </label>
      {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
      <Button asChild variant="secondary" size="sm" className="w-full">
        <a href={templateUrl} download><Download className="mr-2 h-4 w-4" />Download {dataType} template</a>
      </Button>
      <div>
        <h4 className="text-sm font-semibold">Required Columns:</h4>
        <p className="text-xs text-muted-foreground break-words">{requiredColumns.join(', ')}</p>
      </div>
    </CardContent>
  );
});
UploadStep.displayName = 'UploadStep';

const PreviewStep = memo(({ file, data, onCancel }: { file: File | null; data: ParsedRow[]; onCancel: () => void }) => {
  const headers = useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data]);
  const previewData = useMemo(() => data.slice(0, 5), [data]);

  return (
    <CardContent className="space-y-4">
      <div className="flex items-center gap-2 p-2 text-sm border rounded-md bg-muted/50">
        <FileText className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium truncate flex-grow">{file?.name}</span>
        <button onClick={onCancel}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
      </div>
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>Found <span className="font-bold">{data.length}</span> rows to import. Review a preview below.</AlertDescription>
      </Alert>
      <div className="overflow-x-auto border rounded-md max-h-60">
        <Table className="text-xs">
          <TableHeader><TableRow>{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{previewData.map((row, i) => <TableRow key={i}>{headers.map(h => <TableCell key={h}>{row[h]}</TableCell>)}</TableRow>)}</TableBody>
        </Table>
      </div>
    </CardContent>
  );
});
PreviewStep.displayName = 'PreviewStep';

const ProcessingStep = memo(({ totalRows, dataType }: { totalRows: number; dataType: string; }) => (
  <CardContent className="flex flex-col items-center justify-center h-48 space-y-4 text-center">
    <h3 className="text-lg font-semibold">Importing Your Data...</h3>
    <Progress value={50} className="w-full animate-pulse" />
    <p className="text-muted-foreground">Processing {totalRows} {dataType}. Please don't close this page.</p>
  </CardContent>
));
ProcessingStep.displayName = 'ProcessingStep';

const CompletionStep = memo(({ result, dataType }: { result: ImportResult | null; dataType: string }) => {
  if (!result) return null;
  return (
    <CardContent className="flex flex-col items-center justify-center h-48 space-y-4 text-center">
      {result.status === 'success' ? (
        <>
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h3 className="text-lg font-semibold">Import Complete</h3>
          <p className="text-muted-foreground">
            Successfully imported {result.total} {dataType}.<br/>
            ({result.created} new, {result.updated} updated)
          </p>
        </>
      ) : (
        <>
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <h3 className="text-lg font-semibold">Import Failed</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{result.message}</p>
        </>
      )}
    </CardContent>
  );
});
CompletionStep.displayName = 'CompletionStep';


// --- 3. Main Wizard Component ---

export default function ImportWizard(props: ImportWizardProps) {
  const { step, file, parsedData, error, result, isPending, handleFileSelect, handleConfirmImport, handleReset } = useImportWizard(props);

  return (
    <>
      {step === 'upload' && <UploadStep onFileSelect={handleFileSelect} error={error} {...props} />}
      {step === 'preview' && <PreviewStep file={file} data={parsedData} onCancel={handleReset} />}
      {step === 'processing' && <ProcessingStep totalRows={parsedData.length} dataType={props.dataType} />}
      {step === 'complete' && <CompletionStep result={result} dataType={props.dataType} />}

      <CardFooter className="border-t pt-4">
        {step === 'preview' && (
          <Button onClick={handleConfirmImport} disabled={isPending} className="w-full">
            Confirm & Import {parsedData.length} {props.dataType}
          </Button>
        )}
        {step === 'complete' && (
          <Button onClick={handleReset} variant="secondary" className="w-full">
            Import Another File
          </Button>
        )}
      </CardFooter>
    </>
  );
}