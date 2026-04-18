'use client';

import React, { useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Customer } from '@/types/dashboard';
import { format as formatDate } from 'date-fns';
import { CheckCircle2, ShieldCheck, MapPin, Printer, Hash, Phone, Globe } from 'lucide-react';

// --- ENTERPRISE TYPE DEFINITIONS (Synced with get_receipt_data_v2) ---
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
    // This now pulls directly from the Sovereign Identity View
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
                    throw new Error(err.error || 'Hardware Bridge Offline.');
                });
            }
            return response.json();
        });

        toast.promise(promise, {
            loading: `Sending to local printer...`,
            success: 'Sovereign Print Successful',
            error: (err: any) => `Printer Error: ${err.message}`,
        });
    };

    return { sendPrintJob };
};

interface ReceiptProps {
  receiptData: ReceiptData;
  defaultPrinterName?: string;
  autoPrint?: boolean;
}

// --- MASTER RECEIPT COMPONENT ---
export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ receiptData, defaultPrinterName, autoPrint = false }, ref) => {
    
    const { sendPrintJob } = useHardwarePrint();

    useEffect(() => {
        if (autoPrint && defaultPrinterName && receiptData) {
            sendPrintJob({
                printerName: defaultPrinterName,
                data: receiptData,
            });
        }
    }, [autoPrint, defaultPrinterName, receiptData, sendPrintJob]);

    if (!receiptData) return null;
    
    const { saleInfo, identity, customer, items } = receiptData;
    const currency = saleInfo.currency_code || identity.currency_code || 'UGX';
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value || 0);

    return (
      <div ref={ref} className="p-6 bg-white text-black text-[10px] font-mono w-[300px] mx-auto leading-relaxed overflow-hidden select-none print:p-0">
        
        {/* 1. CORPORATE IDENTITY HEADER */}
        <div className="text-center mb-6 space-y-1">
          {identity.logo_url && (
            <img 
                src={identity.logo_url} 
                alt="Logo" 
                className="h-12 mx-auto mb-2 object-contain grayscale" 
            />
          )}
          <h1 className="text-sm font-black uppercase tracking-tighter leading-none">{identity.legal_name}</h1>
          <p className="text-[8px] font-bold opacity-80">{identity.physical_address}</p>
          
          <div className="flex flex-col items-center pt-1">
             <div className="flex items-center gap-2">
                <span className="font-bold">TEL: {identity.official_phone}</span>
             </div>
             {identity.tin_number && (
                <span className="font-black text-[9px] bg-slate-100 px-2 py-0.5 rounded mt-1 border border-slate-200">
                    TIN: {identity.tin_number}
                </span>
             )}
          </div>
        </div>

        <div className="border-t border-b border-black py-2 mb-4 space-y-1">
            <p className="text-center font-black uppercase tracking-widest text-[9px]">Official Fiscal Receipt</p>
        </div>
        
        {/* 2. TRANSACTION METADATA */}
        <div className="mb-4 space-y-1 pb-4 border-b border-dashed border-slate-300">
          <div className="flex justify-between">
            <span className="font-bold">RECEIPT #:</span> 
            <span className="font-black">{saleInfo.invoice_number || saleInfo.id?.toString().padStart(8, '0')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">DATE:</span> 
            <span>{formatDate(new Date(saleInfo.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">IDENTITY:</span> 
            <span className="uppercase text-[8px] font-bold">{saleInfo.kernel_seal_id?.substring(0, 12) || 'AUTH_SYSTEM'}</span>
          </div>
          
          <div className="pt-2">
            <div className="flex justify-between border-t border-slate-100 mt-1 pt-1 italic">
                <span className="font-bold text-slate-500 uppercase">Customer:</span> 
                <span className="font-black uppercase">{customer?.name || 'Walk-in Client'}</span>
            </div>
          </div>
        </div>

        {/* 3. ITEMIZATION TABLE */}
        <table className="w-full mb-4">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left pb-1 font-black">ITEM DESCRIPTION</th>
              <th className="text-center pb-1 font-black">QTY</th>
              <th className="text-right pb-1 font-black">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items?.map((item, index) => (
              <tr key={index}>
                <td className="text-left py-2 pr-2 align-top">
                    <div className="font-black uppercase leading-none mb-1 text-[9px]">{item.name}</div>
                    <div className="text-[8px] text-slate-500 italic">
                        Unit: {formatCurrency(item.price)} {currency}
                    </div>
                </td>
                <td className="text-center py-2 align-top font-bold text-[9px]">{item.qty}</td>
                <td className="text-right py-2 align-top font-black text-[9px]">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* 4. TOTALS & SETTLEMENT */}
        <div className="space-y-1.5 border-t-2 border-black pt-3">
            <div className="flex justify-between font-bold">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(saleInfo.subtotal)}</span>
            </div>
            
            {saleInfo.total_tax > 0 && (
                <div className="flex justify-between font-bold text-slate-700">
                    <span>TAX ({saleInfo.tax_category || 'VAT'}):</span>
                    <span>{formatCurrency(saleInfo.total_tax)}</span>
                </div>
            )}

            {saleInfo.discount > 0 && (
                <div className="flex justify-between font-bold text-slate-500 italic">
                    <span>DISCOUNT APPLIED:</span>
                    <span>- {formatCurrency(saleInfo.discount)}</span>
                </div>
            )}
            
            <div className="flex justify-between font-black text-xs border-t border-black mt-2 pt-2">
                <span>GRAND TOTAL ({currency}):</span>
                <span>{formatCurrency(saleInfo.total_amount)}</span>
            </div>

            <div className="flex justify-between mt-3 text-slate-600 font-black uppercase text-[9px]">
                <span>{saleInfo.payment_method} TENDERED:</span>
                <span>{formatCurrency(saleInfo.amount_tendered)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-black uppercase text-[9px]">
                <span>CHANGE RETURNED:</span>
                <span>{formatCurrency(saleInfo.change_due)}</span>
            </div>

            {/* Arrears Detection */}
            {saleInfo.amount_due > 0 && (
                <div className="p-2 mt-4 text-center bg-slate-900 text-white rounded-md">
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] mb-1">Balance Remaining</span>
                    <span className="text-sm font-black">{formatCurrency(saleInfo.amount_due)} {currency}</span>
                </div>
            )}
        </div>
        
        {/* 5. SOVEREIGN SEAL & FOOTER */}
        <div className="mt-8 pt-4 border-t border-slate-200 border-double">
            <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Mathematically Sealed</span>
                </div>
                <div className="text-[7px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                    {saleInfo.kernel_seal_id || `SVRGN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`}
                </div>
            </div>
            
            <div className="text-center text-[9px] text-slate-800 font-black leading-relaxed mt-6 px-2 uppercase tracking-tight">
                {identity.receipt_footer || 'Thank you for choosing Sovereign OS.'}
            </div>
        </div>

        {/* System Identifier */}
        <div className="mt-8 opacity-20 group">
            <div className="h-4 w-full bg-slate-200 rounded-sm overflow-hidden flex items-center justify-center">
                <div className="flex gap-1 animate-pulse">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="w-[1px] h-3 bg-black" />
                    ))}
                </div>
            </div>
            <p className="text-[6px] text-center font-black mt-1 uppercase tracking-[0.5em]">BBU1 Enterprise OS - Global Hub</p>
        </div>
      </div>
    );
});

Receipt.displayName = "Receipt";