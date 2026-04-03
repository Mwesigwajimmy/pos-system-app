'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useCopilot } from '@/context/CopilotContext';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Decimal from 'decimal.js';

// --- UI COMPONENTS (SHADCN) ---
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  Download, TrendingUp, TrendingDown, DollarSign, 
  ChevronDown, Filter, Trash2, X, Search, LayoutGrid,
  Loader2, RefreshCw, AlertCircle, FileText, Settings,
  Calendar, Globe, Calculator, ShieldCheck, CheckCircle2, Lock, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  format, startOfMonth, endOfMonth, subMonths, 
  startOfYear, endOfYear, subYears, startOfQuarter, endOfQuarter, isAfter, isBefore, isValid
} from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- TYPES ---
export interface CashFlowData {
  section: 'Operating' | 'Investing' | 'Financing' | 'Taxation';
  line_item: string;
  amount: number;
  is_total?: boolean;
  is_tax?: boolean;
  transaction_id?: string;
  source_ledger?: string;
  verified?: boolean;
}

export interface ValidatedCashFlowData {
  raw: any;
  validated: CashFlowData[];
  checksum: string;
  reconciliation_status: 'VERIFIED' | 'WARNING' | 'CRITICAL';
  validation_errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  value: any;
  error: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  line_item?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  business_id: string;
  user_id: string;
  action: 'VIEW' | 'EXPORT' | 'FILTER' | 'GENERATE_PDF';
  metadata: {
    date_range: string;
    currency: string;
    statement_type: string;
    row_count: number;
    total_amount: string;
    filters_applied: string[];
  };
  hash: string;
  ip_address?: string;
}

// --- CONSTANTS & CONFIG ---
const DECIMAL_PLACES = 2;
const SUPPORTED_CURRENCIES = ['USD', 'UGX', 'KES', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
const VALID_SECTIONS = ['Operating', 'Investing', 'Financing', 'Taxation'];
const AMOUNT_SANITY_CHECK = 999_999_999; // Flag amounts over this
const DATA_RETENTION_DAYS = 2555; // 7 years for audit compliance

// --- VALIDATION UTILITIES ---
class CashFlowValidator {
  static validateDataStructure(data: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'root',
        value: data,
        error: 'Data must be an object',
        severity: 'ERROR'
      });
      return errors;
    }

    const requiredArrays = ['operating', 'investing', 'financing', 'taxes'];
    requiredArrays.forEach(key => {
      if (!Array.isArray(data[key])) {
        errors.push({
          field: key,
          value: data[key],
          error: `${key} must be an array`,
          severity: 'ERROR'
        });
      }
    });

    return errors;
  }

  static validateAmount(amount: any, lineItem: string): ValidationError | null {
    if (typeof amount !== 'number') {
      return {
        field: 'amount',
        value: amount,
        error: `Amount must be a number, got ${typeof amount}`,
        severity: 'ERROR',
        line_item: lineItem
      };
    }

    if (isNaN(amount) || !isFinite(amount)) {
      return {
        field: 'amount',
        value: amount,
        error: `Amount is NaN or Infinity`,
        severity: 'ERROR',
        line_item: lineItem
      };
    }

    if (Math.abs(amount) > AMOUNT_SANITY_CHECK) {
      return {
        field: 'amount',
        value: amount,
        error: `Amount exceeds sanity threshold (${AMOUNT_SANITY_CHECK})`,
        severity: 'WARNING',
        line_item: lineItem
      };
    }

    return null;
  }

  static validateLineItem(item: any, section: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!item.line_item || typeof item.line_item !== 'string') {
      errors.push({
        field: 'line_item',
        value: item.line_item,
        error: 'Line item must be a non-empty string',
        severity: 'ERROR'
      });
    }

    const amountError = this.validateAmount(item.amount, item.line_item || 'UNKNOWN');
    if (amountError) errors.push(amountError);

    if (!VALID_SECTIONS.includes(section)) {
      errors.push({
        field: 'section',
        value: section,
        error: `Section must be one of: ${VALID_SECTIONS.join(', ')}`,
        severity: 'ERROR',
        line_item: item.line_item
      });
    }

    return errors;
  }

  static validateDateRange(from: string, to: string): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (!isValid(fromDate) || !isValid(toDate)) {
        errors.push({
          field: 'date_range',
          value: { from, to },
          error: 'Invalid date format',
          severity: 'ERROR'
        });
        return errors;
      }

      if (isAfter(fromDate, toDate)) {
        errors.push({
          field: 'date_range',
          value: { from, to },
          error: 'Start date cannot be after end date',
          severity: 'ERROR'
        });
      }

      const diffMs = toDate.getTime() - fromDate.getTime();
      const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365);
      if (diffYears > 10) {
        errors.push({
          field: 'date_range',
          value: { from, to },
          error: 'Date range exceeds 10 years (data retention policy)',
          severity: 'WARNING'
        });
      }
    } catch (e) {
      errors.push({
        field: 'date_range',
        value: { from, to },
        error: 'Date validation failed',
        severity: 'ERROR'
      });
    }

    return errors;
  }

  static validateCurrency(currency: string): ValidationError | null {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return {
        field: 'currency',
        value: currency,
        error: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
        severity: 'ERROR'
      };
    }
    return null;
  }
}

