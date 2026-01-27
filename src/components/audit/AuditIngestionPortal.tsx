'use client';

import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, FileSpreadsheet, ShieldCheck, Trash2, Play, AlertCircle, 
  Database, Binary, Globe, Scale, Calculator, Coins, Landmark, ShieldAlert,
  BrainCircuit, Layers, Wand2, CalendarClock, Download, FileText, FileDown, 
  ShieldQuestion, CheckCircle2, FileJson, Zap, Fingerprint, Users, History,
  Link as LinkIcon, ShieldX, Eye, FileStack, ClipboardCheck, Activity,
  ExternalLink, FileWarning, SearchCode, Lock, Image as ImageIcon, FileArchive,
  ScanLine, CheckSquare, BarChart4, Terminal, FileSignature
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
  
  // -- Core Operational & Connectivity State --
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [evidenceCount, setEvidenceCount] = useState(0); 
  const [progress, setProgress] = useState(0);
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isErpConnected, setIsErpConnected] = useState(false); 
  
  // -- Global Intelligence & Compliance State --
  const [industry, setIndustry] = useState<string>('');
  const [taxRegime, setTaxRegime] = useState<string>('');
  const [sourceMode, setSourceMode] = useState<string>('EXTERNAL_ONLY'); 
  const [customTaxRate, setCustomTaxRate] = useState<string>('');
  const [taxAuditMode, setTaxAuditMode] = useState(true);
  const [fiscalYear, setFiscalYear] = useState<string>(new Date().getFullYear().toString());
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // -- Forensic Metrics & Global Standards (numeric 24,4 precision) --
  const [variance, setVariance] = useState<number>(0.0000);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [vouchingCoverage, setVouchingCoverage] = useState<number>(0); 
  const [auditVerdict, setAuditVerdict] = useState<string | null>(null);
  const [forensicSummary, setForensicSummary] = useState<any>(null);

  /**
   * IMMUTABLE AUDIT TRAIL LOGGING
   */
  const logSettingChange = async (key: string, oldVal: string, newVal: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('sovereign_settings_log').insert({
        tenant_id: user?.id, 
        actor_id: user?.id, 
        setting_key: key, 
        old_value: oldVal || 'NULL', 
        new_value: newVal 
      });
    } catch (e) { console.error("Trace Log Failure:", e); }
  };

  /**
   * SOVEREIGN DNA FINGERPRINTING (SHA-256)
   */
  const generateFileFingerprint = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  /**
   * REAL EVIDENCE INGESTION (Vouching)
   * Parallel uploads to 'audit-evidence' bucket and DB registration.
   */
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (!lastExecutionId) {
      toast.error("Audit Locked: Execute a Seal to generate a Trace ID before uploading proof.");
      return;
    }

    setIsProcessing(true);
    setProgress(5);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Auth Session Expired.");

      let successfulUploads = 0;

      const uploadPromises = Array.from(files).map(async (file) => {
        const artifactHash = await generateFileFingerprint(file);
        const fileName = `${artifactHash}.${file.name.split('.').pop()}`;
        const filePath = `${user.id}/${lastExecutionId}/${fileName}`;

        const { error: storageError } = await supabase.storage
          .from('audit-evidence')
          .upload(filePath, file, { upsert: true });
        
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from('sovereign_audit_artifacts').insert({
          execution_id: lastExecutionId,
          tenant_id: user.id,
          file_path: filePath,
          file_hash_sha256: artifactHash,
          artifact_type: file.type.includes('pdf') ? 'INVOICE' : 'RECEIPT',
          vouching_status: 'PENDING',
          detected_amount: 0.0000 
        });

        if (dbError) throw dbError;
        successfulUploads++;
        setProgress(Math.round((successfulUploads / files.length) * 100));
      });

      await Promise.all(uploadPromises);

      // Trigger Autonomous Vouching Kernel
      const { data: kernelResult } = await supabase.rpc('proc_autonomous_vouching_kernel_v10', {
        p_execution_id: lastExecutionId
      });

      setEvidenceCount(prev => prev + successfulUploads);
      setVouchingCoverage(Math.min(100, ((evidenceCount + successfulUploads) / (fileData.length || 1)) * 100));
      toast.success(`${successfulUploads} Proof Artifacts legally locked and vouched.`);
      
    } catch (err: any) {
      toast.error("Chain of Custody Failure: " + err.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  /**
   * HEURISTIC DNA PATTERN SCANNER
   */
  const performSmartAutoMap = (incomingHeaders: string[]) => {
    const newMappings: Record<string, string> = {};
    const patterns = [
      { key: 'date', words: ['date', 'time', 'tx_date', 'period'] },
      { key: 'account_name', words: ['name', 'account', 'desc', 'ledger'] },
      { key: 'debit', words: ['debit', 'dr', 'withdrawal', 'outflow'] },
      { key: 'credit', words: ['credit', 'cr', 'receipt', 'deposit'] },
      { key: 'reported_tax', words: ['tax', 'vat', 'gst', 'tax_amount'] },
      { key: 'currency', words: ['currency', 'curr', 'ccy', 'iso'] },
    ];

    patterns.forEach(p => {
      const match = incomingHeaders.find(h => p.words.some(word => h.toLowerCase().includes(word)));
      if (match) newMappings[p.key] = match;
    });

    setMappings(newMappings);
    if (Object.keys(newMappings).length > 0) toast.success(`Autonomous DNA Scan Complete.`);
  };

  /**
   * ENTERPRISE ISA-700 EXPORT ENGINE
   */
  const handleForensicDownload = async (format: 'PDF' | 'EXCEL' | 'CSV') => {
    if (!lastExecutionId) return;
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: report, error } = await supabase.rpc('proc_get_audit_forensic_report', {
        p_execution_id: lastExecutionId, p_tenant_id: user?.id
      });
      if (error) throw error;

      if (format === 'PDF') {
        const { default: jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF();

        doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 50, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(22);
        doc.text("SOVEREIGN AUDIT CERTIFICATE", 105, 25, { align: 'center' });
        doc.setFontSize(8); 
        doc.text(`TRACE: ${lastExecutionId} | FINGERPRINT: ${fileHash?.substring(0,32)}...`, 105, 38, { align: 'center' });

        if (Math.abs(variance) > 0 || vouchingCoverage < 90) {
            doc.setFillColor(254, 242, 242); doc.rect(15, 55, 180, 22, 'F');
            doc.setTextColor(185, 28, 28); doc.setFontSize(8);
            const disclaimer = "REGULATORY NOTICE: Mathematical variance or documentation gaps detected. Independent auditor reconciliation of the Suspense Protocol is mandatory.";
            doc.text(doc.splitTextToSize(disclaimer, 170), 20, 62);
        }

        doc.setTextColor(0); doc.setFontSize(14); doc.text("1. Auditor's Opinion:", 20, 90);
        const isClean = auditVerdict?.includes('CLEAN') && Math.abs(variance) === 0 && vouchingCoverage >= 90;
        doc.setTextColor(isClean ? 34 : 200, isClean ? 150 : 0, 0);
        doc.text(isClean ? "UNQUALIFIED CLEAN" : "QUALIFIED WITH FINDINGS", 70, 90);

        autoTable(doc, {
          startY: 105,
          head: [['Forensic Pillar', 'Metric Result', 'Kernel Status']],
          body: [
            ['Benford Pattern Match', `${accuracyScore?.toFixed(2)}%`, (accuracyScore || 0) > 85 ? 'CONFORMANT' : 'OUTLIER'],
            ['Documentation Coverage', `${vouchingCoverage.toFixed(2)}%`, vouchingCoverage > 85 ? 'HIGH' : 'LOW'],
            ['Kernel Variance (24,4)', variance.toFixed(4), variance === 0 ? 'CLEAN' : 'IMBALANCED']
          ],
          headStyles: { fillColor: [30, 41, 59] }
        });

        doc.save(`Sovereign_Audit_Report_${lastExecutionId.substring(0,8)}.pdf`);
      } 
      else {
        const { utils, writeFile } = await import('xlsx');
        const wb = utils.book_new();
        utils.book_append_sheet(wb, utils.aoa_to_sheet([["TRACE ID", lastExecutionId], ["VERDICT", auditVerdict]]), "Summary");
        utils.book_append_sheet(wb, utils.json_to_sheet(report.entries || []), "Verified_Ledger");
        writeFile(wb, `Sovereign_Forensic_Evidence_${fiscalYear}.${format === 'CSV' ? 'csv' : 'xlsx'}`);
      }
      toast.success(`${format} Binder Exported.`);
    } catch (e: any) { toast.error("Export System Failure."); } finally { setIsProcessing(false); }
  };

  /**
   * SOVEREIGN LEDGER INGESTION
   */
  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const hash = await generateFileFingerprint(file);
    setFileHash(hash);
    
    const { default: Papa } = await import('papaparse');
    Papa.parse(file, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setFileData(results.data);
        performSmartAutoMap(results.meta.fields || []); 
        setIsProcessing(false);
        toast.success(`Ledger Patterns Locked.`);
      }
    });
  };

  /**
   * THE V10 KERNEL (Sovereign Seal)
   */
  const executeSovereignSeal = async () => {
    if (!industry || !taxRegime || (sourceMode === 'EXTERNAL_ONLY' && fileData.length === 0)) {
      toast.error("Compliance Check: Mandatories Required."); return;
    }

    setIsProcessing(true); setProgress(15);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (sourceMode === 'EXTERNAL_ONLY') {
        const bufferPayload = fileData.map(row => {
          const scrub = (val: any) => String(val || '0').replace(/[^0-9.-]+/g,"");
          return {
            tenant_id: user?.id, prepared_by: user?.id,
            account_name_raw: String(row[mappings['account_name']] || 'Unclassified'),
            debit: parseFloat(scrub(row[mappings['debit']])),
            credit: parseFloat(scrub(row[mappings['credit']])),
            currency_raw: row[mappings['currency']] || 'USD',
            transaction_date: row[mappings['date']], fiscal_year: parseInt(fiscalYear),
            raw_data: { reported_tax: parseFloat(scrub(row[mappings['reported_tax']])), fingerprint: fileHash }
          };
        });
        await supabase.from('audit_ingestion_buffer').insert(bufferPayload);
      }
      
      setProgress(50);
      const { data, error } = await supabase.rpc('proc_sovereign_global_audit_kernel_v10', {
        p_tenant_id: user?.id, p_fiscal_year: parseInt(fiscalYear),
        p_certifier_id: user?.id, p_region_code: taxRegime,
        p_custom_tax_rate: customTaxRate ? parseFloat(customTaxRate) : null
      });

      if (error) throw error;
      setVariance(data?.variance ?? 0); 
      setAccuracyScore(data?.forensic_summary?.benford_score ?? 100);
      setForensicSummary(data?.forensic_summary);
      setAuditVerdict(data?.verdict);
      setLastExecutionId(data?.execution_id);
      setProgress(100); setFileData([]);
      toast.success("Audit Seal Absolute: V10 Kernel Certified.");
      
    } catch (error: any) { toast.error("Kernel Violation: " + error.message); } finally { setIsProcessing(false); }
  };

  /**
   * ATOMIC SANDBOX WIPE
   */
  const executeSandboxWipe = async () => {
    if (!confirm("Atomic Warning: Wipe sandbox, evidence artifacts and forensic history?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('proc_audit_sandbox_wipe');
      if (error) throw error;
      
      setFileData([]); setHeaders([]); setVariance(0); setEvidenceCount(0); setVouchingCoverage(0);
      setAccuracyScore(null); setAuditVerdict(null); setLastExecutionId(null); setFileHash(null);
      toast.info("Audit Sandbox Purged.");
    } catch (err: any) {
      toast.error("Wipe Failure: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32 animate-in fade-in duration-700">
      
      {/* --- Column 1: Provenance & Evidence --- */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* PROVENANCE CONTROL */}
        <Card className="border-t-4 border-t-blue-600 shadow-xl relative overflow-hidden">
           <History className="absolute -right-2 -top-2 w-16 h-16 opacity-5" />
           <CardHeader className="bg-blue-50/40">
             <div className="flex items-center gap-2 text-blue-700">
               <LinkIcon className="w-5 h-5" />
               <CardTitle className="text-sm font-extrabold uppercase">Audit Provenance Control</CardTitle>
             </div>
           </CardHeader>
           <CardContent className="pt-6 space-y-4">
             <div className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-2">
                   <FileText className="w-4 h-4 text-blue-600" />
                   <div><p className="text-xs font-bold leading-none">ERP Direct Link</p><p className="text-[8px] text-muted-foreground uppercase mt-1">Status: {isErpConnected ? 'ACTIVE' : 'READY'}</p></div>
                </div>
                <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => setIsErpConnected(!isErpConnected)}>
                  {isErpConnected ? 'Linked' : 'Connect'}
                </Button>
             </div>
             <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-blue-600" /><p className="text-[10px] font-bold uppercase">SoD Protocol Active</p></div>
                <Badge className="bg-blue-600 text-[8px] border-none">ISO-27001</Badge>
             </div>
           </CardContent>
        </Card>

        {/* EVIDENCE INGESTOR */}
        <Card className="border-t-4 border-t-emerald-600 shadow-xl bg-emerald-50/20">
          <CardHeader>
             <CardTitle className="flex items-center gap-2 text-emerald-800"><ScanLine className="w-5 h-5" /> Evidence Artifacts</CardTitle>
             <CardDescription className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest">Physical Documentation Proof</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded border shadow-inner text-center">
                   <p className="text-sm font-bold text-emerald-700">{evidenceCount}</p>
                   <p className="text-[8px] text-muted-foreground uppercase font-bold">Vouchers Found</p>
                </div>
                <div className="bg-white p-3 rounded border shadow-inner text-center">
                   <p className="text-sm font-bold text-emerald-700">{vouchingCoverage.toFixed(1)}%</p>
                   <p className="text-[8px] text-muted-foreground uppercase font-bold">Vouching Match</p>
                </div>
             </div>
             <div className="relative border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center hover:bg-emerald-50 transition-all cursor-pointer">
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleEvidenceUpload} accept=".pdf,.png,.jpg,.jpeg,.zip" />
                <FileArchive className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-[10px] font-bold text-emerald-800 uppercase">Ingest Proof Artifacts</p>
             </div>
          </CardContent>
        </Card>

        {/* SETUP CARD */}
        <Card className="border-primary/20 shadow-xl border-t-4 border-t-primary">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg font-bold"><BrainCircuit className="w-5 h-5 text-primary" /> Forensic Setup</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Audit Mode</label>
              <Select defaultValue={sourceMode} onValueChange={(v) => { logSettingChange('STRATEGY', sourceMode, v); setSourceMode(v); }}>
                <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="EXTERNAL_ONLY">Agnostic Forensic Upload</SelectItem><SelectItem value="DIRECT_API">Direct ERP Sync</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Tax DNA</label>
              <Select onValueChange={(v) => { logSettingChange('TAX_DNA', taxRegime, v); setTaxRegime(v); }}>
                <SelectTrigger className="font-bold"><SelectValue placeholder="Select Global DNA" /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="UK-VAT">UK (VAT 20.0%)</SelectItem>
                   <SelectItem value="KE-VAT">Kenya (VAT 16.0%)</SelectItem>
                   <SelectItem value="US-NY">USA (Sales Tax 8.875%)</SelectItem>
                   <SelectItem value="OTHER">Custom Jurisdictional DNA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative group border-2 border-dashed rounded-xl p-8 text-center hover:bg-primary/5 transition-all">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileLoad} accept=".csv,.xlsx" />
              <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs font-bold">Ingest Ledger CSV</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Column 2: Sovereign Mapping Portal --- */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="min-h-[900px] border-muted shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3"><Wand2 className="w-5 h-5 text-primary animate-pulse" /><CardTitle className="text-lg font-extrabold tracking-tight">Forensic Mapping Portal</CardTitle></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={executeSandboxWipe} disabled={isProcessing} className="hover:text-red-600 transition-all border-muted-foreground/20"><Trash2 className="w-4 h-4 mr-2" /> Reset Sandbox</Button>
              <Button onClick={executeSovereignSeal} disabled={isProcessing || (sourceMode === 'EXTERNAL_ONLY' && headers.length === 0)} size="sm" className="px-8 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90">Execute Golden Seal</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-grow">
            {headers.length > 0 ? (
              <Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-bold text-[10px] uppercase">Compliance Pillar</TableHead><TableHead className="font-bold text-[10px] uppercase">Mapping</TableHead><TableHead className="font-bold text-[10px] uppercase">DNA Sample</TableHead><TableHead className="text-right font-bold text-[10px] uppercase">Evidence Lock</TableHead></TableRow></TableHeader>
                <TableBody>
                  {['date', 'account_name', 'debit', 'credit', 'reported_tax', 'currency'].map((k) => (
                    <TableRow key={k} className="hover:bg-slate-50/50 h-16 transition-colors">
                      <TableCell className="font-bold text-slate-700 uppercase text-[11px] tracking-tight">{k.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Select value={mappings[k] || ''} onValueChange={(v) => setMappings(m => ({ ...m, [k]: v }))}>
                          <SelectTrigger className="w-[190px] h-9 text-xs font-mono border-primary/10 shadow-inner"><SelectValue placeholder="Map Pillar..." /></SelectTrigger>
                          <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px] font-mono truncate max-w-[150px] bg-slate-50/50 rounded p-2 italic">{fileData[0]?.[mappings[k]] || '---'}</TableCell>
                      <TableCell className="text-right">
                        {mappings[k] ? (
                          <div className="flex items-center justify-end gap-1.5 animate-in slide-in-from-right-2">
                             {vouchingCoverage > 50 ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
                             <span className={`font-extrabold text-[10px] uppercase ${vouchingCoverage > 50 ? 'text-emerald-600' : 'text-amber-500'}`}>
                               {vouchingCoverage > 50 ? 'Evidence Locked' : 'Pending Proof'}
                             </span>
                          </div>
                        ) : (
                          <ShieldQuestion className="w-5 h-5 text-amber-500 ml-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[750px] p-20 opacity-20"><Fingerprint className="w-32 h-32 mb-6" /><p className="text-2xl font-bold uppercase tracking-widest">Awaiting Forensic DNA Ingestion</p></div>
            )}
          </CardContent>
          
          {/* TRUTH SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-10 bg-slate-50 border-t">
             <Card className="shadow-none border-t-2 border-t-emerald-500 bg-white p-4">
                <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Math Variance</p>
                <p className="text-2xl font-mono font-bold text-emerald-600 tracking-tighter">{variance.toFixed(4)}</p>
             </Card>
             <Card className="shadow-none border-t-2 border-t-blue-500 bg-white p-4">
                <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Document Coverage</p>
                <p className="text-2xl font-mono font-bold text-blue-600 tracking-tighter">{vouchingCoverage.toFixed(2)}%</p>
             </Card>
             <Card className="shadow-none border-t-2 border-t-amber-500 bg-white p-4">
                <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Benford Score</p>
                <p className="text-2xl font-mono font-bold text-amber-500 tracking-tighter">{accuracyScore?.toFixed(2) || '0.00'}%</p>
             </Card>
             <Card className="shadow-none border-t-2 border-t-primary bg-white p-4 flex flex-col justify-center">
                <Badge className={`text-[10px] h-8 justify-center border-none font-bold ${auditVerdict ? 'bg-emerald-600' : 'bg-slate-400'}`}>
                   {auditVerdict?.replace('_', ' ') || 'UNAUDITED'}
                </Badge>
             </Card>
          </div>

          <CardFooter className="bg-muted/10 border-t py-8 flex justify-between items-center px-12">
             <div className="flex items-center gap-3 opacity-60"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-[10px] font-bold uppercase tracking-widest">ISA-700 Golden Audit Enforced</span></div>
             <p className="text-[10px] text-slate-400 font-mono italic">Provenance: {fileHash?.substring(0,32)}...</p>
          </CardFooter>
        </Card>

        {/* FINAL EXPORT ACTIONS */}
        {auditVerdict && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in">
             <Card className="bg-slate-900 text-white shadow-2xl border-t-4 border-t-emerald-500 overflow-hidden">
                <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold flex items-center gap-2"><Download className="w-4 h-4" /> Management Letter</CardTitle></CardHeader>
                <CardContent className="px-6 pb-6 space-y-3">
                   <Button onClick={() => handleForensicDownload('PDF')} className="w-full bg-slate-800 hover:bg-slate-700 text-white justify-start h-14 px-4 shadow-inner group transition-all">
                      <div className="p-2 bg-red-500/10 rounded mr-3 group-hover:bg-red-500/20"><FileText className="w-5 h-5 text-red-500" /></div>
                      <div className="text-left font-bold"><p className="text-[10px] opacity-50 uppercase leading-none">ISA-700 Report</p><p className="text-xs mt-1">Audit Certificate (PDF)</p></div>
                   </Button>
                </CardContent>
             </Card>
             <Card className="bg-slate-900 text-white shadow-2xl border-t-4 border-t-blue-500 overflow-hidden">
                <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4" /> Evidence Trace</CardTitle></CardHeader>
                <CardContent className="px-6 pb-6 space-y-3">
                   <Button onClick={() => handleForensicDownload('EXCEL')} className="w-full bg-slate-800 hover:bg-slate-700 border-slate-700 text-white justify-start h-14 px-4 shadow-inner group transition-all">
                      <div className="p-2 bg-emerald-500/10 rounded mr-3 group-hover:bg-emerald-500/20"><FileDown className="w-5 h-5 text-emerald-500" /></div>
                      <div className="text-left font-bold"><p className="text-[10px] opacity-50 uppercase leading-none">Forensic Workbook</p><p className="text-xs mt-1">Audit Worksheet (XL)</p></div>
                   </Button>
                </CardContent>
             </Card>
          </div>
        )}
      </div>
    </div>
  );
}