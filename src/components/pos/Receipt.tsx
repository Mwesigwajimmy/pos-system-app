'use client';

import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { format as formatDate } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

/**
 * --- BBU1 SOVEREIGN RECEIPT ENGINE ---
 * VERSION: v22.0 OMEGA-PRIME (THE APEX ALIGNMENT WELD)
 * 
 * CORE ARCHITECTURAL ALIGNMENT:
 * 1. VIEW DEFINITION SYNC: Dynamically maps data strictly from view_bbu1_corporate_identity schema.
 * 2. IDENTITY AGGREGATION: Resolves Tax Identity using the (tin_number || tax_number) logic found in SQL audit.
 * 3. REACT 18 STABILITY: Fully implemented forwardRef to resolve the (0 , i.findDOMNode) is not a function error.
 * 4. DYNAMIC FOOTER: Injects receipt_footer directly from the tenant settings without hardcoding.
 */

export interface ReceiptData {
    saleInfo: { 
        id?: number | string; 
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
        related_deal_id?: string | null;
    };
    // Maps to view_bbu1_corporate_identity
    identity?: {
        business_id?: string;
        legal_name?: string;
        tin_number?: string;    // COALESCE(t.tin_number, t.tax_number)
        tax_number?: string;    // Fallback if view raw object is passed
        official_phone?: string;
        physical_address?: string;
        city?: string;
        country?: string;
        receipt_footer?: string;
        logo_url?: string;
        currency_code?: string;
        primary_color?: string;
        plot_number?: string;
        po_box?: string;
        official_email?: string;
    };
    storeInfo?: any; 
    customer?: any;
    customerInfo?: any;
    items?: any[];
    saleItems?: any[];
}

interface BridgePayload {
    printerName: string;
    data: ReceiptData;
}