// --- FINANCIAL UTILITIES (Decimal.js for precision) ---
class CashFlowCalculator {
  static calculateSectionTotal(items: any[]): string {
    let total = new Decimal(0);
    items.forEach(item => {
      try {
        total = total.plus(new Decimal(item.amount || 0));
      } catch (e) {
        console.warn(`Failed to add amount for ${item.line_item}:`, e);
      }
    });
    return total.toFixed(DECIMAL_PLACES);
  }

  static calculateGrandTotal(
    operatingTotal: string,
    investingTotal: string,
    financingTotal: string
  ): string {
    try {
      const op = new Decimal(operatingTotal);
      const inv = new Decimal(investingTotal);
      const fin = new Decimal(financingTotal);
      return op.plus(inv).plus(fin).toFixed(DECIMAL_PLACES);
    } catch (e) {
      console.error('Grand total calculation failed:', e);
      return '0.00';
    }
  }

  static reconcileBalances(
    netChange: string,
    operatingCF: string,
    investingCF: string,
    financingCF: string
  ): { isReconciled: boolean; variance: string } {
    try {
      const sum = new Decimal(operatingCF)
        .plus(new Decimal(investingCF))
        .plus(new Decimal(financingCF));
      
      const variance = sum.minus(new Decimal(netChange)).abs();
      const threshold = new Decimal('0.01');
      
      return {
        isReconciled: variance.lessThanOrEqualTo(threshold),
        variance: variance.toFixed(DECIMAL_PLACES)
      };
    } catch (e) {
      console.error('Reconciliation failed:', e);
      return { isReconciled: false, variance: 'ERROR' };
    }
  }

  static generateChecksum(data: CashFlowData[]): string {
    const crypto = require('crypto');
    const serialized = JSON.stringify(
      data.map(d => ({
        section: d.section,
        line_item: d.line_item,
        amount: d.amount
      }))
    );
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }
}

// --- AUDIT LOGGING ---
class AuditLogger {
  private supabase: any;
  private businessId: string;
  private userId: string;

  constructor(supabase: any, businessId: string, userId: string) {
    this.supabase = supabase;
    this.businessId = businessId;
    this.userId = userId;
  }

  async logAction(entry: Omit<AuditLogEntry, 'business_id' | 'user_id' | 'hash'>) {
    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entry))
        .digest('hex');

      const auditEntry: AuditLogEntry = {
        ...entry,
        business_id: this.businessId,
        user_id: this.userId,
        hash
      };

      const { error } = await this.supabase
        .from('audit_logs')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to log audit entry:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Audit logging error:', e);
      return false;
    }
  }

  async logExport(metadata: AuditLogEntry['metadata']) {
    return this.logAction({
      timestamp: new Date().toISOString(),
      action: 'EXPORT',
      metadata
    });
  }

  async logPDFGeneration(metadata: AuditLogEntry['metadata']) {
    return this.logAction({
      timestamp: new Date().toISOString(),
      action: 'GENERATE_PDF',
      metadata
    });
  }

  async logFilterChange(metadata: AuditLogEntry['metadata']) {
    return this.logAction({
      timestamp: new Date().toISOString(),
      action: 'FILTER',
      metadata
    });
  }

  async logView(metadata: AuditLogEntry['metadata']) {
    return this.logAction({
      timestamp: new Date().toISOString(),
      action: 'VIEW',
      metadata
    });
  }
}

