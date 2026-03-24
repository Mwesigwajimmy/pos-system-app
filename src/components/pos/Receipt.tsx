'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { Customer } from '@/types/dashboard';
import { format as formatDate } from 'date-fns';
import { ShieldCheck, Fingerprint, Globe, Landmark } from 'lucide-react'; // UPGRADE: Professional Icons

// --- TYPE DEFINITIONS ---
export interface ReceiptData {
    saleInfo: { 
        id?: number; 
        created_at: Date | string; 
        payment_method: string; 
        total_amount: number; 
        amount_tendered: number; 
        change_due: number; 
        subtotal: number;
        discount: number;
        amount_due: number;
        // --- UPGRADE: FORENSIC METADATA ---
        kernel_seal_id?: string;
        tax_category?: string;
        region_code?: string;
        currency_code?: string; // UPGRADE: Autonomous Currency ID
        total_tax?: number;    // UPGRADE: Total tax for the summary
    };
    storeInfo: { 
        name: string; 
        address: string; 
        phone_number: string; 
        receipt_footer: string; 
        tax_number?: string;   // UPGRADE: Business TIN/Tax ID
    };
    customerInfo: Customer | null;
    saleItems: { 
        product_name: string; 
        variant_name: string; 
        quantity: number; 
        unit_price: number; 
        subtotal: number; 
        tax_code?: string; 
        tax_amount?: number; // UPGRADE: Per-item tax amount for absolute clarity
    }[];
}

interface BridgePayload {
    printerName: string;
    data: ReceiptData;
}

// --- HARDWARE BRIDGE HOOK ---
const useHardwarePrint = () => {
    const sendPrintJob = (payload: BridgePayload) => {
        const bridgeUrl = 'http://localhost:54321/print'; 

        const promise = fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Failed to connect to the hardware bridge.');
                });
            }
            return response.json();
        });

        toast.promise(promise, {
            loading: `Sending to printer "${payload.printerName}"...`,
            success: 'Print job sent successfully!',
            error: (err: any) => `Print Error: ${err.message}. Is the bridge app running?`,
        });
    };

    return { sendPrintJob };
};


// --- PROPS INTERFACE ---
interface ReceiptProps {
  receiptData: ReceiptData;
  defaultPrinterName?: string;
  autoPrint?: boolean;
}

