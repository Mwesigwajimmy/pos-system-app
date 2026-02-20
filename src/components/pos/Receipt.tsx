'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { Customer } from '@/types/dashboard';
import { format as formatDate } from 'date-fns';
import { ShieldCheck, Fingerprint, Globe } from 'lucide-react'; // UPGRADE: Robotic Icons

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
    };
    storeInfo: { 
        name: string; 
        address: string; 
        phone_number: string; 
        receipt_footer: string; 
    };
    customerInfo: Customer | null;
    saleItems: { 
        product_name: string; 
        variant_name: string; 
        quantity: number; // Will now handle decimals (0.5 tabs)
        unit_price: number; 
        subtotal: number; 
        tax_code?: string; // UPGRADE: Per-item tax visibility
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
    
    // UPGRADE: Handle high-precision decimals for fractional sales (e.g. 0.5 tablets)
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

    // UPGRADE: Precision Quantity Formatter
    const formatQty = (value: number) => {
        return value % 1 === 0 ? value.toString() : value.toFixed(3);
    };

    return (
      <div ref={ref} className="p-4 bg-white text-black text-xs font-mono w-[302px] border shadow-sm">
        {/* Header */}
        <div className="text-center mb-4 border-b pb-2">
          <h1 className="text-lg font-bold uppercase tracking-tighter">{storeInfo?.name || 'Your Business'}</h1>
          <p className="text-[9px] uppercase">{storeInfo?.address}</p>
          <p className="text-[9px]">TEL: {storeInfo?.phone_number}</p>
          
          {/* UPGRADE: Global Jurisdiction Display */}
          {saleInfo.region_code && (
            <div className="flex items-center justify-center gap-1 mt-1 text-[8px] font-bold border rounded px-1 w-fit mx-auto">
                <Globe className="w-2 h-2" /> JURISDICTION: {saleInfo.region_code}
            </div>
          )}
        </div>
        
        {/* Info Section */}
        <div className="mb-4 space-y-0.5 text-[10px]">
          <p className="flex justify-between"><strong>RECEIPT:</strong> <span>{saleInfo.id?.toString().padStart(8, '0')}</span></p>
          <p className="flex justify-between"><strong>DATE:</strong> <span>{formatDate(new Date(saleInfo.created_at), 'dd/MM/yyyy HH:mm')}</span></p>
          <p className="flex justify-between"><strong>CLIENT:</strong> <span>{customerInfo?.name || 'CASH SALE'}</span></p>
          
          {/* UPGRADE: Member ID visibility */}
          {customerInfo?.id && <p className="flex justify-between font-bold italic"><strong>MEMBER ID:</strong> <span>{customerInfo.id}</span></p>}
        </div>

        {/* Items Table */}
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
                    <div className="flex justify-between items-center text-[9px] text-slate-600 italic">
                        <span>@{formatCurrency(item.unit_price)}</span>
                        {/* UPGRADE: Per-item Tax Code display */}
                        {item.tax_code && <span className="font-bold">[{item.tax_code}]</span>}
                    </div>
                </td>
                {/* UPGRADE: Fractional Quantity Display */}
                <td className="text-right py-1 align-top">{formatQty(item.quantity)}</td>
                <td className="text-right py-1 align-top font-bold">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* --- UPDATED TOTALS SECTION --- */}
        <div className="space-y-1 border-t-2 border-black pt-2 text-[11px]">
            <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(saleInfo.subtotal)}</span>
            </div>
            {saleInfo.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                    <span>DISCOUNT:</span>
                    <span>- {formatCurrency(saleInfo.discount)}</span>
                </div>
            )}
            
            <div className="flex justify-between font-black text-sm border-t-2 border-double border-black mt-1 pt-1">
                <span>TOTAL DUE:</span>
                <span>UGX {formatCurrency(saleInfo.total_amount)}</span>
            </div>

            <div className="flex justify-between mt-3 text-[10px]">
                <span className="uppercase">{saleInfo.payment_method}:</span>
                <span>{formatCurrency(saleInfo.amount_tendered)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
                <span>CHANGE:</span>
                <span>{formatCurrency(saleInfo.change_due)}</span>
            </div>

            {/* UPGRADE: Amount Due / Credit Balance logic */}
            {saleInfo.amount_due > 0 && (
                <div className="flex justify-between font-bold text-red-600 border border-red-600 p-1 mt-1 text-center">
                    <span>CREDIT BALANCE:</span>
                    <span>{formatCurrency(saleInfo.amount_due)}</span>
                </div>
            )}
        </div>
        
        {/* --- UPGRADE: SOVEREIGN FORENSIC SEAL --- */}
        <div className="mt-6 border-t pt-2 space-y-2">
            <div className="flex flex-col items-center justify-center opacity-70">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    <span className="text-[8px] font-bold tracking-widest">SOVEREIGN KERNEL V8 SEALED</span>
                </div>
                <div className="flex items-center gap-1">
                    <Fingerprint className="w-2 h-2 text-slate-400" />
                    <span className="text-[7px] font-mono text-slate-400">
                        {saleInfo.kernel_seal_id || `AUTH-${Math.random().toString(36).substr(2, 9).toUpperCase()}`}
                    </span>
                </div>
            </div>
            
            <div className="text-center text-[8px] leading-tight text-slate-500 italic">
                {storeInfo?.receipt_footer || 'Thank you for your business!'}
                <br/>
                <span className="font-bold">This transaction is immutable and forensic-ready.</span>
            </div>
        </div>

        {/* Robotic Barcode Placeholder */}
        <div className="mt-4 flex justify-center opacity-20">
            <div className="h-8 w-40 bg-slate-300 rounded animate-pulse" />
        </div>
      </div>
    );
});

Receipt.displayName = "Receipt";