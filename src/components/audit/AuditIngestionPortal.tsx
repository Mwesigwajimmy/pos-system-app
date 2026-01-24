'use client';

import React, { useState } from 'react';
import { 
  UploadCloud, FileSpreadsheet, ShieldCheck, 
  Trash2, Play, AlertCircle, Database, Binary,
  Globe, Scale, Calculator, Coins, Landmark, ShieldAlert,
  BrainCircuit, Layers, Wand2, CalendarClock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
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

export default function AuditIngestionPortal() {
  const supabase = createClient();
  
  // -- Core Operational State --
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  
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
   * Automatically identifies columns in disorganized or large datasets
   */
  const performSmartAutoMap = (incomingHeaders: string[]) => {
    const newMappings: Record<string, string> = {};
    const patterns = [
      { key: 'date', words: ['date', 'time', 'tx_date', 'period', 'day'] },
      { key: 'account_name', words: ['name', 'account', 'desc', 'particulars', 'ledger', 'label'] },
      { key: 'debit', words: ['debit', 'dr', 'payment', 'in', 'withdrawal'] },
      { key: 'credit', words: ['credit', 'cr', 'receipt', 'out', 'deposit'] },
      { key: 'reported_tax', words: ['tax', 'vat', 'gst', 'levy', 'reported', 'duty'] },
      { key: 'currency', words: ['currency', 'curr', 'ccy', 'iso', 'symbol'] },
    ];

    patterns.forEach(p => {
      const match = incomingHeaders.find(h => 
        p.words.some(word => h.toLowerCase().includes(word))
      );
      if (match) newMappings[p.key] = match;
    });

    setMappings(newMappings);
    if (Object.keys(newMappings).length > 0) {
      toast.success(`Autonomous DNA Scan: Found ${Object.keys(newMappings).length} pillars in the file.`);
    }
  };

  /**
   * Agnostic File Ingestion Engine
   * High-capacity parsing for large and disorganized global formats
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
        toast.success(`Ingested ${results.data.length} records. System analyzing DNA...`);
      },
      error: (err) => {
        toast.error("Ingestion engine failure: " + err.message);
        setIsProcessing(false);
      }
    });
  };

  /**
   * The Sovereign Smart Global Audit Engine
   * Executes Dual-Core Audit with Mandatory Date Locking & Parameter Sync
   */
  const executeSovereignSeal = async () => {
    if (!industry || !taxRegime || (sourceMode !== 'INTERNAL_ONLY' && fileData.length === 0)) {
      toast.error("Compliance Check: Jurisdiction, Industry, and Data Source are mandatory.");
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();

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

      // RPC CALL: Synchronized with SQL Master Kernel
      const { data, error: rpcError } = await supabase.rpc('proc_sovereign_dual_audit', {
        p_tenant_id: user?.id,
        p_fiscal_year: parseInt(fiscalYear),
        p_source_mode: sourceMode,
        p_region_code: taxRegime,
        p_custom_tax_rate: customTaxRate ? parseFloat(customTaxRate) : null
      });

      if (rpcError) throw rpcError;

      if (data.status === 'BLOCK_SEAL') {
        setVariance(data.variance || 0);
        toast.error(`${data.verdict}: ${data.message}`, { duration: 5000 });
        return;
      }

      setProgress(100);
      setVariance(0.0000); 
      setAccuracyScore(data.tax_accuracy_score);
      setAuditVerdict(data.verdict);
      setFileData([]);
      toast.success(`Autonomous Audit Result: ${data.verdict}`);
      
    } catch (error: any) {
      toast.error("Kernel Violation: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSandboxWipe = async () => {
    if (!confirm("Atomic Warning: Wipe all temporary sandbox records?")) return;
    setIsProcessing(true);
    const { error } = await supabase.rpc('proc_audit_sandbox_wipe');
    if (!error) {
      setFileData([]); setHeaders([]); setVariance(0); setAccuracyScore(null); setAuditVerdict(null);
      toast.info("Sandbox Purged.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* --- Left Column: Configuration & Status --- */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="border-primary/20 shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Autonomous Setup</CardTitle>
                <CardDescription>Multi-Format Support Active</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3" /> Audit Intelligence Mode
              </label>
              <Select defaultValue={sourceMode} onValueChange={setSourceMode}>
                <SelectTrigger className="border-primary/30"><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['2026', '2025', '2024', '2023'].map(y => (
                    <SelectItem key={y} value={y}>{y} (Locked Audit)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Landmark className="w-3 h-3" /> Jurisdictional DNA
              </label>
              <Select onValueChange={setTaxRegime}>
                <SelectTrigger><SelectValue placeholder="Select Country/Regime" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Global Standards</SelectLabel>
                    <SelectItem value="UK-VAT">UK Standard VAT (20%)</SelectItem>
                    <SelectItem value="US-NY">USA (New York State)</SelectItem>
                    <SelectItem value="KE-VAT">Kenya Standard (16%)</SelectItem>
                    <SelectItem value="UAE-GST">UAE (Standard GST 5%)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Custom</SelectLabel>
                    <SelectItem value="OTHER">Agnostic / Custom DNA</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Scale className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="text-sm font-bold">Tax Accuracy Shield</p>
                  <p className="text-[10px] text-muted-foreground italic">Consultant Fraud Defense</p>
                </div>
              </div>
              <Switch checked={taxAuditMode} onCheckedChange={setTaxAuditMode} />
            </div>

            {taxAuditMode && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Manual Verification Rate (%)</label>
                <Input 
                  type="number" 
                  placeholder="e.g. 16.5" 
                  value={customTaxRate}
                  onChange={(e) => setCustomTaxRate(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {/* FULL INDUSTRY DNA LIST INCLUDED */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Industry Vertical</label>
              <Select onValueChange={setIndustry}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Business DNA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Common</SelectLabel>
                    <SelectItem value="retail">Retail / Wholesale</SelectItem>
                    <SelectItem value="restaurant">Restaurant / Cafe</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Trades & Services</SelectLabel>
                    <SelectItem value="contractor">Contractor (General, Remodeling)</SelectItem>
                    <SelectItem value="field_service">Field Service (Trades, HVAC, Plumbing)</SelectItem>
                    <SelectItem value="professional">Professional Services (Accounting, Legal)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Specialized</SelectLabel>
                    <SelectItem value="distribution">Distribution</SelectItem>
                    <SelectItem value="lending">Lending / Microfinance</SelectItem>
                    <SelectItem value="rentals">Rentals / Real Estate</SelectItem>
                    <SelectItem value="sacco">SACCO / Co-operative</SelectItem>
                    <SelectItem value="telecom">Telecom Services</SelectItem>
                    <SelectItem value="nonprofit">Nonprofit</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>General</SelectLabel>
                    <SelectItem value="other">Other / Custom Vertical (Agnostic)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="relative group border-2 border-dashed border-muted rounded-xl p-8 transition-all hover:bg-primary/5 text-center">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileLoad} accept=".csv,.xlsx" />
              <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="mt-2 text-sm font-bold">Ingest Disorganized Books</p>
              <p className="text-[9px] text-muted-foreground uppercase mt-1">Autonomous Scrubber Active</p>
            </div>
          </CardContent>
        </Card>

        {/* --- Metrics --- */}
        <div className="flex flex-col gap-6">
          <Card className="bg-slate-950 text-white border-none shadow-2xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-[10px] font-mono text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> KERNEL INTEGRITY MONITOR
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-4xl font-mono tracking-tighter text-emerald-500">
                {variance.toFixed(4)}
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono uppercase">Mathematical 1:1 Reconcilliation</p>
              {isProcessing && <Progress value={progress} className="h-1 mt-4 bg-slate-800" />}
            </CardContent>
          </Card>

          {auditVerdict && (
            <Card className="bg-black text-white border-none shadow-2xl animate-in zoom-in">
              <CardContent className="p-6">
                <p className="text-[10px] font-mono text-emerald-400 mb-1 uppercase">Sovereign Audit Verdict</p>
                <div className="text-2xl font-bold tracking-tight text-emerald-500">{auditVerdict.replace('_', ' ')}</div>
                {accuracyScore !== null && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                     <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Compliance Accuracy Score</p>
                     <p className="text-3xl font-mono font-bold text-emerald-500">{accuracyScore.toFixed(2)}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* --- Right Column: Sovereign Mapping Portal --- */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="min-h-[600px] border-muted shadow-sm">
          <CardHeader className="border-b bg-muted/30 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Wand2 className="w-5 h-5 text-primary animate-pulse" />
              <CardTitle className="text-lg">Sovereign Mapping Portal</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={executeSandboxWipe} disabled={isProcessing}><Trash2 className="w-4 h-4 mr-2" /> Wipe Sandbox</Button>
              <Button size="sm" onClick={executeSovereignSeal} disabled={isProcessing || (sourceMode !== 'INTERNAL_ONLY' && headers.length === 0)}>
                <Play className="w-4 h-4 mr-2" /> Execute Global Seal
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sourceMode !== 'INTERNAL_ONLY' && headers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compliance Pillar</TableHead>
                    <TableHead>Autonomous Mapping</TableHead>
                    <TableHead>First Data Sample</TableHead>
                    <TableHead className="text-right">Integrity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: 'Transaction Date', key: 'date', icon: <Database className="w-3 h-3" /> },
                    { label: 'Account Name', key: 'account_name', icon: <Landmark className="w-3 h-3" /> },
                    { label: 'Debit Amount', key: 'debit', icon: <Scale className="w-3 h-3" /> },
                    { label: 'Credit Amount', key: 'credit', icon: <Scale className="w-3 h-3" /> },
                    { label: 'Reported Tax (VAT)', key: 'reported_tax', icon: <Calculator className="w-3 h-3" /> },
                    { label: 'Currency ISO', key: 'currency', icon: <Coins className="w-3 h-3" /> },
                  ].map((pillar) => (
                    <TableRow key={pillar.key}>
                      <TableCell className="font-semibold flex items-center gap-2 text-sm">
                        <span className="opacity-50">{pillar.icon}</span> {pillar.label}
                      </TableCell>
                      <TableCell>
                        <Select value={mappings[pillar.key] || ''} onValueChange={(val) => setMappings(m => ({ ...m, [pillar.key]: val }))}>
                          <SelectTrigger className="w-[180px] h-8 text-xs font-mono">
                            <SelectValue placeholder="Map Pillar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px] font-mono max-w-[150px] truncate italic">
                        {fileData[0]?.[mappings[pillar.key]] || '---'}
                      </TableCell>
                      <TableCell className="text-right">
                        {mappings[pillar.key] ? (
                          <span className="text-emerald-500 font-bold flex items-center justify-end gap-1 text-[10px]">
                            <ShieldCheck className="w-3 h-3" /> SECURE
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center justify-end gap-1 text-[10px]">
                            <AlertCircle className="w-3 h-3" /> REQUIRED
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : sourceMode === 'INTERNAL_ONLY' ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground space-y-4">
                 <div className="p-6 bg-emerald-500/10 rounded-full animate-pulse">
                    <Layers className="w-12 h-12 text-emerald-600" />
                 </div>
                 <div className="text-center">
                    <p className="font-bold text-foreground tracking-widest text-xs uppercase">Operational Forensic Mode Active</p>
                    <p className="text-xs max-w-sm mt-1">The Sovereign Kernel is directly auditing your production ledger entries for jurisdictional compliance.</p>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground space-y-4">
                <div className="p-6 bg-muted/50 rounded-full">
                  <FileSpreadsheet className="w-12 h-12 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm">DNA Ingestion Required</p>
                  <p className="text-xs">Select a source file to begin autonomous reconciliation.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}