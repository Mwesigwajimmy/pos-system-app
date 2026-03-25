'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Customer } from '@/types/dashboard';
import { format as formatDate } from 'date-fns';
import { CheckCircle2, ShieldCheck, MapPin, Printer } from 'lucide-react';

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
        kernel_seal_id?: string;
        tax_category?: string;
        region_code?: string;
        currency_code?: string; 
        total_tax?: number;    
    };
    storeInfo: { 
        name: string; 
        address: string; 
        phone_number: string; 
        receipt_footer: string; 
        tax_number?: string;   
    };
    customerInfo: Customer | null;
    saleItems: { 
        product_name: string; 
        variant_name: string; 
        quantity: number; 
        unit_price: number; 
        subtotal: number; 
        tax_code?: string; 
        tax_amount?: number; 
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
                    throw new Error(err.error || 'Connection failed.');
                });
            }
            return response.json();
        });

        toast.promise(promise, {
            loading: `Sending to printer...`,
            success: 'Print successful',
            error: (err: any) => `Printer Error: ${err.message}`,
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

// --- PROFESSIONAL RECEIPT COMPONENT ---
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
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value || 0);

    const formatQty = (value: number) => {
        return value % 1 === 0 ? value.toString() : value.toFixed(2);
    };

    return (
      <div ref={ref} className="p-8 bg-white text-black text-[10px] font-mono w-[310px] border border-slate-200 shadow-sm mx-auto leading-relaxed overflow-hidden">
        {/* Store Info */}
        <div className="text-center mb-6 border-b border-black pb-4">
          <h1 className="text-lg font-bold uppercase tracking-tight mb-1">{storeInfo?.name || 'Business Name'}</h1>
          <p className="text-[9px] font-medium leading-tight mb-1">{storeInfo?.address || 'Store Address'}</p>
          <p className="text-[9px] font-medium">TEL: {storeInfo?.phone_number || 'No Contact'}</p>
          {storeInfo.tax_number && (
            <p className="text-[9px] font-bold mt-1">TIN: {storeInfo.tax_number}</p>
          )}
        </div>
        
        {/* Metadata */}
        <div className="mb-6 space-y-1.5 border-b border-dashed border-slate-300 pb-4">
          <div className="flex justify-between">
            <span className="font-bold">RECEIPT #:</span> 
            <span>{saleInfo.id?.toString().padStart(8, '0') || 'DRAFT'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">DATE:</span> 
            <span>{formatDate(new Date(saleInfo.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">CASHIER ID:</span> 
            <span className="uppercase">{saleInfo.kernel_seal_id?.substring(0, 8) || 'STAFF-01'}</span>
          </div>
          
          <div className="border-t border-slate-100 pt-1.5 mt-1">
            <div className="flex justify-between">
                <span className="font-bold">CUSTOMER:</span> 
                <span className="font-semibold uppercase">{customerInfo?.name || 'GUEST CUSTOMER'}</span>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left pb-1 font-bold">ITEM</th>
              <th className="text-center pb-1 font-bold">QTY</th>
              <th className="text-right pb-1 font-bold">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-slate-200">
            {saleItems?.map((item, index) => (
              <tr key={index}>
                <td className="text-left py-2 pr-2 align-top">
                    <div className="font-bold uppercase leading-tight mb-1">{item.product_name}</div>
                    <div className="text-[9px] text-slate-500">
                        {item.variant_name} @ {formatCurrency(item.unit_price)}
                    </div>
                </td>
                <td className="text-center py-2 align-top font-semibold">{formatQty(item.quantity)}</td>
                <td className="text-right py-2 align-top font-bold">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Totals Section */}
        <div className="space-y-1.5 border-t border-black pt-4">
            <div className="flex justify-between font-medium">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(saleInfo.subtotal)}</span>
            </div>
            
            {saleInfo.total_tax > 0 && (
                <div className="flex justify-between text-slate-600">
                    <span>TAX ({saleInfo.tax_category || 'VAT'}):</span>
                    <span>{formatCurrency(saleInfo.total_tax)}</span>
                </div>
            )}

            {saleInfo.discount > 0 && (
                <div className="flex justify-between font-medium text-slate-600">
                    <span>DISCOUNT:</span>
                    <span>- {formatCurrency(saleInfo.discount)}</span>
                </div>
            )}
            
            <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 mt-2 pt-2 bg-slate-50 px-2">
                <span>TOTAL DUE ({currency}):</span>
                <span>{formatCurrency(saleInfo.total_amount)}</span>
            </div>

            <div className="flex justify-between mt-4 text-slate-500 font-semibold uppercase">
                <span>{saleInfo.payment_method} PAID:</span>
                <span>{formatCurrency(saleInfo.amount_tendered)}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-semibold">
                <span>CHANGE:</span>
                <span>{formatCurrency(saleInfo.change_due)}</span>
            </div>

            {/* Credit Balance */}
            {saleInfo.amount_due > 0 && (
                <div className="p-3 mt-4 text-center bg-red-50 border border-red-200 rounded-lg">
                    <span className="block text-[9px] font-bold text-red-600 uppercase tracking-widest mb-1">Outstanding Balance</span>
                    <span className="text-base font-bold text-red-700">{formatCurrency(saleInfo.amount_due)}</span>
                </div>
            )}
        </div>
        
        {/* Bottom Verification Section */}
        <div className="mt-8 pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-col items-center justify-center opacity-80">
                <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[9px] font-bold uppercase tracking-tight text-slate-600">Verified Transaction</span>
                </div>
                <p className="text-[8px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    ID: {saleInfo.kernel_seal_id || `AUTH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`}
                </p>
            </div>
            
            <div className="text-center text-[9px] text-slate-600 font-semibold leading-relaxed px-4">
                {storeInfo?.receipt_footer || 'Thank you for your purchase!'}
            </div>
        </div>

        {/* System Barcode Marker */}
        <div className="mt-6 flex flex-col items-center">
            <div className="h-6 w-full bg-slate-100 flex items-center justify-center text-slate-300 text-[6px] tracking-[1em] overflow-hidden">
                |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
            </div>
            <span className="text-[7px] text-slate-300 font-semibold uppercase mt-1">Processed by BBU1 System</span>
        </div>
      </div>
    );
});

Receipt.displayName = "Receipt";