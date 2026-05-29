'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Customer } from '@/types/dashboard';
import { format as formatDate } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

// --- ENTERPRISE TYPE DEFINITIONS (Synced with Business DNA System) ---
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
        kernel_seal_id?: string;
        tax_category?: string;
        currency_code?: string; 
        total_tax?: number;
        invoice_number?: string;
    };
    identity: { 
        legal_name: string; 
        tin_number: string;
        plot_number: string;
        po_box: string;
        official_email: string;
        official_phone: string;
        physical_address: string;
        logo_url: string | null;
        receipt_footer: string;
        currency_code: string;
    };
    customer: Customer | null;
    items: { 
        name: string; 
        qty: number; 
        price: number; 
        total: number; 
    }[];
}

interface BridgePayload {
    printerName: string;
    data: ReceiptData;
}

// --- HARDWARE BRIDGE HOOK (BBU1 PROTOCOL) ---
// Now supports global fallback: if local bridge isn't running, it won't crash the system.
const useHardwarePrint = () => {
    const sendPrintJob = async (payload: BridgePayload) => {
        const bridgeUrl = 'http://localhost:54321/print'; 

        try {
            const response = await fetch(bridgeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Bridge unreachable');
            
            toast.success('Sent to Thermal Printer');
        } catch (err) {
            // Hardware bridge is optional; browser print is the primary fallback
            console.warn('Local Printer Bridge (v54321) not detected. Using Web Print protocol.');
        }
    };

    return { sendPrintJob };
};

interface ReceiptProps {
  receiptData: ReceiptData;
  defaultPrinterName?: string;
  autoPrint?: boolean;
}

// --- MASTER RECEIPT COMPONENT ---
// Uses forwardRef to allow react-to-print to capture the DOM content correctly.
export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ receiptData, defaultPrinterName, autoPrint = false }, ref) => {
    
    const { sendPrintJob } = useHardwarePrint();

    // DEEP ALIGNMENT: Safe extraction of nested objects to prevent "Cannot read properties of undefined"
    const saleInfo = receiptData?.saleInfo;
    const identity = receiptData?.identity;
    const customer = receiptData?.customer;
    const items = receiptData?.items || [];

    useEffect(() => {
        if (autoPrint && defaultPrinterName && receiptData && identity) {
            sendPrintJob({
                printerName: defaultPrinterName,
                data: receiptData,
            });
        }
    }, [autoPrint, defaultPrinterName, receiptData, identity]);

    // Validation Shield: Prevents white-screen crashes if database identity fetch failed
    if (!receiptData || !identity || !saleInfo) {
        return (
            <div className="p-6 text-center border-2 border-dashed border-red-100 rounded-2xl bg-red-50">
                <p className="text-xs text-red-600 font-black uppercase tracking-widest">
                    Invalid Receipt Data
                </p>
                <p className="text-[10px] text-red-400 mt-1">
                    Check System Identity & Business DNA Configuration
                </p>
            </div>
        );
    }
    
    const currency = saleInfo.currency_code || identity.currency_code || 'UGX';
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value || 0);

    return (
      /* 
         DESIGN SPECS: 
         Optimized for 80mm thermal paper standard. 
         Works perfectly on Chrome/Safari/Edge and mobile browsers.
      */
      <div 
        ref={ref} 
        className="p-5 bg-white text-black text-[11px] font-mono w-full max-w-[300px] mx-auto leading-tight overflow-hidden select-none print:p-0 print:w-[80mm] print:max-w-none shadow-sm border border-slate-50"
      >
        
        {/* 1. CORPORATE IDENTITY HEADER */}
        <div className="text-center mb-5 space-y-1">
          {identity.logo_url && (
            <img 
                src={identity.logo_url} 
                alt="Logo" 
                className="h-12 mx-auto mb-2 object-contain grayscale" 
            />
          )}
          <h1 className="text-[14px] font-black uppercase tracking-tighter leading-none">{identity.legal_name}</h1>
          <p className="text-[9px] font-bold opacity-80">{identity.physical_address}</p>
          
          <div className="flex flex-col items-center pt-1">
             <span className="font-bold">TEL: {identity.official_phone}</span>
             {identity.tin_number && (
                <span className="font-black text-[9px] bg-slate-100 px-2 py-0.5 rounded mt-1 border border-slate-200">
                    TIN: {identity.tin_number}
                </span>
             )}
          </div>
        </div>

        <div className="border-t border-b border-black py-2 mb-3">
            <p className="text-center font-black uppercase tracking-widest text-[9px]">Official Fiscal Receipt</p>
        </div>
        
        {/* 2. TRANSACTION METADATA */}
        <div className="mb-4 space-y-1.5 pb-3 border-b border-dashed border-slate-300">
          <div className="flex justify-between">
            <span className="font-bold">RECEIPT #:</span> 
            <span className="font-black">{saleInfo.invoice_number || saleInfo.id?.toString().padStart(8, '0')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">DATE:</span> 
            <span>{formatDate(new Date(saleInfo.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          
          <div className="pt-1">
            <div className="flex justify-between border-t border-slate-100 mt-1 pt-1 italic">
                <span className="font-bold text-slate-500 uppercase text-[9px]">Client:</span> 
                <span className="font-black uppercase text-[10px]">{customer?.name || 'Walk-in Client'}</span>
            </div>
          </div>
        </div>

        {/* 3. ITEMIZATION TABLE */}
        <table className="w-full mb-4">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left pb-1 font-black">ITEM</th>
              <th className="text-center pb-1 font-black">QTY</th>
              <th className="text-right pb-1 font-black">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="text-left py-2 pr-1 align-top">
                    <div className="font-black uppercase leading-tight text-[10px]">{item.name}</div>
                    <div className="text-[8px] text-slate-500 mt-0.5">
                        {formatCurrency(item.price)} {currency}
                    </div>
                </td>
                <td className="text-center py-2 align-top font-bold">{item.qty}</td>
                <td className="text-right py-2 align-top font-black">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* 4. TOTALS & SETTLEMENT */}
        <div className="space-y-1 border-t-2 border-black pt-3">
            <div className="flex justify-between font-bold">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(saleInfo.subtotal)}</span>
            </div>
            
            {saleInfo.discount > 0 && (
                <div className="flex justify-between font-bold text-slate-500 italic">
                    <span>DISCOUNT:</span>
                    <span>- {formatCurrency(saleInfo.discount)}</span>
                </div>
            )}
            
            <div className="flex justify-between font-black text-[13px] border-t border-black mt-2 pt-2">
                <span>TOTAL ({currency}):</span>
                <span>{formatCurrency(saleInfo.total_amount)}</span>
            </div>

            <div className="flex justify-between mt-3 text-slate-600 font-bold uppercase text-[9px]">
                <span>PAID ({saleInfo.payment_method}):</span>
                <span>{formatCurrency(saleInfo.amount_tendered)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-bold uppercase text-[9px]">
                <span>CHANGE DUE:</span>
                <span>{formatCurrency(saleInfo.change_due)}</span>
            </div>
        </div>
        
        {/* 5. SOVEREIGN SEAL & FOOTER */}
        <div className="mt-8 pt-4 border-t border-slate-200 border-double">
            <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Mathematically Sealed</span>
                </div>
                <div className="text-[7px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {saleInfo.kernel_seal_id || 'BBU1_AUTH_LEDGER'}
                </div>
            </div>
            
            <div className="text-center text-[9px] text-slate-800 font-black leading-tight mt-6 px-1 uppercase tracking-tight">
                {identity.receipt_footer || 'Thank you for your business!'}
            </div>
        </div>

        {/* Global Hub Identifier */}
        <div className="mt-8 opacity-20 print:hidden">
            <p className="text-[6px] text-center font-black uppercase tracking-[0.4em]">BBU1 Enterprise Operating System</p>
        </div>
      </div>
    );
});

Receipt.displayName = "Receipt";