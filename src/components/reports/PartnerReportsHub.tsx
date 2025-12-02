'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileDown, Search, Filter, FileText } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface PartnerReport {
  id: string;
  partner_name: string;
  report_type: string;
  currency_code: string;
  country_code: string;
  entity: string;
  period: string;
  year: number;
  file_url: string;
  created_at: string;
}

export default function PartnerReportsHubClient({ initialReports }: { initialReports: PartnerReport[] }) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() =>
    initialReports.filter(p =>
        p.partner_name.toLowerCase().includes(filter.toLowerCase()) ||
        p.entity.toLowerCase().includes(filter.toLowerCase()) ||
        p.report_type.toLowerCase().includes(filter.toLowerCase())
    ),
    [initialReports, filter]
  );

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle>Partner & External Reports Hub</CardTitle>
                <CardDescription>
                Secure repository for Audit Packs, Tax Filings, and HQ Reporting.
                </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search partner, entity, or type..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8" 
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Generated Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground flex flex-col items-center justify-center">
                        <FileText className="h-10 w-10 mb-2 opacity-20" />
                        No reports found matching your criteria.
                    </TableCell>
                </TableRow>
                ) : (
                filtered.map(r => (
                    <TableRow key={r.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{r.partner_name}</TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="font-normal">{r.report_type}</Badge>
                    </TableCell>
                    <TableCell>{r.entity}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-xs bg-slate-100 px-1 rounded">{r.country_code}</span>
                            <span className="text-xs text-muted-foreground">{r.currency_code}</span>
                        </div>
                    </TableCell>
                    <TableCell>{r.period} {r.year}</TableCell>
                    <TableCell className="text-slate-500">
                        {format(new Date(r.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                        <a 
                            href={r.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                        <FileDown className="h-4 w-4 mr-1.5" /> Download
                        </a>
                    </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}