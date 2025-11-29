'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, FileDown, Search, X } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PartnerReport {
  id: string;
  partner: string;
  reportType: string;
  currency: string;
  country: string;
  entity: string;
  period: string;
  year: number;
  fileUrl: string;
  tenantId: string;
  generatedAt: string;
}

export default function PartnerReportsHub() {
  const [reports, setReports] = useState<PartnerReport[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setReports([
        {
          id: "prpt-001",
          partner: "Ernst & Young",
          reportType: "Audit Pack",
          currency: "UGX",
          country: "UG",
          entity: "Main Comp Ltd.",
          period: "Q3",
          year: 2025,
          fileUrl: "/docs/audit-pack-ey-ug-2025-q3.pdf",
          tenantId: "tenant-001",
          generatedAt: "2025-11-05",
        },
        {
          id: "prpt-002",
          partner: "KPMG",
          reportType: "Tax Filing",
          currency: "AUD",
          country: "AU",
          entity: "Global Branch AU",
          period: "2025-10",
          year: 2025,
          fileUrl: "/docs/tax-filing-kpmg-au-2025-10.pdf",
          tenantId: "tenant-002",
          generatedAt: "2025-11-10",
        }
      ]);
      setLoading(false);
    }, 400);
  }, []);

  const filtered = useMemo(
    () =>
      reports.filter(
        p =>
          p.partner.toLowerCase().includes(filter.toLowerCase()) ||
          p.entity.toLowerCase().includes(filter.toLowerCase()) ||
          p.country.toLowerCase().includes(filter.toLowerCase()) ||
          p.reportType.toLowerCase().includes(filter.toLowerCase())
      ),
    [reports, filter]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner & External Reports Hub</CardTitle>
        <CardDescription>
          Exports and packages for auditors, tax bureaus, and regional/global HQ.
        </CardDescription>
        <div className="relative mt-3 max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by partner/entity/..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8" />
          {filter && <X className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setFilter('')}/>}
        </div>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-12 justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
          : (
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Export</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0
                    ? <TableRow><TableCell colSpan={9}>No partner reports found.</TableCell></TableRow>
                    : filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.partner}</TableCell>
                        <TableCell>{r.reportType}</TableCell>
                        <TableCell>{r.entity}</TableCell>
                        <TableCell>{r.country}</TableCell>
                        <TableCell>{r.currency}</TableCell>
                        <TableCell>{r.period}</TableCell>
                        <TableCell>{r.year}</TableCell>
                        <TableCell>{r.generatedAt}</TableCell>
                        <TableCell>
                          <a href={r.fileUrl} download className="text-green-700 inline-flex items-center">
                            <FileDown className="h-4 w-4 mr-1" />PDF
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
      </CardContent>
    </Card>
  );
}