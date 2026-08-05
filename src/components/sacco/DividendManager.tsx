'use client';

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, AlertCircle, Search, Download, FileText } from "lucide-react";

const CURRENCY = "UGX";
const CURRENT_YEAR = new Date().getFullYear();

function formatCurrency(value: number) {
    return `${CURRENCY} ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

interface DividendRecord {
    id: string;
    member_name: string;
    account_no: string;
    amount: number;
    financial_year: string;
    declared_date: string;
    status: 'PROCESSED' | 'PENDING' | 'FAILED';
}

const STATUS_STYLES: Record<DividendRecord['status'], string> = {
    PROCESSED: "bg-green-600 hover:bg-green-600",
    PENDING: "bg-amber-500 hover:bg-amber-500",
    FAILED: "bg-red-600 hover:bg-red-600",
};

// --- Reads (plain table queries — left untouched in shape) ---
async function fetchDividends(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('dividends_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('declared_date', { ascending: false });

  if (error) throw error;
  return data as DividendRecord[];
}

// --- Write (RPC — call shape preserved, only additive params) ---
async function distributeDividend(payload: {
    tenantId: string;
    financialYear: string;
    distributionMethod: 'AMOUNT' | 'RATE';
    amount: number | null;
    ratePercent: number | null;
    eligibilityDate: string;
    withholdingTaxRate: number;
    boardResolutionRef: string;
    notes: string;
}) {
  const db = createClient();
  // RPC handles pro-rata calculation based on share capital
  const { error } = await db.rpc('process_dividend_distribution', {
      p_tenant_id: payload.tenantId,
      p_total_amount: payload.amount,
      p_financial_year: payload.financialYear,
      p_distribution_method: payload.distributionMethod,
      p_rate_percent: payload.ratePercent,
      p_eligibility_date: payload.eligibilityDate,
      p_withholding_tax_rate: payload.withholdingTaxRate,
      p_board_resolution_ref: payload.boardResolutionRef,
      p_notes: payload.notes || null
  });
  if (error) throw new Error(error.message);
}

function downloadCsv(rows: DividendRecord[]) {
    const header = ["Financial Year", "Declared Date", "Member", "Account No", "Amount", "Status"];
    const lines = rows.map(r => [
        r.financial_year,
        format(new Date(r.declared_date), 'yyyy-MM-dd'),
        r.member_name,
        r.account_no,
        r.amount.toFixed(2),
        r.status
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dividend-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export function DividendManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);

  // Form state
  const [year, setYear] = React.useState(CURRENT_YEAR.toString());
  const [distributionMethod, setDistributionMethod] = React.useState<'AMOUNT' | 'RATE'>('AMOUNT');
  const [amount, setAmount] = React.useState('');
  const [ratePercent, setRatePercent] = React.useState('');
  const [eligibilityDate, setEligibilityDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [withholdingTaxRate, setWithholdingTaxRate] = React.useState('0');
  const [boardResolutionRef, setBoardResolutionRef] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [confirmApproved, setConfirmApproved] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');

  // History filter
  const [historyFilter, setHistoryFilter] = React.useState('');

  const { data: history, isLoading } = useQuery({
      queryKey: ['dividends', tenantId],
      queryFn: () => fetchDividends(tenantId)
  });

  const resetForm = () => {
      setYear(CURRENT_YEAR.toString());
      setDistributionMethod('AMOUNT');
      setAmount('');
      setRatePercent('');
      setEligibilityDate(format(new Date(), 'yyyy-MM-dd'));
      setWithholdingTaxRate('0');
      setBoardResolutionRef('');
      setNotes('');
      setConfirmApproved(false);
      setConfirmText('');
  };

  const mutation = useMutation({
      mutationFn: distributeDividend,
      onSuccess: () => {
          toast.success('Dividends processed successfully');
          resetForm();
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ['dividends', tenantId] });
      },
      onError: (e) => toast.error(e.message || 'Distribution Failed')
  });

  // --- Validation ---
  const yearValid = /^\d{4}$/.test(year) && Number(year) >= 2000 && Number(year) <= CURRENT_YEAR + 1;
  const parsedAmount = parseFloat(amount);
  const amountValid = distributionMethod !== 'AMOUNT' || (!Number.isNaN(parsedAmount) && parsedAmount > 0);
  const parsedRate = parseFloat(ratePercent);
  const rateValid = distributionMethod !== 'RATE' || (!Number.isNaN(parsedRate) && parsedRate > 0 && parsedRate <= 100);
  const parsedWht = parseFloat(withholdingTaxRate || '0');
  const whtValid = !Number.isNaN(parsedWht) && parsedWht >= 0 && parsedWht <= 100;
  const resolutionValid = boardResolutionRef.trim().length > 0;
  const confirmTextValid = confirmText.trim().toUpperCase() === "DISTRIBUTE";

  const canSubmit = yearValid && amountValid && rateValid && whtValid && resolutionValid
      && confirmApproved && confirmTextValid && !mutation.isPending;

  const existingForYear = React.useMemo(
      () => (history || []).filter(h => h.financial_year === year && h.status === 'PROCESSED'),
      [history, year]
  );

  const netAmountPreview = distributionMethod === 'AMOUNT' && amountValid && whtValid
      ? parsedAmount * (1 - parsedWht / 100)
      : null;

  // --- Summary strip ---
  const totalDistributed = React.useMemo(
      () => (history || []).filter(h => h.status === 'PROCESSED').reduce((s, h) => s + h.amount, 0),
      [history]
  );
  const pendingCount = (history || []).filter(h => h.status === 'PENDING').length;
  const failedCount = (history || []).filter(h => h.status === 'FAILED').length;

  const filteredHistory = React.useMemo(() => {
      if (!history) return [];
      if (!historyFilter.trim()) return history;
      const q = historyFilter.trim().toLowerCase();
      return history.filter(h =>
          h.member_name.toLowerCase().includes(q) ||
          h.account_no.toLowerCase().includes(q) ||
          h.financial_year.includes(q)
      );
  }, [history, historyFilter]);

  return (
    <Card className="h-full border-t-4 border-t-amber-500 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" /> Dividend Management
            </CardTitle>
            <CardDescription>Declare and distribute dividends to members.</CardDescription>
          </div>

          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                  <Button className="bg-slate-900 text-white hover:bg-slate-800">Declare Dividends</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                      <DialogTitle>Distribute Dividends</DialogTitle>
                      <DialogDescription>
                          This will calculate and credit dividends to all eligible members based on their share capital for the selected year.
                      </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-2">

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <Label htmlFor="div-year">Financial Year</Label>
                              <Input
                                  id="div-year"
                                  value={year}
                                  onChange={e => setYear(e.target.value)}
                                  placeholder="e.g. 2025"
                              />
                              {!yearValid && (
                                  <p className="text-[11px] text-red-600">Enter a valid 4-digit year.</p>
                              )}
                          </div>
                          <div className="space-y-1.5">
                              <Label htmlFor="div-eligibility">Eligibility (Record) Date</Label>
                              <Input
                                  id="div-eligibility"
                                  type="date"
                                  value={eligibilityDate}
                                  onChange={e => setEligibilityDate(e.target.value)}
                              />
                          </div>
                      </div>

                      {existingForYear.length > 0 && (
                          <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs p-2.5 rounded flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              FY {year} already has {existingForYear.length} processed record{existingForYear.length > 1 ? 's' : ''}. Confirm this isn't a duplicate distribution.
                          </div>
                      )}

                      <div className="space-y-1.5">
                          <Label htmlFor="div-method">Distribution Method</Label>
                          <Select value={distributionMethod} onValueChange={(v: 'AMOUNT' | 'RATE') => setDistributionMethod(v)}>
                              <SelectTrigger id="div-method">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="AMOUNT">Fixed Total Amount</SelectItem>
                                  <SelectItem value="RATE">Dividend Rate (% of Share Capital)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>

                      {distributionMethod === 'AMOUNT' ? (
                          <div className="space-y-1.5">
                              <Label htmlFor="div-amount">Total Amount to Distribute ({CURRENCY})</Label>
                              <Input
                                  id="div-amount"
                                  type="number"
                                  min="0"
                                  placeholder="0.00"
                                  value={amount}
                                  onChange={e => setAmount(e.target.value)}
                              />
                              {amount && !amountValid && (
                                  <p className="text-[11px] text-red-600">Enter a valid amount greater than 0.</p>
                              )}
                          </div>
                      ) : (
                          <div className="space-y-1.5">
                              <Label htmlFor="div-rate">Dividend Rate (%)</Label>
                              <Input
                                  id="div-rate"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  placeholder="e.g. 12"
                                  value={ratePercent}
                                  onChange={e => setRatePercent(e.target.value)}
                              />
                              {ratePercent && !rateValid && (
                                  <p className="text-[11px] text-red-600">Enter a rate between 0 and 100.</p>
                              )}
                              <p className="text-[11px] text-muted-foreground">
                                  The total payout will be calculated pro-rata against each member's share capital.
                              </p>
                          </div>
                      )}

                      <div className="space-y-1.5">
                          <Label htmlFor="div-wht">Withholding Tax Rate (%)</Label>
                          <Input
                              id="div-wht"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={withholdingTaxRate}
                              onChange={e => setWithholdingTaxRate(e.target.value)}
                          />
                          {!whtValid && (
                              <p className="text-[11px] text-red-600">Enter a rate between 0 and 100.</p>
                          )}
                          {netAmountPreview !== null && (
                              <p className="text-[11px] text-muted-foreground">
                                  Net after withholding: <strong>{formatCurrency(netAmountPreview)}</strong>
                              </p>
                          )}
                      </div>

                      <div className="space-y-1.5">
                          <Label htmlFor="div-resolution" className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" /> Board Resolution Reference No.
                          </Label>
                          <Input
                              id="div-resolution"
                              placeholder="e.g. BOD-RES-2025-014"
                              value={boardResolutionRef}
                              onChange={e => setBoardResolutionRef(e.target.value)}
                          />
                          {!resolutionValid && (
                              <p className="text-[11px] text-red-600">Required for audit and governance records.</p>
                          )}
                      </div>

                      <div className="space-y-1.5">
                          <Label htmlFor="div-notes">Notes (optional)</Label>
                          <Textarea
                              id="div-notes"
                              placeholder="Any context worth recording for the audit trail..."
                              value={notes}
                              onChange={e => setNotes(e.target.value)}
                              rows={2}
                          />
                      </div>

                      <Separator />

                      <div className="bg-amber-50 p-3 rounded text-amber-800 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          This action is irreversible. Funds will be moved from Retained Earnings to Member Savings accounts immediately.
                      </div>

                      <div className="flex items-start gap-2">
                          <Checkbox
                              id="div-approved"
                              checked={confirmApproved}
                              onCheckedChange={(v) => setConfirmApproved(v === true)}
                          />
                          <Label htmlFor="div-approved" className="text-sm font-normal leading-snug">
                              I confirm this distribution has been approved by the Board and funds are available in Retained Earnings.
                          </Label>
                      </div>

                      <div className="space-y-1.5">
                          <Label htmlFor="div-confirm-text">
                              Type <strong>DISTRIBUTE</strong> to confirm
                          </Label>
                          <Input
                              id="div-confirm-text"
                              placeholder="DISTRIBUTE"
                              value={confirmText}
                              onChange={e => setConfirmText(e.target.value)}
                              autoComplete="off"
                          />
                      </div>
                  </div>

                  <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>Cancel</Button>
                      <Button
                        onClick={() => mutation.mutate({
                            tenantId,
                            financialYear: year,
                            distributionMethod,
                            amount: distributionMethod === 'AMOUNT' ? parsedAmount : null,
                            ratePercent: distributionMethod === 'RATE' ? parsedRate : null,
                            eligibilityDate,
                            withholdingTaxRate: parsedWht,
                            boardResolutionRef: boardResolutionRef.trim(),
                            notes
                        })}
                        disabled={!canSubmit}
                        className="disabled:opacity-50"
                      >
                          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirm Distribution"}
                      </Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 border rounded-lg p-3 text-center">
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Total Distributed</span>
                <span className="text-sm font-bold text-slate-900 leading-tight">{formatCurrency(totalDistributed)}</span>
            </div>
            <div className="flex flex-col gap-0.5 border-x">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Pending</span>
                <span className={`text-sm font-bold leading-tight ${pendingCount ? "text-amber-600" : "text-slate-900"}`}>{pendingCount}</span>
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Failed</span>
                <span className={`text-sm font-bold leading-tight ${failedCount ? "text-red-600" : "text-slate-900"}`}>{failedCount}</span>
            </div>
        </div>

        {/* Filter + export */}
        <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                    placeholder="Filter by member, account, or year..."
                    value={historyFilter}
                    onChange={e => setHistoryFilter(e.target.value)}
                    className="pl-8 h-9 text-sm"
                />
            </div>
            <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => downloadCsv(filteredHistory)}
                disabled={!filteredHistory.length}
            >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
        </div>

        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>FY</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Dividend Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : !filteredHistory.length ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            {historyFilter.trim() ? "No records match your filter." : "No dividend history found."}
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredHistory.map((d) => (
                    <TableRow key={d.id}>
                        <TableCell className="text-xs text-muted-foreground">{d.financial_year}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(d.declared_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                            <span className="font-medium text-slate-800">{d.member_name}</span>
                            <div className="text-xs text-muted-foreground">{d.account_no}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {formatCurrency(d.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge className={`${STATUS_STYLES[d.status]} text-white`}>
                                {d.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}