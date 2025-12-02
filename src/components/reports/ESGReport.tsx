'use client';

import React from "react";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Leaf, 
  Users, 
  FileCheck, 
  Globe, 
  Download,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// FIX 1: Defined interface here and exported it (Removed import from page)
export interface ESGData {
  label: string;
  value: string;
  raw_value: number;
  unit: string;
  category: 'Environmental' | 'Social' | 'Governance';
  description: string;
  trend: 'up' | 'down' | 'neutral';
}

interface Props {
  metrics: ESGData[];
  year: number;
}

export default function ESGReportClient({ metrics, year }: Props) {
  
  const handleExport = () => {
    try {
        const headers = ["Category", "Metric", "Value", "Unit", "Description"];
        const csvRows = metrics.map(m => 
            `"${m.category}","${m.label}","${m.raw_value}","${m.unit}","${m.description}"`
        );
        const csvContent = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ESG_Report_${year}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Compliance report exported successfully.");
    } catch (e) {
        toast.error("Export failed.");
    }
  };

  const getIcon = (cat: string) => {
    switch(cat) {
        case 'Environmental': return <Leaf className="h-5 w-5 text-green-600" />;
        case 'Social': return <Users className="h-5 w-5 text-blue-600" />;
        case 'Governance': return <ShieldCheck className="h-5 w-5 text-purple-600" />;
        default: return <Globe className="h-5 w-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <Globe className="h-8 w-8 text-green-600" />
             ESG Impact Report
          </h1>
          <p className="text-slate-500 mt-1">
            Environmental, Social, and Governance compliance data for FY <span className="font-semibold text-slate-700">{year}</span>.
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="border-slate-300">
            <Download className="mr-2 h-4 w-4"/> Export Audit Data
        </Button>
      </div>

      {/* Impact Scorecards */}
      <div className="grid gap-6 md:grid-cols-3">
        {metrics.map((m, idx) => (
            <Card key={idx} className="border-t-4 border-t-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className={
                            m.category === 'Environmental' ? "bg-green-50 text-green-700 border-green-200" :
                            m.category === 'Social' ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-purple-50 text-purple-700 border-purple-200"
                        }>
                            {m.category}
                        </Badge>
                        {getIcon(m.category)}
                    </div>
                    <CardTitle className="text-lg font-medium text-slate-700 mt-2">
                        {m.label}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                        {m.value} <span className="text-sm font-normal text-slate-500">{m.unit}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                        {m.description}
                    </p>
                </CardContent>
            </Card>
        ))}
      </div>

      {/* Detailed Compliance Table */}
      <Card className="shadow-md border-slate-200">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-600"/> 
                Detailed Compliance Breakdown
            </CardTitle>
            <CardDescription>
                Raw metric data used for sustainability auditing and stakeholder reporting.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>Category</TableHead>
                        <TableHead>Metric Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Measured Value</TableHead>
                        <TableHead>Unit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {metrics.map((row, i) => (
                        <TableRow key={i}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    {getIcon(row.category)}
                                    {row.category}
                                </div>
                            </TableCell>
                            <TableCell>{row.label}</TableCell>
                            <TableCell className="text-slate-500 max-w-md">{row.description}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{row.value}</TableCell>
                            <TableCell className="text-slate-500">{row.unit}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}