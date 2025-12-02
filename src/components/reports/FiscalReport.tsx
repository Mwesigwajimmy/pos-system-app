'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';

// FIX 1: Defined interface here and exported it (Removed import from page)
export interface FiscalRow {
  label: string;
  value: number;
  currency: string;
  entity: string;
  country: string;
  year: number;
}

interface Props {
  data: FiscalRow[];
  year: number;
}

export default function FiscalReportClient({ data, year }: Props) {
  const router = useRouter();

  const handleYearChange = (delta: number) => {
    router.push(`?year=${year + delta}`);
  };

  const handleExport = () => {
    try {
        const headers = ["Label", "Entity", "Country", "Year", "Currency", "Value"];
        const csvRows = data.map(r => 
            `"${r.label}","${r.entity}","${r.country}",${r.year},"${r.currency}",${r.value}`
        );
        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Fiscal_Report_${year}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Fiscal report exported.");
    } catch (e) {
        toast.error("Export failed.");
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Fiscal Year Report ({year})</CardTitle>
                <CardDescription>
                  Summarized Annual Equity & Profit Analysis.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleYearChange(-1)}>
                    <ChevronLeft className="h-4 w-4"/>
                </Button>
                <span className="font-mono text-lg font-bold w-16 text-center">{year}</span>
                <Button variant="outline" size="icon" onClick={() => handleYearChange(1)}>
                    <ChevronRight className="h-4 w-4"/>
                </Button>
                <Button variant="default" className="ml-4" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4"/> Export CSV
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Value</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {data.map((row, idx) => (
                <TableRow key={idx} className={row.label === 'Closing Equity' ? 'bg-slate-50 font-bold border-t-2 border-slate-300' : ''}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.entity}</TableCell>
                <TableCell>{row.country}</TableCell>
                <TableCell>{row.year}</TableCell>
                <TableCell>{row.currency}</TableCell>
                <TableCell className="text-right font-mono text-base">
                    {row.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}