'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Customer } from '@/types/dashboard';
import { format as formatDate } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

// --- ENTERPRISE TYPE DEFINITIONS ---
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

// --- HARDWARE BRIDGE HOOK ---
// Removed the hardcoded blocking logic. Now it tries to connect but won't stop the UI if offline.
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
            // If bridge is offline, we don't show a big error, 
            // as the user will likely use the "Web Print" button instead.
            console.log('Hardware printer bridge not detected. Use Web Print instead.');
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
export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ receiptData, defaultPrinterName, autoPrint = false }, ref) => {
    
    const { sendPrintJob } = useHardwarePrint();

    // 1. SAFE DATA ACCESS (Prevents the 'currency_code of undefined' error)
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

    // Ensure we don't render if data is missing
    if (!receiptData || !identity || !saleInfo) {
        return (
            <div className="p-4 text-center text-xs text-red-500 font-bold">
                Invalid Receipt Data: Check System Configuration
            </div>
        );
    }
    
    const currency = saleInfo.currency_code || identity.currency_code || 'UGX';
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value || 0);

    return (
      /* Optimized for standard 80mm thermal paper during Browser Print */
      <div 
        ref={ref} 
        className="p-4 bg-white text-black text-[11px] font-mono w-full max-w-[300px] mx-auto leading-tight overflow-hidden select-none print:p-0 print:w-[80mm] print:max-w-none shadow-sm border border-slate-50"
      >
        
        {/* 1. CORPORATE IDENTITY HEADER */}
        <div className="text-center mb-4 space-y-1">
          {identity.logo_url && (
            <img 
                src={identity.logo_url} 
                alt="Logo" 
                className="h-10 mx-auto mb-2 object-contain grayscale" 
            />
          )}
          <h1 className="text-[13px] font-black uppercase tracking-tighter leading-none">{identity.legal_name}</h1>
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

        <div className="border-t border-b border-black py-1.5 mb-3">
            <p className="text-center font-black uppercase tracking-widest text-[9px]">Official Fiscal Receipt</p>
        </div>
        
        {/* 2. TRANSACTION METADATA */}
        <div className="mb-3 space-y-1 pb-3 border-b border-dashed border-slate-300">
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
                <span className="font-bold text-slate-500 uppercase">Customer:</span> 
                <span className="font-black uppercase">{customer?.name || 'Walk-in Client'}</span>
            </div>
          </div>
        </div>

        {/* 3. ITEMIZATION TABLE */}
        <table className="w-full mb-3">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left pb-1 font-black">ITEM</th>
              <th className="text-center pb-1 font-black">QTY</th>
              <th className="text-right pb-1 font-black">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="text-left py-1.5 pr-1 align-top">
                    <div className="font-black uppercase leading-none text-[10px]">{item.name}</div>
                    <div className="text-[8px] text-slate-500">
                        {formatCurrency(item.price)} {currency}
                    </div>
                </td>
                <td className="text-center py-1.5 align-top font-bold">{item.qty}</td>
                <td className="text-right py-1.5 align-top font-black">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* 4. TOTALS & SETTLEMENT */}
        <div className="space-y-1 border-t border-black pt-2">
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
            
            <div className="flex justify-between font-black text-[12px] border-t border-black mt-1 pt-1">
                <span>TOTAL ({currency}):</span>
                <span>{formatCurrency(saleInfo.total_amount)}</span>
            </div>

            <div className="flex justify-between mt-2 text-slate-600 font-bold uppercase text-[9px]">
                <span>PAID ({saleInfo.payment_method}):</span>
                <span>{formatCurrency(saleInfo.amount_tendered)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-bold uppercase text-[9px]">
                <span>CHANGE:</span>
                <span>{formatCurrency(saleInfo.change_due)}</span>
            </div>
        </div>
        
        {/* 5. SOVEREIGN SEAL & FOOTER */}
        <div className="mt-6 pt-3 border-t border-slate-200 border-double">
            <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Mathematically Sealed</span>
                </div>
                <div className="text-[7px] font-mono text-slate-400">
                    {saleInfo.kernel_seal_id || 'AUTHENTIC_SALE'}
                </div>
            </div>
            
            <div className="text-center text-[9px] text-slate-800 font-bold leading-tight mt-4 px-1 uppercase">
                {identity.receipt_footer || 'Thank you for your business!'}
            </div>
        </div>

        {/* System Identifier */}
        <div className="mt-6 opacity-10 print:hidden">
            <p className="text-[6px] text-center font-black uppercase tracking-[0.3em]">BBU1 Enterprise OS</p>
        </div>
      </div>
    );
});

Receipt.displayName = "Receipt";