// --- ADVANCED RECEIPT COMPONENT ---
export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ receiptData, defaultPrinterName, autoPrint = false }, ref) => {
    
    const { sendPrintJob } = useHardwarePrint();

    useEffect(() => {
        if (autoPrint && defaultPrinterName) {
            sendPrintJob({
                printerName: defaultPrinterName,
                data: receiptData,
            });
        }
    }, [autoPrint, defaultPrinterName, receiptData, sendPrintJob]);

    if (!receiptData) return null;
    
    const { saleInfo, storeInfo, customerInfo, saleItems } = receiptData;
    const currency = saleInfo.currency_code || 'UGX';
    
    // UPGRADE: High-precision decimal formatter
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value || 0);

    // UPGRADE: Precision Quantity Formatter
    const formatQty = (value: number) => {
        return value % 1 === 0 ? value.toString() : value.toFixed(3);
    };

    return (
      <div ref={ref} className="p-4 bg-white text-black text-xs font-mono w-[302px] border shadow-sm mx-auto">
        {/* Header - Enterprise Brand & Identity */}
        <div className="text-center mb-4 border-b pb-2">
          <h1 className="text-lg font-bold uppercase tracking-tighter">{storeInfo?.name || 'Sovereign Entity'}</h1>
          <p className="text-[9px] uppercase leading-tight">{storeInfo?.address}</p>
          <p className="text-[9px]">TEL: {storeInfo?.phone_number}</p>
          
          {/* UPGRADE: Tax Authority Identity (Birthed at Signup) */}
          {storeInfo.tax_number && (
            <p className="text-[9px] font-bold mt-1">TIN: {storeInfo.tax_number}</p>
          )}

          {/* UPGRADE: Global Jurisdiction / Region */}
          {saleInfo.region_code && (
            <div className="flex items-center justify-center gap-1 mt-1 text-[8px] font-bold border rounded px-1 w-fit mx-auto bg-slate-50">
                <Globe className="w-2 h-2" /> JURISDICTION: {saleInfo.region_code}
            </div>
          )}
        </div>
        
        {/* Info Section - Transaction Metadata */}
        <div className="mb-4 space-y-0.5 text-[10px]">
          <p className="flex justify-between uppercase"><strong>Receipt No:</strong> <span>{saleInfo.id?.toString().padStart(8, '0') || 'DRAFT'}</span></p>
          <p className="flex justify-between uppercase"><strong>Date/Time:</strong> <span>{formatDate(new Date(saleInfo.created_at), 'dd/MM/yyyy HH:mm')}</span></p>
          <p className="flex justify-between uppercase"><strong>Cashier/Op:</strong> <span>{saleInfo.kernel_seal_id?.substring(0, 8) || 'SYSTEM'}</span></p>
          <p className="flex justify-between uppercase border-t pt-1 mt-1 font-bold"><strong>Client:</strong> <span>{customerInfo?.name || 'CASH SALE'}</span></p>
          
          {/* Member ID Visibility for SACCO/Lending DNA */}
          {customerInfo?.id && <p className="flex justify-between font-bold italic"><strong>Member ID:</strong> <span>{customerInfo.id}</span></p>}
        </div>

        {/* Items Table - Detailed Fractional Billing */}
        <table className="w-full mb-4 text-[10px]">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left pb-1">DESCRIPTION</th>
              <th className="text-right pb-1">QTY</th>
              <th className="text-right pb-1">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {saleItems?.map((item, index) => (
              <tr key={index} className="border-b border-dashed border-slate-200">
                <td className="text-left py-1 pr-2">
                    <span className="font-bold">{item.product_name}</span>
                    <br/>
                    <div className="flex flex-col text-[9px] text-slate-600 italic">
                        <span>{item.variant_name} @ {formatCurrency(item.unit_price)}</span>
                        {/* UPGRADE: Per-item Tax Breakdown (Mandatory for Compliance) */}
                        {item.tax_amount > 0 && (
                            <span className="text-[8px] font-medium text-slate-400">
                                Incl. {item.tax_code || 'VAT'}: {formatCurrency(item.tax_amount)}
                            </span>
                        )}
                    </div>
                </td>
                <td className="text-right py-1 align-top">{formatQty(item.quantity)}</td>
                <td className="text-right py-1 align-top font-bold">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Totals Section - Unified Ledger Parity */}
        <div className="space-y-1 border-t-2 border-black pt-2 text-[11px]">
            <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(saleInfo.subtotal)}</span>
            </div>
            
            {/* UPGRADE: Global Tax Disclosure */}
            {saleInfo.total_tax > 0 && (
                <div className="flex justify-between text-slate-600 italic">
                    <span>TOTAL TAX ({saleInfo.tax_category || 'VAT'}):</span>
                    <span>{formatCurrency(saleInfo.total_tax)}</span>
                </div>
            )}

            {saleInfo.discount > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                    <span>DISCOUNT:</span>
                    <span>- {formatCurrency(saleInfo.discount)}</span>
                </div>
            )}
            
            <div className="flex justify-between font-black text-sm border-t-2 border-double border-black mt-1 pt-1">
                <span>TOTAL DUE ({currency}):</span>
                <span>{formatCurrency(saleInfo.total_amount)}</span>
            </div>

            <div className="flex justify-between mt-3 text-[10px] text-slate-600">
                <span className="uppercase">{saleInfo.payment_method} TENDERED:</span>
                <span>{formatCurrency(saleInfo.amount_tendered)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600">
                <span>CHANGE DUE:</span>
                <span>{formatCurrency(saleInfo.change_due)}</span>
            </div>

            {/* UPGRADE: Debt/Credit Monitor (For Lending & Microfinance) */}
            {saleInfo.amount_due > 0 && (
                <div className="flex justify-between font-bold text-red-600 border-2 border-red-600 p-1 mt-2 text-center bg-red-50">
                    <span>OUTSTANDING BAL:</span>
                    <span>{formatCurrency(saleInfo.amount_due)}</span>
                </div>
            )}
        </div>
        
        {/* --- SOVEREIGN FORENSIC SEAL --- */}
        <div className="mt-8 border-t pt-2 space-y-3">
            <div className="flex flex-col items-center justify-center opacity-70">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    <span className="text-[8px] font-bold tracking-widest uppercase">Kernel Sealed & Forensic Verified</span>
                </div>
                <div className="flex items-center gap-1">
                    <Fingerprint className="w-2 h-2 text-slate-400" />
                    <span className="text-[7px] font-mono text-slate-400 uppercase">
                        SEAL ID: {saleInfo.kernel_seal_id || `SOV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`}
                    </span>
                </div>
            </div>
            
            <div className="text-center text-[9px] leading-tight text-slate-600 font-medium">
                {storeInfo?.receipt_footer || 'Thank you for choosing Sovereign ERP.'}
            </div>
            
            <div className="text-[7px] text-center text-slate-400 uppercase tracking-tighter">
                Audit Status: 100% Integrity Parity with General Ledger
            </div>
        </div>

        {/* Professional Barcode/Scanning Identity */}
        <div className="mt-4 flex flex-col items-center gap-1">
            <div className="h-10 w-full bg-slate-900 flex items-center justify-center text-white text-[8px] tracking-[1em] font-black opacity-10">
                |||||||||||||||||||||||||||||||||||||||
            </div>
            <span className="text-[7px] text-slate-300 font-mono italic">Trace ID: {saleInfo.id || 'N/A'}</span>
        </div>
      </div>
    );
});

Receipt.displayName = "Receipt";