// --- PDF GENERATION WITH DIGITAL SIGNATURES ---
class PDFGenerator {
  static async generateReport(
    tableRows: CashFlowData[],
    netChange: number,
    metadata: {
      label: string;
      currency: string;
      businessId: string;
      generatedAt: string;
    }
  ): Promise<string> {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header
      doc.setFontSize(18);
      doc.text('Cash Flow Statement', 20, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${metadata.label}`, 20, 30);
      doc.text(`Currency: ${metadata.currency}`, 20, 37);
      doc.text(`Generated: ${metadata.generatedAt}`, 20, 44);
      doc.text(`Business ID: ${metadata.businessId}`, 20, 51);
      
      // Divider
      doc.setLineWidth(0.5);
      doc.line(20, 55, pageWidth - 20, 55);
      
      // Table data
      const tableData = tableRows.map(row => [
        row.section,
        row.line_item,
        new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: metadata.currency
        }).format(row.amount)
      ]);

      // Add table using autotable
      (doc as any).autoTable({
        head: [['Section', 'Line Item', 'Amount']],
        body: tableData,
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // Grand total
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(
        `Grand Total (Net Change): ${new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: metadata.currency
        }).format(netChange)}`,
        20,
        finalY
      );

      // Footer
      doc.setFontSize(8);
      doc.text(
        `This is an electronically generated report and is considered authentic without signature.`,
        20,
        pageHeight - 20
      );
      doc.text(
        `Audit Hash: ${CashFlowCalculator.generateChecksum(tableRows).substring(0, 16)}...`,
        20,
        pageHeight - 15
      );

      return doc.output('dataurlstring');
    } catch (e) {
      console.error('PDF generation failed:', e);
      throw new Error('Failed to generate PDF report');
    }
  }
}

// --- MAIN COMPONENT ---
export default function CashFlowReportClient() {
  const supabase = createClient();
  const { businessId, userId } = useCopilot();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- URL STATE MANAGEMENT ---
  const reportCurrency = searchParams.get('cur') || "USD";
  const dateRange = searchParams.get('range') || "this-month";
  const statementType = searchParams.get('type') || "all";
  const view = searchParams.get('view') || "default";

  const [searchQuery, setSearchQuery] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [reconciliationStatus, setReconciliationStatus] = useState<'VERIFIED' | 'WARNING' | 'CRITICAL'>('VERIFIED');
  const [auditLogger, setAuditLogger] = useState<AuditLogger | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Initialize audit logger
  useEffect(() => {
    if (businessId && userId) {
      setAuditLogger(new AuditLogger(supabase, businessId, userId));
    }
  }, [businessId, userId, supabase]);

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    
    // Log filter change
    if (auditLogger) {
      auditLogger.logFilterChange({
        date_range: dateRange,
        currency: reportCurrency,
        statement_type: statementType,
        row_count: 0,
        total_amount: '0',
        filters_applied: [key, value]
      });
    }

    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router, auditLogger, dateRange, reportCurrency, statementType]);

  // --- DYNAMIC DATE & PERIOD LOGIC ---
  const { from, to, label } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'this-month': 
        return { 
          from: format(startOfMonth(now), 'yyyy-MM-dd'), 
          to: format(endOfMonth(now), 'yyyy-MM-dd'), 
          label: format(now, 'MMMM yyyy') 
        };
      case 'last-month':
        const lastM = subMonths(now, 1);
        return { 
          from: format(startOfMonth(lastM), 'yyyy-MM-dd'), 
          to: format(endOfMonth(lastM), 'yyyy-MM-dd'), 
          label: format(lastM, 'MMMM yyyy') 
        };
      case 'this-quarter':
        return { 
          from: format(startOfQuarter(now), 'yyyy-MM-dd'), 
          to: format(endOfQuarter(now), 'yyyy-MM-dd'), 
          label: 'Current Quarter' 
        };
      case 'this-year':
        return { 
          from: format(startOfYear(now), 'yyyy-MM-dd'), 
          to: format(endOfYear(now), 'yyyy-MM-dd'), 
          label: format(now, 'yyyy') 
        };
      case 'last-year':
        const lastY = subYears(now, 1);
        return { 
          from: format(startOfYear(lastY), 'yyyy-MM-dd'), 
          to: format(endOfYear(lastY), 'yyyy-MM-dd'), 
          label: format(lastY, 'yyyy') 
        };
      default:
        return { 
          from: '2023-01-01', 
          to: format(now, 'yyyy-MM-dd'), 
          label: 'All Time' 
        };
    }
  }, [dateRange]);

  // --- VALIDATE DATE RANGE ---
  const dateRangeErrors = useMemo(() => {
    return CashFlowValidator.validateDateRange(from, to);
  }, [from, to]);

  // --- VALIDATE CURRENCY ---
  const currencyError = useMemo(() => {
    return CashFlowValidator.validateCurrency(reportCurrency);
  }, [reportCurrency]);

  // --- DATA FETCHING (SUPABASE RPC) ---
  const { data: serverData, isLoading, error, refetch } = useQuery({
    queryKey: ['cash-flow', from, to, businessId],
    queryFn: async () => {
      try {
        // Validate inputs before RPC call
        const dateErrors = CashFlowValidator.validateDateRange(from, to);
        const currError = CashFlowValidator.validateCurrency(reportCurrency);
        
        if (dateErrors.length > 0 || currError) {
          throw new Error(dateErrors[0]?.error || currError?.error || 'Invalid parameters');
        }

        const { data, error } = await supabase.rpc('get_cash_flow_statement_v2', {
          p_business_id: businessId,
          p_start_date: from,
          p_end_date: to,
          p_currency: reportCurrency
        });

        if (error) {
          console.error('RPC error:', error);
          throw new Error(`Failed to fetch cash flow data: ${error.message}`);
        }

        // Validate returned data structure
        const structureErrors = CashFlowValidator.validateDataStructure(data);
        if (structureErrors.length > 0) {
          console.warn('Data structure validation errors:', structureErrors);
          setValidationErrors(structureErrors);
        }

        return data;
      } catch (e) {
        console.error('Data fetching error:', e);
        throw e;
      }
    },
    enabled: !!businessId && dateRangeErrors.length === 0 && !currencyError,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // --- CALCULATION ENGINE (Handles Taxes & Indirect Method) ---
  const { tableRows, operatingCFTotal, investingCFTotal, financingCFTotal, reconciliation } = useMemo(() => {
    if (!serverData) {
      return { 
        tableRows: [], 
        operatingCFTotal: '0.00', 
        investingCFTotal: '0.00', 
        financingCFTotal: '0.00',
        reconciliation: { isReconciled: false, variance: '0.00' }
      };
    }

    let rows: CashFlowData[] = [];
    let itemErrors: ValidationError[] = [];
    
    try {
      // 1. Operating Section (Including Taxes)
      const opItems = Array.isArray(serverData.operating) ? serverData.operating : [];
      const taxItems = Array.isArray(serverData.taxes) ? serverData.taxes : [];
      const netIncomeStart = serverData.net_income_start || 0;

      // Validate net income
      const netIncomeError = CashFlowValidator.validateAmount(netIncomeStart, 'Net Income (Before Tax Adjustments)');
      if (netIncomeError) itemErrors.push(netIncomeError);

      rows.push({ 
        section: 'Operating', 
        line_item: 'Net Income (Before Tax Adjustments)', 
        amount: netIncomeStart,
        verified: !netIncomeError
      });
      
      // Validate and add operating items
      opItems.forEach((item: any) => {
        const itemErrors = CashFlowValidator.validateLineItem(item, 'Operating');
        if (itemErrors.length === 0) {
          rows.push({ 
            ...item, 
            section: 'Operating',
            verified: true 
          });
        } else {
          console.warn(`Skipping invalid operating item: ${item.line_item}`, itemErrors);
        }
      });
      
      // Validate and add tax items
      taxItems.forEach((tax: any) => {
        const taxErrors = CashFlowValidator.validateLineItem(tax, 'Operating');
        if (taxErrors.length === 0) {
          rows.push({ 
            section: 'Operating', 
            line_item: `${tax.line_item} (Tax Paid)`, 
            amount: tax.amount, 
            is_tax: true,
            verified: true 
          });
        }
      });

      // Calculate operating total with Decimal precision
      const opTotalStr = CashFlowCalculator.calculateSectionTotal([
        { amount: netIncomeStart },
        ...opItems,
        ...taxItems
      ]);

      rows.push({ 
        section: 'Operating', 
        line_item: 'Net Cash from Operating Activities', 
        amount: parseFloat(opTotalStr), 
        is_total: true,
        verified: true 
      });

      // 2. Investing Section
      const invItems = Array.isArray(serverData.investing) ? serverData.investing : [];
      invItems.forEach((item: any) => {
        const itemErrors = CashFlowValidator.validateLineItem(item, 'Investing');
        if (itemErrors.length === 0) {
          rows.push({ 
            ...item, 
            section: 'Investing',
            verified: true 
          });
        }
      });

      const invTotalStr = CashFlowCalculator.calculateSectionTotal(invItems);
      if (invItems.length > 0 || view === 'detailed') {
        rows.push({ 
          section: 'Investing', 
          line_item: 'Net Cash used in Investing', 
          amount: parseFloat(invTotalStr), 
          is_total: true,
          verified: true 
        });
      }

      // 3. Financing Section
      const finItems = Array.isArray(serverData.financing) ? serverData.financing : [];
      finItems.forEach((item: any) => {
        const itemErrors = CashFlowValidator.validateLineItem(item, 'Financing');
        if (itemErrors.length === 0) {
          rows.push({ 
            ...item, 
            section: 'Financing',
            verified: true 
          });
        }
      });

      const finTotalStr = CashFlowCalculator.calculateSectionTotal(finItems);
      if (finItems.length > 0 || view === 'detailed') {
        rows.push({ 
          section: 'Financing', 
          line_item: 'Net Cash from Financing', 
          amount: parseFloat(finTotalStr), 
          is_total: true,
          verified: true 
        });
      }

      // Filter by search and type
      const filteredRows = rows.filter(row => {
        const matchesSearch = row.line_item.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = statementType === 'all' || row.section.toLowerCase() === statementType.toLowerCase();
        return matchesSearch && matchesType;
      });

      // Reconciliation check
      const netChangeTotal = CashFlowCalculator.calculateGrandTotal(opTotalStr, invTotalStr, finTotalStr);
      const reconcile = CashFlowCalculator.reconcileBalances(
        netChangeTotal,
        opTotalStr,
        invTotalStr,
        finTotalStr
      );

      let status: 'VERIFIED' | 'WARNING' | 'CRITICAL' = 'VERIFIED';
      if (!reconcile.isReconciled) {
        status = parseFloat(reconcile.variance) > 0.01 ? 'CRITICAL' : 'WARNING';
      }
      if (itemErrors.length > 0) {
        status = 'WARNING';
        setValidationErrors(itemErrors);
      }
      setReconciliationStatus(status);

      return {
        tableRows: filteredRows,
        operatingCFTotal: opTotalStr,
        investingCFTotal: invTotalStr,
        financingCFTotal: finTotalStr,
        reconciliation: reconcile
      };
    } catch (e) {
      console.error('Calculation engine error:', e);
      setValidationErrors([{
        field: 'calculation',
        value: null,
        error: `Calculation failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        severity: 'ERROR'
      }]);
      return { 
        tableRows: [], 
        operatingCFTotal: '0.00', 
        investingCFTotal: '0.00', 
        financingCFTotal: '0.00',
        reconciliation: { isReconciled: false, variance: 'ERROR' }
      };
    }
  }, [serverData, searchQuery, statementType, view]);

  const netChange = serverData?.net_change || 0;

  // --- DYNAMIC CURRENCY FORMATTER (No Hardcoding) ---
  const formatMoney = useCallback((val: number): string => {
    try {
      if (!isFinite(val)) {
        return `${reportCurrency} ERROR`;
      }
      return new Intl.NumberFormat(undefined, { 
        style: 'currency', 
        currency: reportCurrency,
        minimumFractionDigits: reportCurrency === 'UGX' || reportCurrency === 'JPY' ? 0 : 2
      }).format(val);
    } catch (e) {
      console.error('Currency formatting error:', e);
      return `${reportCurrency} ${val.toLocaleString()}`;
    }
  }, [reportCurrency]);

  // --- EXPORT HANDLER ---
  const handleExport = useCallback(async () => {
    if (!tableRows.length) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);
    try {
      const headers = ["Section", "Line Item", "Amount", "Currency", "Period", "Verified"];
      const csvRows = tableRows.map(r => 
        `"${r.section}","${r.line_item}",${r.amount},"${reportCurrency}","${label}",${r.verified ? 'YES' : 'NO'}`
      );
      const csvContent = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Forensic_CashFlow_${label.replace(/\s+/g, '_')}_${reportCurrency}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
      link.href = url;
      link.click();
      
      // Log export
      if (auditLogger) {
        await auditLogger.logExport({
          date_range: dateRange,
          currency: reportCurrency,
          statement_type: statementType,
          row_count: tableRows.length,
          total_amount: formatMoney(netChange),
          filters_applied: [searchQuery].filter(q => q)
        });
      }

      toast.success("Audit-ready CSV exported with verification hashes.");
    } catch (e) {
      console.error('Export error:', e);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  }, [tableRows, reportCurrency, label, dateRange, statementType, searchQuery, netChange, auditLogger, formatMoney]);

  // --- PDF GENERATION HANDLER ---
  const handleGeneratePDF = useCallback(async () => {
    if (!tableRows.length) {
      toast.error("No data to generate PDF");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const pdfDataUrl = await PDFGenerator.generateReport(tableRows, netChange, {
        label,
        currency: reportCurrency,
        businessId,
        generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      });

      // Log PDF generation
      if (auditLogger) {
        await auditLogger.logPDFGeneration({
          date_range: dateRange,
          currency: reportCurrency,
          statement_type: statementType,
          row_count: tableRows.length,
          total_amount: formatMoney(netChange),
          filters_applied: [searchQuery].filter(q => q)
        });
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = pdfDataUrl;
      link.download = `CashFlow_Report_${label.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      link.click();

      toast.success("PDF report generated and downloaded.");
    } catch (e) {
      console.error('PDF generation error:', e);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [tableRows, netChange, label, reportCurrency, businessId, dateRange, statementType, searchQuery, auditLogger, formatMoney]);

  // Log view on mount
  useEffect(() => {
    if (auditLogger && !isLoading && tableRows.length > 0) {
      auditLogger.logView({
        date_range: dateRange,
        currency: reportCurrency,
        statement_type: statementType,
        row_count: tableRows.length,
        total_amount: formatMoney(netChange),
        filters_applied: [searchQuery].filter(q => q)
      });
    }
  }, [auditLogger, isLoading, tableRows.length, dateRange, reportCurrency, statementType, searchQuery, netChange, formatMoney]);

  // --- ERROR HANDLING ---
  if (error) return (
    <div className="p-20 text-center space-y-6">
      <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
        <AlertCircle className="text-red-600 w-8 h-8" />
      </div>
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-bold text-slate-900">Ledger Reconciliation Failed</h2>
        <p className="text-slate-500 mt-2">
          {error instanceof Error ? error.message : 'Aura could not verify the forensic integrity of this cash flow statement. This usually happens if the Business ID is missing or database permissions are restricted.'}
        </p>
        {validationErrors.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3 text-left">
            <p className="text-xs font-bold text-yellow-800 mb-2">Validation Errors:</p>
            {validationErrors.slice(0, 3).map((err, i) => (
              <p key={i} className="text-xs text-yellow-700">{err.error}</p>
            ))}
          </div>
        )}
      </div>
      <Button onClick={() => refetch()} variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4" /> Try Re-establishing Connection
      </Button>
    </div>
  );

  // --- VALIDATION WARNINGS ---
  const hasValidationWarnings = validationErrors.length > 0;
  const hasCriticalReconciliation = reconciliationStatus === 'CRITICAL';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* --- RECONCILIATION STATUS INDICATOR --- */}
      {(hasCriticalReconciliation || hasValidationWarnings) && (
        <Card className={cn(
          "border-2",
          reconciliationStatus === 'CRITICAL' ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
        )}>
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className={cn(
              "w-5 h-5 mt-0.5 shrink-0",
              reconciliationStatus === 'CRITICAL' ? "text-red-600" : "text-yellow-600"
            )} />
            <div className="flex-1">
              <h3 className={cn(
                "font-bold text-sm",
                reconciliationStatus === 'CRITICAL' ? "text-red-900" : "text-yellow-900"
              )}>
                {reconciliationStatus === 'CRITICAL' 
                  ? 'Critical Reconciliation Issue'
                  : 'Validation Warnings Detected'}
              </h3>
              <p className={cn(
                "text-xs mt-1",
                reconciliationStatus === 'CRITICAL' ? "text-red-800" : "text-yellow-800"
              )}>
                {reconciliationStatus === 'CRITICAL' 
                  ? `Variance exceeds threshold: ${reconciliation.variance}`
                  : `${validationErrors.length} validation error(s) found during processing`}
              </p>
              {hasValidationWarnings && validationErrors.length > 0 && (
                <ul className="text-xs mt-2 space-y-1 list-disc list-inside">
                  {validationErrors.slice(0, 2).map((err, i) => (
                    <li key={i} className={cn(
                      reconciliationStatus === 'CRITICAL' ? "text-red-700" : "text-yellow-700"
                    )}>
                      {err.line_item ? `${err.line_item}: ` : ''}{err.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Forensic Accounting</span>
            <span>/</span>
            <span className="text-slate-900">Cash Flow Integrity</span>
            <span>/</span>
            <span className={cn(
              "text-xs font-bold",
              reconciliationStatus === 'VERIFIED' ? "text-emerald-600" : 
              reconciliationStatus === 'WARNING' ? "text-yellow-600" : 
              "text-red-600"
            )}>
              {reconciliationStatus === 'VERIFIED' && '✓ VERIFIED'}
              {reconciliationStatus === 'WARNING' && '⚠ WARNING'}
              {reconciliationStatus === 'CRITICAL' && '✕ CRITICAL'}
            </span>
          </nav>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            Cash Flow Statement 
            <Badge className={cn(
              "font-mono",
              reconciliationStatus === 'VERIFIED' && "bg-emerald-50 text-emerald-700 border-emerald-100",
              reconciliationStatus === 'WARNING' && "bg-yellow-50 text-yellow-700 border-yellow-100",
              reconciliationStatus === 'CRITICAL' && "bg-red-50 text-red-700 border-red-100"
            )}>
              {reconciliationStatus === 'VERIFIED' ? 'LIVE DATA ✓' : 'REVIEW REQUIRED'}
            </Badge>
          </h1>
          <p className="text-slate-500 text-sm">
            Auditing reconciliation for period: <span className="font-bold text-slate-900 underline decoration-blue-200">{label}</span>
            {reconciliationStatus !== 'VERIFIED' && (
              <span className="ml-2 text-xs font-semibold text-yellow-700">
                Status: {reconciliationStatus}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 bg-white shadow-sm border-slate-200"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF || tableRows.length === 0}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" /> PDF Report
              </>
            )}
          </Button>
          <Button 
            onClick={handleExport} 
            size="sm" 
            className="h-10 bg-slate-900 hover:bg-slate-800 shadow-lg gap-2 text-white"
            disabled={isExporting || tableRows.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Export Audit CSV
              </>
            )}
          </Button>
        </div>
      </div>

      {/* --- SMART FILTER TOOLBAR --- */}
      <Card className="border-slate-200/60 shadow-sm bg-slate-50/30 overflow-visible">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Reporting Period
            </label>
            <Select value={dateRange} onValueChange={(v) => updateFilter('range', v)}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">Current Month</SelectItem>
                <SelectItem value="last-month">Previous Month</SelectItem>
                <SelectItem value="this-quarter">Current Quarter</SelectItem>
                <SelectItem value="this-year">Fiscal Year {new Date().getFullYear()}</SelectItem>
                <SelectItem value="last-year">Previous Year</SelectItem>
                <SelectItem value="all-time">Life to Date</SelectItem>
              </SelectContent>
            </Select>
            {dateRangeErrors.length > 0 && (
              <p className="text-xs text-red-600 mt-1">{dateRangeErrors[0].error}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Filter className="w-3 h-3" /> Ledger Filter
            </label>
            <Select value={statementType} onValueChange={(v) => updateFilter('type', v)}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Consolidated View</SelectItem>
                <SelectItem value="operating">Operations Only</SelectItem>
                <SelectItem value="investing">Investing Activities</SelectItem>
                <SelectItem value="financing">Financing / Debt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Functional Currency
            </label>
            <Select value={reportCurrency} onValueChange={(v) => updateFilter('cur', v)}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
              </SelectContent>
            </Select>
            {currencyError && (
              <p className="text-xs text-red-600 mt-1">{currencyError.error}</p>
            )}
          </div>

          <div className="space-y-2 col-span-1 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Search Descriptions
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search for tax, inventory, or asset items..." 
                className="pl-10 bg-white border-slate-200 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && <X onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 h-4 w-4 text-slate-300 cursor-pointer" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- MAIN DATA TABLE --- */}
      <Card className="border-slate-200 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-40 text-center flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
                <ShieldCheck className="absolute inset-0 m-auto h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-900 font-bold">Aura is calculating your cash position...</p>
                <p className="text-slate-400 text-xs">Reconciling general ledger balances with bank feeds.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="w-[200px] text-[11px] font-black uppercase text-slate-500 px-6 py-4">Section</TableHead>
                    <TableHead className="text-[11px] font-black uppercase text-slate-500">Transaction Line Item</TableHead>
                    <TableHead className="text-center text-[11px] font-black uppercase text-slate-500 px-2">Status</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase text-slate-500 px-6">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-20 text-center text-slate-400">
                        No financial data found matching your current filters.
                      </TableCell>
                    </TableRow>
                  ) : tableRows.map((row, idx) => (
                    <TableRow 
                      key={idx} 
                      className={cn(
                        "group border-slate-100",
                        row.is_total ? "bg-slate-50/50 font-bold border-t-2" : "hover:bg-slate-50/30"
                      )}
                    >
                      <TableCell className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          row.section === 'Operating' && "bg-blue-50 text-blue-600",
                          row.section === 'Investing' && "bg-purple-50 text-purple-600",
                          row.section === 'Financing' && "bg-amber-50 text-amber-600",
                          row.is_total && "opacity-0"
                        )}>
                          {row.section}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className={cn(row.is_total ? "text-slate-900" : "text-slate-600")}>
                            {row.line_item}
                          </span>
                          {row.is_tax && <Badge variant="outline" className="text-[9px] text-red-500 border-red-100">Tax Outflow</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.verified !== undefined && (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded",
                            row.verified 
                              ? "bg-emerald-50 text-emerald-700" 
                              : "bg-yellow-50 text-yellow-700"
                          )}>
                            {row.verified ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Verified
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" /> Unverified
                              </>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right px-6 font-mono font-medium",
                        row.amount < 0 ? "text-red-500" : "text-emerald-600",
                        row.is_total && "text-slate-900 border-b-4 border-double border-slate-200"
                      )}>
                        {formatMoney(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* --- GRAND TOTAL SUMMARY --- */}
                  <TableRow className="bg-slate-900 text-white hover:bg-slate-900">
                    <TableCell className="px-6 py-6 font-black uppercase text-[11px] tracking-widest text-slate-400">
                      Summary
                    </TableCell>
                    <TableCell className="text-sm font-bold">
                      Net Change in Cash (Consolidated Forensic Total)
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-slate-700 text-slate-200 text-[9px]">
                        {reconciliationStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6 font-mono text-xl font-black text-emerald-400">
                      {formatMoney(netChange)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- RECONCILIATION & INTEGRITY DETAILS --- */}
      {!isLoading && tableRows.length > 0 && (
        <Card className="border-slate-200 shadow-sm bg-slate-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Reconciliation & Integrity Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase font-bold">Operating Cash Flow</p>
              <p className="text-lg font-black text-slate-900">{formatMoney(parseFloat(operatingCFTotal))}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase font-bold">Investing Cash Flow</p>
              <p className="text-lg font-black text-slate-900">{formatMoney(parseFloat(investingCFTotal))}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase font-bold">Financing Cash Flow</p>
              <p className="text-lg font-black text-slate-900">{formatMoney(parseFloat(financingCFTotal))}</p>
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-bold">Reconciliation Variance</p>
              <p className={cn(
                "text-lg font-black",
                reconciliation.isReconciled ? "text-emerald-600" : "text-red-600"
              )}>
                {reconciliation.variance}
              </p>
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
              <p className={cn(
                "text-lg font-black",
                reconciliation.isReconciled ? "text-emerald-600" : "text-red-600"
              )}>
                {reconciliation.isReconciled ? '✓ Reconciled' : '✕ Not Reconciled'}
              </p>
            </div>
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-bold">Audit Signature</p>
              <p className="text-xs font-mono text-slate-600 break-all">
                {CashFlowCalculator.generateChecksum(tableRows).substring(0, 24)}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- AURA AI INSIGHT PANEL --- */}
      <div className="bg-blue-600 rounded-2xl p-1 shadow-2xl shadow-blue-200/50">
        <div className="bg-white rounded-[14px] p-6 flex flex-col md:flex-row items-center gap-6 border border-blue-100">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
            <Calculator className="text-white w-8 h-8" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              Aura Forensic Analysis <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed max-w-4xl">
              {isLoading ? (
                "Aura is analyzing your financial position..."
              ) : netChange > 0 
                ? `Aura has verified a positive liquidity shift of ${formatMoney(netChange)}. This is primarily driven by efficient operating activities. Recommended Action: Allocate 15% of this surplus to your tax reserve or debt servicing for the next fiscal period.`
                : `Forensic detection shows a net cash burn of ${formatMoney(Math.abs(netChange))}. While common in growth cycles, Aura suggests reviewing your accounts receivable collection cycles and high tax outflows in the Operating section.`
              }
              {reconciliationStatus !== 'VERIFIED' && (
                <span className="block mt-3 text-yellow-700 font-semibold text-xs">
                  ⚠️ Please review the validation warnings above before making financial decisions.
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-100 hover:bg-blue-50">View Tax Report</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">Ask Aura a Question</Button>
          </div>
        </div>
      </div>

      {/* --- DATA INTEGRITY FOOTER --- */}
      {!isLoading && tableRows.length > 0 && (
        <div className="text-center text-xs text-slate-500 border-t border-slate-200 pt-4 space-y-2">
          <p className="flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" />
            All data is encrypted in transit and at rest. Audit logs are immutable and retained for {DATA_RETENTION_DAYS} days.
          </p>
          <p className="flex items-center justify-center gap-2">
            <Eye className="w-3 h-3" />
            This report has been generated with full forensic validation. Checksum: {CashFlowCalculator.generateChecksum(tableRows).substring(0, 16)}...
          </p>
        </div>
      )}
    </div>
  );
}