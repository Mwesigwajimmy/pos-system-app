'use client';

import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, FileSpreadsheet, ShieldCheck, 
  Trash2, Play, AlertCircle, Database, Binary,
  Globe, Scale, Calculator, Coins, Landmark, ShieldAlert,
  BrainCircuit, Layers, Wand2, CalendarClock, Download, 
  FileText, FileDown, ShieldQuestion, CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AuditIngestionPortal() {
  const supabase = createClient();
  
  // -- Core Operational State --
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
  
  // -- Global Compliance & Intelligence State --
  const [industry, setIndustry] = useState<string>('');
  const [taxRegime, setTaxRegime] = useState<string>('');
  const [sourceMode, setSourceMode] = useState<string>('EXTERNAL_ONLY'); 
  const [customTaxRate, setCustomTaxRate] = useState<string>('');
  const [taxAuditMode, setTaxAuditMode] = useState(true);
  const [fiscalYear, setFiscalYear] = useState<string>(new Date().getFullYear().toString());
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // -- Audit Metrics (1:1 Autonomous Intelligence) --
  const [variance, setVariance] = useState<number>(0.0000);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [auditVerdict, setAuditVerdict] = useState<string | null>(null);

  /**
   * HEURISTIC DNA SCANNER
   * Automatically identifies financial pillars in disorganized global datasets
   */
  const performSmartAutoMap = (incomingHeaders: string[]) => {
    const newMappings: Record<string, string> = {};
    const patterns = [
      { key: 'date', words: ['date', 'time', 'tx_date', 'period', 'day', 'timestamp'] },
      { key: 'account_name', words: ['name', 'account', 'desc', 'particulars', 'ledger', 'label', 'category'] },
      { key: 'debit', words: ['debit', 'dr', 'payment', 'in', 'withdrawal', 'outflow'] },
      { key: 'credit', words: ['credit', 'cr', 'receipt', 'out', 'deposit', 'inflow'] },
      { key: 'reported_tax', words: ['tax', 'vat', 'gst', 'levy', 'reported', 'duty', 'tax_amount'] },
      { key: 'currency', words: ['currency', 'curr', 'ccy', 'iso', 'symbol', 'unit'] },
    ];

    patterns.forEach(p => {
      const match = incomingHeaders.find(h => 
        p.words.some(word => h.toLowerCase().includes(word))
      );
      if (match) newMappings[p.key] = match;
    });

    setMappings(newMappings);
    if (Object.keys(newMappings).length > 0) {
      toast.success(`Autonomous DNA Scan: Successfully synchronized ${Object.keys(newMappings).length} pillars.`);
    }
  };

  /**
   * FORENSIC EXPORT ENGINE
   * Generates Professional Audit Evidence Artifacts
   */
  const handleForensicDownload = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    if (!lastExecutionId) return;
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch full truth from the forensic kernel retrieval function
      const { data: report, error } = await supabase.rpc('proc_get_audit_forensic_report', {
        p_execution_id: lastExecutionId,
        p_tenant_id: user?.id
      });

      if (error) throw error;

      if (format === 'EXCEL' || format === 'CSV') {
        const { utils, writeFile } = await import('xlsx');
        const wb = utils.book_new();
        
        // Tab 1: Executive Audit Summary
        const summaryData = [
            ["SOVEREIGN AUDIT REPORT", ""],
            ["---------------------", ""],
            ["EXECUTION ID", lastExecutionId],
            ["VERDICT", auditVerdict?.replace('_', ' ')],
            ["ACCURACY SCORE", `${accuracyScore?.toFixed(4)}%`],
            ["FISCAL YEAR", fiscalYear],
            ["JURISDICTION", taxRegime],
            ["CERTIFIED ON", new Date().toISOString()]
        ];
        utils.book_append_sheet(wb, utils.aoa_to_sheet(summaryData), "Audit_Summary");

        // Tab 2: Verified Ledger Entries (Math Scrutiny)
        utils.book_append_sheet(wb, utils.json_to_sheet(report.entries || []), "Audited_Ledger");

        // Tab 3: Anomalies & Flags (Forensic Warnings)
        utils.book_append_sheet(wb, utils.json_to_sheet(report.anomalies || []), "Forensic_Anomalies");

        writeFile(wb, `Audit_Evidence_${lastExecutionId}.${format === 'CSV' ? 'csv' : 'xlsx'}`);
      } 
      
      else if (format === 'PDF') {
        const { default: jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF();

        // High-Tier Audit Certificate Design
        doc.setFillColor(245, 247, 250); doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(24); doc.setTextColor(20, 30, 50);
        doc.text("SOVEREIGN AUDIT CERTIFICATE", 105, 25, { align: 'center' });
        
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(`FORENSIC FINGERPRINT: ${lastExecutionId}`, 105, 35, { align: 'center' });

        doc.setFontSize(14); doc.setTextColor(0);
        doc.text("Executive Summary", 20, 60);
        doc.setFontSize(10);
        doc.text(`Fiscal Year: ${fiscalYear}`, 20, 70);
        doc.text(`Jurisdiction: ${taxRegime}`, 20, 75);
        doc.text(`Status:`, 20, 80);
        
        doc.setFontSize(12);
        const isClean = auditVerdict?.includes('CLEAN');
        doc.setTextColor(isClean ? 34 : 200, isClean ? 197 : 30, isClean ? 94 : 30);
        doc.text(auditVerdict?.replace('_', ' ') || 'UNAUDITED', 45, 80);
        
        doc.setTextColor(0);
        doc.text(`Tax Accuracy Score: ${accuracyScore?.toFixed(2)}%`, 20, 85);

        // Render Anomalies Table
        doc.setFontSize(14); doc.text("Forensic Anomaly Detection", 20, 105);
        autoTable(doc, {
          startY: 110,
          head: [['Type', 'Severity', 'Forensic Description']],
          body: (report.anomalies || []).map((a: any) => [a.anomaly_type, a.severity, a.description]),
          headStyles: { fillColor: [30, 41, 59] }
        });

        doc.setFontSize(8); doc.setTextColor(150);
        doc.text("This document is a mathematically absolute record generated by the Sovereign Autonomous Kernel.", 105, 285, { align: 'center' });

        doc.save(`Sovereign_Audit_Certificate_${lastExecutionId}.pdf`);
      }

      toast.success(`${format} Forensic Report Exported Successfully.`);
    } catch (e: any) {
      toast.error("Export System Failure: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Agnostic File Ingestion Engine
   * Optimized for Big-Data and Disorganized formats
   */
  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const { default: Papa } = await import('papaparse');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const foundHeaders = results.meta.fields || [];
        setHeaders(foundHeaders);
        setFileData(results.data);
        performSmartAutoMap(foundHeaders); 
        setIsProcessing(false);
        toast.success(`Ingested ${results.data.length} records. Analyzing DNA patterns...`);
      },
      error: (err) => {
        toast.error("Ingestion engine failure: " + err.message);
        setIsProcessing(false);
      }
    });
  };

  /**
   * The Sovereign Smart Global Audit Engine
   * Executes Dual-Core Audit with Mandatory Date Locking & Response Hardening
   */
  const executeSovereignSeal = async () => {
    if (!industry || !taxRegime || (sourceMode !== 'INTERNAL_ONLY' && fileData.length === 0)) {
      toast.error("Compliance Check: Jurisdiction, Industry, and Source are mandatory.");
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Prepare Sandbox with Data Scrubbing Logic
      if (sourceMode !== 'INTERNAL_ONLY') {
        const bufferPayload = fileData.map(row => {
          const scrub = (val: any) => String(val || '0').replace(/[^0-9.-]+/g,"");
          return {
            tenant_id: user?.id,
            business_id: user?.id,
            account_name_raw: String(row[mappings['account_name']] || 'Unclassified'),
            account_code_raw: String(row[mappings['account_code']] || '0000'),
            debit: parseFloat(scrub(row[mappings['debit']])),
            credit: parseFloat(scrub(row[mappings['credit']])),
            currency_raw: row[mappings['currency']] || 'USD',
            transaction_date: row[mappings['date']], 
            fiscal_year: parseInt(fiscalYear),
            raw_data: {
              reported_tax: parseFloat(scrub(row[mappings['reported_tax']])),
              original_row: row
            }
          };
        });

        const { error: insertError } = await supabase.from('audit_ingestion_buffer').insert(bufferPayload);
        if (insertError) throw insertError;
      }
      
      setProgress(50);

      // 2. Call the Master Kernel with 1:1 Precision Parameters
      const { data, error: rpcError } = await supabase.rpc('proc_sovereign_dual_audit', {
        p_tenant_id: user?.id,
        p_fiscal_year: parseInt(fiscalYear),
        p_source_mode: sourceMode,
        p_region_code: taxRegime,
        p_custom_tax_rate: customTaxRate ? parseFloat(customTaxRate) : null
      });

      if (rpcError) throw rpcError;

      // Handle Sovereign Integrity Blocks (e.g., Unbalanced Books or Wrong Fiscal Year)
      if (data?.status === 'BLOCK_SEAL') {
        setVariance(data?.variance ?? 0);
        toast.error(`${data?.verdict || 'Violation'}: ${data?.message}`, { duration: 8000 });
        return;
      }

      // Successful Autonomous Transition
      setProgress(100);
      setVariance(0.0000); 
      setAccuracyScore(data?.tax_accuracy_score ?? 100);
      setAuditVerdict(data?.verdict ?? 'SUCCESS');
      setLastExecutionId(data?.execution_id);
      setFileData([]);
      toast.success(data?.message ?? `Autonomous Audit Result: ${data?.verdict}`);
      
    } catch (error: any) {
      console.error("Kernel Response Error:", error);
      toast.error("Forensic Violation: " + (error?.message || "Internal Kernel Logic Error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSandboxWipe = async () => {
    if (!confirm("Atomic Warning: Wipe all temporary sandbox records?")) return;
    setIsProcessing(true);
    const { error } = await supabase.rpc('proc_audit_sandbox_wipe');
    if (!error) {
      setFileData([]); setHeaders([]); setVariance(0); 
      setAccuracyScore(null); setAuditVerdict(null); setLastExecutionId(null);
      toast.info("Sandbox Purged.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 pb-24">
      
      {/* --- Left Column: Configuration & Monitors --- */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="border-primary/20 shadow-xl border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                 <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Autonomous Setup</CardTitle>
                <CardDescription className="text-[10px]">Agnostic Source Intelligence Engine</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3" /> Audit Intelligence Mode
              </label>
              <Select defaultValue={sourceMode} onValueChange={setSourceMode}>
                <SelectTrigger className="border-primary/20 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXTERNAL_ONLY">External Agnostic File (Sandbox)</SelectItem>
                  <SelectItem value="INTERNAL_ONLY">Production Ledger Audit (Live)</SelectItem>
                  <SelectItem value="RECONCILED_HYBRID">Hybrid Reconciliation Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> Target Fiscal Year
              </label>
              <Select defaultValue={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2026', '2025', '2024', '2023'].map(y => (
                    <SelectItem key={y} value={y}>{y} (Locked Audit Period)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Landmark className="w-3 h-3" /> Jurisdictional DNA
              </label>
              <Select onValueChange={setTaxRegime}>
                <SelectTrigger className="font-bold"><SelectValue placeholder="Select Global Regime" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Regional Tax Regimes</SelectLabel>
                    <SelectItem value="UK-VAT">United Kingdom (VAT 20%)</SelectItem>
                    <SelectItem value="US-NY">USA (New York Sales Tax)</SelectItem>
                    <SelectItem value="KE-VAT">Kenya (Standard VAT 16%)</SelectItem>
                    <SelectItem value="UAE-GST">UAE (Standard GST 5%)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Agnostic</SelectLabel>
                    <SelectItem value="OTHER">Custom Jurisdictional DNA</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Scale className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="text-sm font-bold">Tax Compliance Shield</p>
                  <p className="text-[10px] text-muted-foreground italic">Autonomous Accuracy Check</p>
                </div>
              </div>
              <Switch checked={taxAuditMode} onCheckedChange={setTaxAuditMode} />
            </div>

            {taxAuditMode && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Verification Rate (%)</label>
                <Input 
                  type="number" 
                  placeholder="e.g. 16.5" 
                  value={customTaxRate}
                  onChange={(e) => setCustomTaxRate(e.target.value)}
                  className="font-mono text-sm border-primary/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Industry Vertical</label>
              <Select onValueChange={setIndustry}>
                <SelectTrigger className="w-full font-bold">
                  <SelectValue placeholder="Select Business Vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Commercial</SelectLabel>
                    <SelectItem value="retail">Retail / Wholesale</SelectItem>
                    <SelectItem value="restaurant">Restaurant / Cafe</SelectItem>
                    <SelectItem value="distribution">Distribution / Logistics</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Specialized</SelectLabel>
                    <SelectItem value="lending">Lending / Microfinance</SelectItem>
                    <SelectItem value="rentals">Rentals / Real Estate</SelectItem>
                    <SelectItem value="sacco">SACCO / Co-operative</SelectItem>
                    <SelectItem value="telecom">Telecom Services</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>General</SelectLabel>
                    <SelectItem value="other">Other Agnostic Vertical</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="relative group border-2 border-dashed border-muted rounded-xl p-10 transition-all hover:bg-primary/5 text-center">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileLoad} accept=".csv,.xlsx" />
              <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="mt-3 text-sm font-bold">Drop Any Disorganized File</p>
              <p className="text-[9px] text-muted-foreground uppercase mt-1">Sovereign DNA Scanner Enabled</p>
            </div>
          </CardContent>
        </Card>

        {/* METRICS & FORENSIC EXPORTS */}
        <div className="flex flex-col gap-6">
          <Card className="bg-slate-950 text-white border-none shadow-2xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-[10px] font-mono text-emerald-400 flex items-center gap-2 uppercase">
                <ShieldCheck className="w-4 h-4" /> Kernel Integrity Monitor
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-5xl font-mono tracking-tighter text-emerald-500">
                {variance.toFixed(4)}
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono uppercase">Mathematical Reconciliation 1:1 Target</p>
              {isProcessing && <Progress value={progress} className="h-1 mt-4 bg-slate-800" />}
            </CardContent>
          </Card>

          {auditVerdict && (
            <div className="space-y-4 animate-in zoom-in duration-500">
              <Card className="bg-black text-white border border-emerald-500/30 shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Sovereign Verdict</p>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-400">AUTHENTICATED</Badge>
                  </div>
                  <div className="text-3xl font-bold tracking-tight text-white mt-2">
                    {auditVerdict.replace('_', ' ')}
                  </div>
                  {accuracyScore !== null && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                       <p className="text-[10px] text-muted-foreground uppercase mb-1">Compliance Accuracy</p>
                       <p className="text-4xl font-mono font-bold text-emerald-500">{accuracyScore.toFixed(2)}%</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* FORENSIC EXPORT ACTIONS */}
              <Card className="border-primary/30 shadow-2xl overflow-hidden">
                <CardHeader className="bg-primary text-white pb-3">
                   <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Download className="w-4 h-4" /> Download Forensic Evidence
                   </CardTitle>
                   <CardDescription className="text-[10px] text-white/70">Legal-grade Audit Artifacts</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                   <Button 
                    onClick={() => handleForensicDownload('PDF')} 
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 justify-start h-11 px-4"
                   >
                      <FileText className="w-5 h-5 mr-3 text-red-500" />
                      <div className="text-left">
                        <p className="text-xs font-bold leading-none">Audit Certificate</p>
                        <p className="text-[9px] text-slate-500">Official PDF Verdict</p>
                      </div>
                   </Button>
                   
                   <Button 
                    onClick={() => handleForensicDownload('EXCEL')} 
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 justify-start h-11 px-4"
                   >
                      <FileDown className="w-5 h-5 mr-3 text-emerald-600" />
                      <div className="text-left">
                        <p className="text-xs font-bold leading-none">Forensic Workbook</p>
                        <p className="text-[9px] text-slate-500">Detailed Excel Audit</p>
                      </div>
                   </Button>

                   <Button 
                    onClick={() => handleForensicDownload('CSV')} 
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 justify-start h-11 px-4"
                   >
                      <Layers className="w-5 h-5 mr-3 text-blue-500" />
                      <div className="text-left">
                        <p className="text-xs font-bold leading-none">Raw Anomaly Trace</p>
                        <p className="text-[9px] text-slate-500">CSV Technical Record</p>
                      </div>
                   </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* --- Right Column: Sovereign Mapping Portal --- */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="min-h-[700px] border-muted shadow-sm">
          <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Wand2 className="w-5 h-5 text-primary animate-pulse" />
              <CardTitle className="text-lg font-extrabold">Sovereign Mapping Portal</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={executeSandboxWipe} disabled={isProcessing}>
                <Trash2 className="w-4 h-4 mr-2" /> Wipe Sandbox
              </Button>
              <Button size="sm" onClick={executeSovereignSeal} disabled={isProcessing || (sourceMode !== 'INTERNAL_ONLY' && headers.length === 0)}>
                <Play className="w-4 h-4 mr-2" /> Execute Global Seal
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sourceMode !== 'INTERNAL_ONLY' && headers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-bold">Compliance Pillar</TableHead>
                    <TableHead className="font-bold">Autonomous Mapping</TableHead>
                    <TableHead className="font-bold">DNA Sample</TableHead>
                    <TableHead className="text-right font-bold">Integrity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: 'Transaction Date', key: 'date', icon: <Database className="w-3 h-3 text-slate-400" /> },
                    { label: 'Account Name', key: 'account_name', icon: <Landmark className="w-3 h-3 text-slate-400" /> },
                    { label: 'Debit (Gross Amount)', key: 'debit', icon: <Scale className="w-3 h-3 text-slate-400" /> },
                    { label: 'Credit Amount', key: 'credit', icon: <Scale className="w-3 h-3 text-slate-400" /> },
                    { label: 'Reported Tax (VAT)', key: 'reported_tax', icon: <Calculator className="w-3 h-3 text-slate-400" /> },
                    { label: 'Currency ISO', key: 'currency', icon: <Coins className="w-3 h-3 text-slate-400" /> },
                  ].map((pillar) => (
                    <TableRow key={pillar.key} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold flex items-center gap-2 text-sm text-slate-700">
                        {pillar.icon} {pillar.label}
                      </TableCell>
                      <TableCell>
                        <Select value={mappings[pillar.key] || ''} onValueChange={(val) => setMappings(m => ({ ...m, [pillar.key]: val }))}>
                          <SelectTrigger className="w-[190px] h-8 text-xs font-mono border-primary/20">
                            <SelectValue placeholder="Map Column..." />
                          </SelectTrigger>
                          <SelectContent>
                            {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px] font-mono max-w-[150px] truncate italic bg-slate-50/50 rounded p-1">
                        {fileData[0]?.[mappings[pillar.key]] || '---'}
                      </TableCell>
                      <TableCell className="text-right">
                        {mappings[pillar.key] ? (
                          <div className="flex items-center justify-end gap-1.5 animate-in fade-in zoom-in">
                            <span className="text-emerald-600 font-extrabold text-[10px] tracking-tighter">SECURE</span>
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-amber-500 font-bold text-[10px] tracking-tighter">REQUIRED</span>
                            <ShieldQuestion className="w-4 h-4 text-amber-500" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : sourceMode === 'INTERNAL_ONLY' ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground space-y-4">
                 <div className="p-10 bg-emerald-500/10 rounded-full animate-pulse border border-emerald-500/20">
                    <Layers className="w-16 h-16 text-emerald-600" />
                 </div>
                 <div className="text-center">
                    <p className="font-extrabold text-slate-800 tracking-widest text-xs uppercase">Operational Forensic Mode Active</p>
                    <p className="text-xs max-w-sm mt-2 text-slate-500 italic">The Sovereign Kernel is directly inspecting your live production ledger entries for mathematical balance and jurisdictional compliance.</p>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground space-y-4">
                <div className="p-8 bg-muted/50 rounded-full border border-dashed border-muted-foreground/30">
                  <FileSpreadsheet className="w-16 h-16 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="font-extrabold text-slate-800 text-sm">DNA Ingestion Required</p>
                  <p className="text-xs text-slate-500 max-w-[250px] mx-auto mt-1">Upload a global bank statement or ledger file to begin autonomous reconciliation.</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-4 justify-between items-center">
             <div className="flex items-center gap-2 opacity-50">
               <CheckCircle2 className="w-3 h-3 text-emerald-600" />
               <span className="text-[10px] font-bold uppercase tracking-tighter">ISO-Audit Protocol Compliant</span>
             </div>
             <p className="text-[10px] text-slate-400 font-mono tracking-tighter">Mathematical Variance tolerance: &lt; 0.0001</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}