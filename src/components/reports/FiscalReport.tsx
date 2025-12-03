'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';

// FIX: Enhanced Interface to support 'Period' strings (e.g. "January 2025")
export interface FiscalRow {
  label: string;
  value: number;
  currency: string;
  entity: string;
  country: string;
  period: string; // Updated from 'year' to 'period'
}

interface Props {
  data: FiscalRow[];
  year: number;
  month: number; // 0 = Full Year, 1-12 = Specific Month
}

export default function FiscalReportClient({ data, year, month }: Props) {
  const router = useRouter();

  // --- Enterprise Navigation Logic ---
  // Updates URL params without full page reload friction
  const updateParams = (newYear: number, newMonth: number) => {
    router.push(`?year=${newYear}&month=${newMonth}`, { scroll: false });
  };

  const handleYearChange = (delta: number) => {
    updateParams(year + delta, month);
  };

  const handleMonthChange = (val: string) => {
    updateParams(year, parseInt(val));
  };

  // --- Export Logic (Professional) ---
  const handleExport = () => {
    try {
        const headers = ["Label", "Entity", "Country", "Period", "Currency", "Value"];
        const csvRows = data.map(r => 
            `"${r.label}","${r.entity}","${r.country}","${r.period}","${r.currency}",${r.value}`
        );
        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Smart Filename Generation (e.g. Fiscal_Report_2025_01.csv)
        const periodSuffix = month === 0 ? `${year}` : `${year}_${month.toString().padStart(2, '0')}`;
        link.download = `Fiscal_Report_${periodSuffix}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Fiscal report exported successfully.");
    } catch (e) {
        toast.error("Export failed. Please try again.");
    }
  };

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="text-xl font-bold text-slate-900">Fiscal Position Report</CardTitle>
                <CardDescription>
                  Equity and Profit analysis for <span className="font-semibold text-slate-800">{data[0]?.period || year}</span>
                </CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* YEAR CONTROLS */}
                <div className="flex items-center bg-slate-100 rounded-md border border-slate-200">
                    <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white transition-colors" onClick={() => handleYearChange(-1)}>
                        <ChevronLeft className="h-4 w-4 text-slate-600"/>
                    </Button>
                    <span className="font-mono text-sm font-bold w-16 text-center text-slate-700">{year}</span>
                    <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white transition-colors" onClick={() => handleYearChange(1)}>
                        <ChevronRight className="h-4 w-4 text-slate-600"/>
                    </Button>
                </div>

                {/* MONTH SELECTOR (Enterprise Addition) */}
                <Select value={month.toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-[180px] h-9 bg-white">
                    <Calendar className="mr-2 h-4 w-4 text-slate-500" />
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="font-bold">Full Year {year}</SelectItem>
                    <div className="h-px bg-slate-100 my-1" />
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="default" className="ml-2 h-9" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4"/> Export CSV
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
              <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[300px]">Label</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Value</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {data.map((row, idx) => (
                  <TableRow key={idx} className={row.label === 'Closing Equity' ? 'bg-slate-50 font-bold border-t-2 border-slate-300' : 'hover:bg-slate-50/50 transition-colors'}>
                  <TableCell className="font-medium text-slate-700">{row.label}</TableCell>
                  <TableCell>{row.entity}</TableCell>
                  <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {row.country}
                      </span>
                  </TableCell>
                  <TableCell className="text-slate-500">{row.period}</TableCell>
                  <TableCell className="text-slate-500">{row.currency}</TableCell>
                  <TableCell className="text-right font-mono text-base text-slate-900">
                      {row.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  </TableRow>
              ))}
              </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}