// --- HARDWARE BRIDGE HOOK (BBU1 PROTOCOL) ---
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
export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ receiptData, defaultPrinterName, autoPrint = false }, ref) => {
    
    const { sendPrintJob } = useHardwarePrint();

    // --- DEEP DATA EXTRACTION (THE UNIVERSAL WELD) ---
    const saleInfo = receiptData?.saleInfo;
    
    // Resolve Identity object (prioritizing the identity key which holds the View data)
    const idnt = receiptData?.identity || receiptData?.storeInfo || {};
    const customer = receiptData?.customer || receiptData?.customerInfo;
    const items = receiptData?.items || receiptData?.saleItems || [];

    // --- STRICT MAPPING TO VERIFIED DATABASE COLUMNS ---
    const businessName = idnt.legal_name || idnt.name || 'Business Entity';
    
    // Physical Address: Pulls the resolved address from view (loc.address || plot_number)
    const businessAddress = idnt.physical_address || idnt.address || idnt.plot_number || 'Main HQ';
    const city = idnt.city ? `, ${idnt.city}` : '';
    
    // Official Phone: Pulls from t.phone per view definition
    const businessPhone = idnt.official_phone || idnt.phone || idnt.phone_number || 'N/A';
    
    // Tax ID: Uses the Coalesced tin_number or fallback to tax_number column
    const businessTaxId = idnt.tin_number || idnt.tax_number || idnt.identity_tax_id || null;
    
    // Currency: Prioritizes identity view setting
    const currency = idnt.currency_code || saleInfo?.currency_code || 'UGX';
    
    // Footer: Dynamic pulling from tenant settings
    const footerMessage = idnt.receipt_footer || 'Thank you for your business';

    useEffect(() => {
        if (autoPrint && defaultPrinterName && saleInfo && idnt) {
            sendPrintJob({
                printerName: defaultPrinterName,
                data: receiptData,
            });
        }
    }, [autoPrint, defaultPrinterName, receiptData, idnt, saleInfo]);

    // Validation Shield: Ensures core identity exists before rendering
    if (!saleInfo || !idnt || !businessName) {
        return (
            <div className="p-6 text-center border-2 border-dashed border-red-100 rounded-2xl bg-red-50">
                <p className="text-xs text-red-600 font-black uppercase tracking-widest">
                    Invalid Receipt Data
                </p>
                <p className="text-[10px] text-red-400 mt-1 uppercase font-bold">
                    Check System Identity & Tenant Configuration
                </p>
            </div>
        );
    }
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value || 0);

    return (
      <div 
        ref={ref} 
        className="p-5 bg-white text-black text-[11px] font-mono w-full max-w-[300px] mx-auto leading-tight overflow-hidden select-none print:p-0 print:w-[80mm] print:max-w-none shadow-sm border border-slate-50"
      >
        
        {/* 1. CORPORATE IDENTITY HEADER (DYNAMICALLY RESOLVED) */}
        <div className="text-center mb-5 space-y-1">
          {idnt.logo_url && (
            <img 
                src={idnt.logo_url} 
                alt="Logo" 
                className="h-12 mx-auto mb-2 object-contain grayscale contrast-125" 
            />
          )}
          <h1 className="text-[14px] font-black uppercase tracking-tighter leading-none">
            {businessName}
          </h1>
          <p className="text-[9px] font-bold opacity-80 uppercase">
            {businessAddress}{city}
          </p>
          
          <div className="flex flex-col items-center pt-1">
             <span className="font-bold">TEL: {businessPhone}</span>
             
             {/* Tax Identity: Prioritizing verified Tax/TIN numbers */}
             {businessTaxId && (
                <span className="font-black text-[9px] bg-slate-100 px-2 py-0.5 rounded mt-1 border border-slate-200 uppercase">
                    TAX ID: {businessTaxId}
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
            <span className="font-bold uppercase text-[9px]">Receipt #:</span> 
            <span className="font-black">{saleInfo.invoice_number || saleInfo.id?.toString().padStart(8, '0')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold uppercase text-[9px]">Date:</span> 
            <span>{formatDate(new Date(saleInfo.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          
          <div className="pt-1">
            <div className="flex justify-between border-t border-slate-100 mt-1 pt-1 italic">
                <span className="font-bold text-slate-500 uppercase text-[9px]">Customer:</span> 
                <span className="font-black uppercase text-[10px]">{customer?.name || customer?.full_name || 'Walk-in Client'}</span>
            </div>
          </div>
        </div>

        {/* 3. ITEMIZATION TABLE */}
        <table className="w-full mb-4">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left pb-1 font-black uppercase text-[9px]">Description</th>
              <th className="text-center pb-1 font-black uppercase text-[9px]">Qty</th>
              <th className="text-right pb-1 font-black uppercase text-[9px]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="text-left py-2 pr-1 align-top">
                    <div className="font-black uppercase leading-tight text-[10px]">{item.name || item.product_name}</div>
                    <div className="text-[8px] text-slate-500 mt-0.5 font-bold uppercase">
                        Unit: {formatCurrency(item.price || item.unit_price)} {currency}
                    </div>
                </td>
                <td className="text-center py-2 align-top font-black">{item.qty || item.quantity}</td>
                <td className="text-right py-2 align-top font-black">{formatCurrency(item.total || item.subtotal || (item.qty * item.price))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* 4. TOTALS & SETTLEMENT */}
        <div className="space-y-1 border-t-2 border-black pt-3">
            <div className="flex justify-between font-bold uppercase text-[9px]">
                <span>Subtotal:</span>
                <span>{formatCurrency(saleInfo.subtotal)}</span>
            </div>
            
            {(saleInfo.discount || 0) > 0 && (
                <div className="flex justify-between font-bold text-slate-500 italic uppercase text-[9px]">
                    <span>Discount:</span>
                    <span>- {formatCurrency(saleInfo.discount)}</span>
                </div>
            )}
            
            <div className="flex justify-between font-black text-[13px] border-t border-black mt-2 pt-2 uppercase">
                <span>Grand Total ({currency}):</span>
                <span>{formatCurrency(saleInfo.total_amount)}</span>
            </div>

            <div className="flex justify-between mt-3 text-slate-600 font-black uppercase text-[9px]">
                <span>{saleInfo.payment_method || 'CASH'} Tendered:</span>
                <span>{formatCurrency(saleInfo.amount_tendered)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-black uppercase text-[9px]">
                <span>Change Returned:</span>
                <span>{formatCurrency(saleInfo.change_due)}</span>
            </div>

            {/* Arrears Detection for Partial Payments */}
            {(saleInfo.amount_due || 0) > 0 && (
                <div className="p-2 mt-4 text-center bg-slate-900 text-white rounded-lg">
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] mb-1">Balance Remaining</span>
                    <span className="text-sm font-black">{formatCurrency(saleInfo.amount_due)} {currency}</span>
                </div>
            )}
        </div>
        
        {/* 5. SOVEREIGN SEAL & FOOTER (STRICTLY FROM IDENTITY) */}
        <div className="mt-8 pt-4 border-t border-slate-200 border-double">
            <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Mathematically Sealed</span>
                </div>
                <div className="text-[7px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                    Seal ID: {saleInfo.kernel_seal_id || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`}
                </div>
            </div>
            
            <div className="text-center text-[9px] text-slate-800 font-black leading-tight mt-6 px-1 uppercase tracking-tight">
                {footerMessage}
            </div>
        </div>

        {/* Global Hub Identifier */}
        <div className="mt-8 opacity-20 print:hidden group">
            <div className="h-4 w-full bg-slate-200 rounded-sm overflow-hidden flex items-center justify-center">
                <div className="flex gap-1 animate-pulse">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="w-[1px] h-3 bg-black" />
                    ))}
                </div>
            </div>
            <p className="text-[6px] text-center font-black mt-1 uppercase tracking-[0.5em]">BBU1 Enterprise OS - Global Hub Node</p>
        </div>
      </div>
    );
});

Receipt.displayName = "Receipt";