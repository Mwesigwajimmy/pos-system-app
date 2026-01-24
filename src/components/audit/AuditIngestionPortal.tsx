'use client';

import React, { useState } from 'react';
import { 
  UploadCloud, FileSpreadsheet, ShieldCheck, 
  Trash2, Play, AlertCircle, Database, Binary,
  Globe, Scale, Calculator, Coins, Landmark, ShieldAlert,
  BrainCircuit, Layers, Wand2, CalendarClock, Download, FileJson, FileBarChart
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
   * Automatically identifies columns in disorganized datasets
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
      toast.success(`Autonomous DNA Scan: Found ${Object.keys(newMappings).length} pillars.`);
    }
  };

  /**
   * ENTERPRISE EXPORT ENGINE
   * Generates forensic summary documents (PDF, EXCEL, CSV)
   */
  const handleForensicDownload = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    if (!lastExecutionId) return;
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: report, error } = await supabase.rpc('proc_get_audit_forensic_report', {
        p_execution_id: lastExecutionId,
        p_tenant_id: user?.id
      });

      if (error) throw error;

      if (format === 'EXCEL' || format === 'CSV') {
        const { utils, writeFile } = await import('xlsx');
        const wb = utils.book_new();
        
        // Comprehensive Forensic Tabs
        utils.book_append_sheet(wb, utils.json_to_sheet(report.entries || []), "Verified_Ledger");
        utils.book_append_sheet(wb, utils.json_to_sheet(report.anomalies || []), "Audit_Anomalies");
        
        writeFile(wb, `Sovereign_Audit_Log_${lastExecutionId}.${format === 'CSV' ? 'csv' : 'xlsx'}`);
      } 
      else if (format === 'PDF') {
        const { default: jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF();

        doc.setFontSize(22); doc.text("SOVEREIGN AUDIT CERTIFICATE", 105, 20, { align: 'center' });
        doc.setFontSize(10); doc.text(`Fingerprint: ${lastExecutionId}`, 105, 30, { align: 'center' });
        doc.line(20, 35, 190, 35);
        
        doc.setFontSize(14); doc.text(`Audit Verdict: ${auditVerdict?.replace('_', ' ')}`, 20, 50);
        doc.text(`Tax Accuracy: ${accuracyScore?.toFixed(2)}%`, 20, 60);

        autoTable(doc, {
          startY: 75,
          head: [['Type', 'Severity', 'Forensic Description']],
          body: (report.anomalies || []).map((a: any) => [a.anomaly_type, a.severity, a.description])
        });

        doc.save(`Sovereign_Certificate_${lastExecutionId}.pdf`);
      }
      toast.success(`${format} Evidence Exported.`);
    } catch (e: any) {
      toast.error("Export Engine Failure: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    const { default: Papa } = await import('papaparse');
    Papa.parse(file, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setFileData(results.data);
        performSmartAutoMap(results.meta.fields || []); 
        setIsProcessing(false);
        toast.success(`Ingested ${results.data.length} records.`);
      }
    });
  };

  const executeSovereignSeal = async () => {
    if (!industry || !taxRegime || (sourceMode !== 'INTERNAL_ONLY' && fileData.length === 0)) {
      toast.error("Audit Blocked: Mandatory configuration missing."); return;
    }

    setIsProcessing(true); setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (sourceMode !== 'INTERNAL_ONLY') {
        const bufferPayload = fileData.map(row => {
          const scrub = (val: any) => String(val || '0').replace(/[^0-9.-]+/g,"");
          return {
            tenant_id: user?.id, business_id: user?.id,
            account_name_raw: String(row[mappings['account_name']] || 'Unclassified'),
            account_code_raw: String(row[mappings['account_code']] || '0000'),
            debit: parseFloat(scrub(row[mappings['debit']])),
            credit: parseFloat(scrub(row[mappings['credit']])),
            currency_raw: row[mappings['currency']] || 'USD',
            transaction_date: row[mappings['date']], 
            fiscal_year: parseInt(fiscalYear),
            raw_data: { reported_tax: parseFloat(scrub(row[mappings['reported_tax']])), original_row: row }
          };
        });
        const { error: insErr } = await supabase.from('audit_ingestion_buffer').insert(bufferPayload);
        if (insErr) throw insErr;
      }
      
      setProgress(50);

      const { data, error: rpcError } = await supabase.rpc('proc_sovereign_dual_audit', {
        p_tenant_id: user?.id, p_fiscal_year: parseInt(fiscalYear),
        p_source_mode: sourceMode, p_region_code: taxRegime,
        p_custom_tax_rate: customTaxRate ? parseFloat(customTaxRate) : null
      });

      if (rpcError) throw rpcError;

      if (data?.status === 'BLOCK_SEAL') {
        setVariance(data?.variance ?? 0);
        toast.error(`${data?.verdict}: ${data?.message}`, { duration: 6000 });
        return;
      }

      setProgress(100);
      setVariance(0.0000); 
      setAccuracyScore(data?.tax_accuracy_score ?? 100);
      setAuditVerdict(data?.verdict ?? 'SUCCESS');
      setLastExecutionId(data?.execution_id);
      setFileData([]);
      toast.success(data?.message ?? `Autonomous Result: ${data?.verdict}`);
      
    } catch (error: any) {
      toast.error("Kernel Violation: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSandboxWipe = async () => {
    if (!confirm("Atomic Warning: Wipe sandbox?")) return;
    setIsProcessing(true);
    const { error } = await supabase.rpc('proc_audit_sandbox_wipe');
    if (!error) {
      setFileData([]); setHeaders([]); setVariance(0); setAccuracyScore(null); setAuditVerdict(null); setLastExecutionId(null);
      toast.info("Sandbox Purged.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500 pb-20">
      
      {/* LEFT COLUMN: CONFIGURATION */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="border-primary/20 shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              <CardTitle>Autonomous Setup</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Audit Mode</label>
              <Select defaultValue={sourceMode} onValueChange={setSourceMode}>
                <SelectTrigger className="font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXTERNAL_ONLY">External File (Sandbox)</SelectItem>
                  <SelectItem value="INTERNAL_ONLY">Ledger Audit (Live Ops)</SelectItem>
                  <SelectItem value="RECONCILED_HYBRID">Reconciled Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Fiscal Year</label>
              <Select defaultValue={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger className="font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>{['2026', '2025', '2024'].map(y => <SelectItem key={y} value={y}>{y} (Locked)</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" /> Jurisdiction</label>
              <Select onValueChange={setTaxRegime}>
                <SelectTrigger className="font-semibold"><SelectValue placeholder="Select Regime" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup><SelectLabel>Standard</SelectLabel>
                    <SelectItem value="UK-VAT">UK (20%)</SelectItem><SelectItem value="US-NY">USA (New York)</SelectItem><SelectItem value="KE-VAT">Kenya (16%)</SelectItem>
                  </SelectGroup>
                  <SelectItem value="OTHER">Custom DNA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scale className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold">Tax Compliance Shield</p>
              </div>
              <Switch checked={taxAuditMode} onCheckedChange={setTaxAuditMode} />
            </div>

            {taxAuditMode && (
              <Input type="number" placeholder="Verification Rate (%)" value={customTaxRate} onChange={(e) => setCustomTaxRate(e.target.value)} className="font-mono text-sm" />
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Industry Vertical</label>
              <Select onValueChange={setIndustry}>
                <SelectTrigger className="w-full font-semibold"><SelectValue placeholder="Select Business DNA" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup><SelectLabel>Common</SelectLabel><SelectItem value="retail">Retail</SelectItem><SelectItem value="restaurant">Restaurant</SelectItem></SelectGroup>
                  <SelectGroup><SelectLabel>Specialized</SelectLabel><SelectItem value="lending">Microfinance</SelectItem><SelectItem value="sacco">SACCO</SelectItem></SelectGroup>
                  <SelectItem value="other">Agnostic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative border-2 border-dashed rounded-xl p-8 text-center hover:bg-primary/5">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileLoad} accept=".csv,.xlsx" />
              <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs font-bold">Ingest Disorganized Books</p>
            </div>
          </CardContent>
        </Card>

        {/* METRICS & EXPORTS */}
        <div className="flex flex-col gap-6">
          <Card className="bg-slate-950 text-white border-none shadow-2xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-[10px] font-mono text-emerald-400">KERNEL INTEGRITY</CardTitle>
            </CardHeader>
            <CardContent className="pt-4"><div className="text-4xl font-mono text-emerald-500">{variance.toFixed(4)}</div></CardContent>
          </Card>

          {auditVerdict && (
            <div className="space-y-4">
              <Card className="bg-black text-white border border-emerald-500/20 shadow-2xl">
                <CardContent className="p-6">
                  <p className="text-[10px] font-mono text-emerald-400">VERDICT</p>
                  <div className="text-2xl font-bold text-emerald-500">{auditVerdict.replace('_', ' ')}</div>
                  {accuracyScore !== null && <p className="text-3xl font-mono font-bold mt-2 text-emerald-500">{accuracyScore.toFixed(2)}%</p>}
                </CardContent>
              </Card>

              <Card className="bg-primary text-white border-none shadow-2xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export Evidence</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                   <Button onClick={() => handleForensicDownload('PDF')} className="w-full bg-white/10 hover:bg-white/20 border-none text-xs h-9 justify-start font-bold"><ShieldCheck className="w-4 h-4 mr-2" /> Audit Certificate (PDF)</Button>
                   <Button onClick={() => handleForensicDownload('EXCEL')} className="w-full bg-white/10 hover:bg-white/20 border-none text-xs h-9 justify-start font-bold"><FileBarChart className="w-4 h-4 mr-2" /> Forensic Workbook (Excel)</Button>
                   <Button onClick={() => handleForensicDownload('CSV')} className="w-full bg-white/10 hover:bg-white/20 border-none text-xs h-9 justify-start font-bold"><FileJson className="w-4 h-4 mr-2" /> Anomaly Trace (CSV)</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: MAPPING */}
      <div className="lg:col-span-8">
        <Card className="min-h-[600px] border-muted shadow-sm">
          <CardHeader className="border-b bg-muted/30 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 font-bold"><Wand2 className="w-5 h-5 text-primary" /> Mapping Portal</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={executeSandboxWipe}>Wipe</Button>
              <Button size="sm" onClick={executeSovereignSeal} disabled={isProcessing || (sourceMode !== 'INTERNAL_ONLY' && headers.length === 0)}>Execute Seal</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sourceMode !== 'INTERNAL_ONLY' && headers.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Pillar</TableHead><TableHead>Auto-Mapping</TableHead><TableHead>Sample</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {['date', 'account_name', 'debit', 'credit', 'reported_tax', 'currency'].map((k) => (
                    <TableRow key={k}>
                      <TableCell className="font-semibold capitalize text-sm">{k.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Select value={mappings[k] || ''} onValueChange={(v) => setMappings(m => ({ ...m, [k]: v }))}>
                          <SelectTrigger className="w-[180px] h-8 text-xs font-mono"><SelectValue placeholder="Map Pillar..." /></SelectTrigger>
                          <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px] font-mono max-w-[150px] truncate italic">{fileData[0]?.[mappings[k]] || '---'}</TableCell>
                      <TableCell className="text-right">{mappings[k] ? <ShieldCheck className="w-4 h-4 text-emerald-500 ml-auto" /> : <AlertCircle className="w-4 h-4 text-amber-500 ml-auto" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                {sourceMode === 'INTERNAL_ONLY' ? <Layers className="w-12 h-12 mb-4 text-emerald-600 animate-pulse" /> : <FileSpreadsheet className="w-12 h-12 mb-4 opacity-20" />}
                <p className="font-bold">{sourceMode === 'INTERNAL_ONLY' ? "Production Ledger Audit Mode" : "Awaiting Agnostic Ingestion"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}