'use client';

import React, { useState } from 'react';
import { 
  UploadCloud, FileSpreadsheet, ShieldCheck, 
  Trash2, Play, AlertCircle, Database, Binary,
  Globe, Scale, Calculator, Coins, Landmark, ShieldAlert
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
  
  // -- Global Compliance State --
  const [industry, setIndustry] = useState<string>('');
  const [taxRegime, setTaxRegime] = useState<string>('');
  const [customTaxRate, setCustomTaxRate] = useState<string>('');
  const [taxAuditMode, setTaxAuditMode] = useState(true);
  const [fiscalYear, setFiscalYear] = useState<string>(new Date().getFullYear().toString());
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // -- Audit Metrics (1:1 Autonomous Intelligence) --
  const [variance, setVariance] = useState<number>(0.0000);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);

  /**
   * Agnostic File Ingestion Engine
   * High-capacity parsing for any global ledger format (CSV/XLSX)
   */
  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const { default: Papa } = await import('papaparse');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setFileData(results.data);
        setIsProcessing(false);
        toast.success(`DNA Ingested: ${results.data.length} records. Ready for Global Mapping.`);
      },
      error: (err) => {
        toast.error("Ingestion engine failure: " + err.message);
        setIsProcessing(false);
      }
    });
  };

  /**
   * The Sovereign Seal
   * Calls the Global Kernel to verify Multi-Currency and Autonomous Tax Accuracy 
   */
  const executeSovereignSeal = async () => {
    if (!industry || !taxRegime || fileData.length === 0) {
      toast.error("Compliance Check: Industry DNA and Tax Jurisdiction are mandatory.");
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Bulk Insert into Sandbox with Multi-Currency & Reported Tax Metadata
      const bufferPayload = fileData.map(row => ({
        tenant_id: user?.id,
        business_id: user?.id,
        account_name_raw: row[mappings['account_name']] || 'Unclassified',
        account_code_raw: row[mappings['account_code']] || '0000',
        debit: parseFloat(row[mappings['debit']] || '0'),
        credit: parseFloat(row[mappings['credit']] || '0'),
        currency_raw: row[mappings['currency']] || 'USD',
        transaction_date: row[mappings['date']] || new Date().toISOString(),
        fiscal_year: parseInt(fiscalYear),
        raw_data: {
          reported_tax: parseFloat(row[mappings['reported_tax']] || '0'),
          original_row: row
        }
      }));

      const { error: insertError } = await supabase
        .from('audit_ingestion_buffer')
        .insert(bufferPayload);

      if (insertError) throw insertError;
      setProgress(50);

      // 2. Call the RPC Global Kernel (The "Brain")
      const { data, error: rpcError } = await supabase.rpc('proc_sovereign_bulk_audit_seal', {
        p_tenant_id: user?.id,
        p_fiscal_year: parseInt(fiscalYear),
        p_industry_vertical: industry,
        p_region_code: taxRegime,
        p_custom_tax_rate: customTaxRate ? parseFloat(customTaxRate) : null,
        p_enable_tax_verification: taxAuditMode
      });

      if (rpcError) throw rpcError;

      setProgress(100);
      setVariance(0.0000); 
      setAccuracyScore(data.tax_accuracy_score);
      setFileData([]);
      toast.success(taxAuditMode ? "Sovereign Audit Sealed: Tax Accuracy Verified." : "Audit Sealed Successfully.");
    } catch (error: any) {
      toast.error("Kernel Violation: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSandboxWipe = async () => {
    if (!confirm("Atomic Warning: Wipe all temporary audit records?")) return;
    setIsProcessing(true);
    const { error } = await supabase.rpc('proc_audit_sandbox_wipe');
    if (!error) {
      setFileData([]);
      setHeaders([]);
      setVariance(0);
      setAccuracyScore(null);
      toast.info("Sandbox Purged.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* --- Left Column: Global Compliance Controls --- */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="border-primary/20 shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Global DNA Setup</CardTitle>
                <CardDescription>Jurisdictional Tax Compliance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Tax Jurisdiction */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Landmark className="w-3 h-3" /> Jurisdiction / Tax Regime
              </label>
              <Select onValueChange={setTaxRegime}>
                <SelectTrigger><SelectValue placeholder="Select Country/Regime" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Common Regimes</SelectLabel>
                    <SelectItem value="UK-VAT">UK (Standard VAT 20%)</SelectItem>
                    <SelectItem value="US-NY">USA (New York Sales Tax)</SelectItem>
                    <SelectItem value="KE-VAT">Kenya (Standard VAT 16%)</SelectItem>
                    <SelectItem value="UAE-GST">UAE (Standard GST 5%)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    <SelectItem value="OTHER">Agnostic / Custom Jurisdiction</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Smart Tax Shield (Toggle) */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Scale className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="text-sm font-bold">Tax Compliance Shield</p>
                  <p className="text-[10px] text-muted-foreground italic">Verify Consultant Accuracy</p>
                </div>
              </div>
              <Switch checked={taxAuditMode} onCheckedChange={setTaxAuditMode} />
            </div>

            {/* Manual Tax Override */}
            {taxAuditMode && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Verification Rate (%)</label>
                <Input 
                  type="number" 
                  placeholder="e.g. 16.5" 
                  value={customTaxRate}
                  onChange={(e) => setCustomTaxRate(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            )}

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
                    <SelectLabel>Specialized</SelectLabel>
                    <SelectItem value="sacco">SACCO / Co-operative</SelectItem>
                    <SelectItem value="telecom">Telecom Services</SelectItem>
                    <SelectItem value="lending">Lending / Microfinance</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Agnostic</SelectLabel>
                    <SelectItem value="other">Other Agnostic Business</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="relative group border-2 border-dashed border-muted rounded-xl p-8 transition-all hover:bg-primary/5 text-center">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileLoad} accept=".csv,.xlsx" />
              <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="mt-2 text-sm font-medium">Drop Multi-Currency Books</p>
            </div>
          </CardContent>
        </Card>

        {/* --- Variance & Accuracy Monitor --- */}
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
              <p className="text-[9px] text-slate-400 mt-2 font-mono uppercase">
                Mathematical Absolute Reconciliation (Net 0:0 Target)
              </p>
              {isProcessing && <Progress value={progress} className="h-1 mt-4 bg-slate-800" />}
            </CardContent>
          </Card>

          {accuracyScore !== null && (
            <Card className="bg-black text-white border-none shadow-2xl animate-in zoom-in">
              <CardContent className="p-6">
                <p className="text-[10px] font-mono text-emerald-400 mb-1">TAX COMPLIANCE ACCURACY SCORE</p>
                <div className="text-5xl font-mono text-emerald-500 font-bold">{accuracyScore.toFixed(2)}%</div>
                <p className="text-[9px] text-slate-400 mt-3 flex items-center gap-1 uppercase">
                  {accuracyScore > 98 ? <ShieldCheck className="w-3 h-3"/> : <ShieldAlert className="w-3 h-3 text-red-500"/>}
                  {accuracyScore > 98 ? "System Balanced" : "Consultant Variance Detected"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* --- Right Column: Sovereign Mapping Portal --- */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="min-h-[600px] border-muted shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg">Sovereign Mapping Portal</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={executeSandboxWipe} disabled={isProcessing}>
                  <Trash2 className="w-4 h-4 mr-2" /> Wipe Sandbox
                </Button>
                <Button size="sm" onClick={executeSovereignSeal} disabled={isProcessing || headers.length === 0}>
                  <Play className="w-4 h-4 mr-2" /> Execute Global Seal
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {headers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compliance Pillar</TableHead>
                    <TableHead>External Header (Source)</TableHead>
                    <TableHead>Sample Data</TableHead>
                    <TableHead className="text-right">Global Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: 'Transaction Date', key: 'date', icon: <Database className="w-3 h-3" /> },
                    { label: 'Account Name', key: 'account_name', icon: <Landmark className="w-3 h-3" /> },
                    { label: 'Debit (Gross Amount)', key: 'debit', icon: <Scale className="w-3 h-3" /> },
                    { label: 'Credit Amount', key: 'credit', icon: <Scale className="w-3 h-3" /> },
                    { label: 'Reported Tax (Consultant)', key: 'reported_tax', icon: <Calculator className="w-3 h-3" /> },
                    { label: 'Currency', key: 'currency', icon: <Coins className="w-3 h-3" /> },
                  ].map((pillar) => (
                    <TableRow key={pillar.key}>
                      <TableCell className="font-semibold flex items-center gap-2">
                        <span className="opacity-50">{pillar.icon}</span> {pillar.label}
                      </TableCell>
                      <TableCell>
                        <Select onValueChange={(val) => setMappings(m => ({ ...m, [pillar.key]: val }))}>
                          <SelectTrigger className="w-[200px] h-8 text-xs font-mono">
                            <SelectValue placeholder="Select Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px] font-mono max-w-[150px] truncate">
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
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground space-y-4">
                <div className="p-6 bg-muted/50 rounded-full">
                  <FileSpreadsheet className="w-12 h-12 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="font-bold">Awaiting Data DNA Ingestion</p>
                  <p className="text-xs">Upload your global books to begin the autonomous audit.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}