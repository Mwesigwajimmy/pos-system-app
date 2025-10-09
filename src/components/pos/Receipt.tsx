'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { Customer } from '@/types/dashboard';
import { format as formatDate } from 'date-fns';

// --- TYPE DEFINITIONS ---
export interface ReceiptData {
    saleInfo: { 
        id?: number; 
        created_at: Date | string; 
        payment_method: string; 
        total_amount: number; 
        amount_tendered: number; 
        change_due: number; 
        // --- ADDED FIELDS ---
        subtotal: number;
        discount: number;
        amount_due: number;
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
        quantity: number; 
        unit_price: number; 
        subtotal: number; 
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
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US').format(value);

    return (
      <div ref={ref} className="p-4 bg-white text-black text-xs font-mono w-[302px]">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold uppercase">{storeInfo?.name || 'Your Business'}</h1>
          <p>{storeInfo?.address}</p>
          <p>Phone: {storeInfo?.phone_number}</p>
        </div>
        
        {/* Info Section */}
        <div className="mb-4">
          <p><strong>Receipt #: {saleInfo.id?.toString().padStart(6, '0')}</strong></p>
          <p>Date: {formatDate(new Date(saleInfo.created_at), 'dd/MM/yyyy hh:mm a')}</p>
          <p>Customer: {customerInfo?.name || 'Walk-in Customer'}</p>
        </div>

        {/* Items Table */}
        <table className="w-full mb-4">
          <thead>
            <tr className="border-b border-dashed border-black">
              <th className="text-left pb-1">ITEM</th>
              <th className="text-right pb-1">QTY</th>
              <th className="text-right pb-1">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {saleItems?.map((item, index) => (
              <tr key={index} className="align-top">
                <td className="text-left py-1">
                    {item.product_name} ({item.variant_name})
                    <br/>
                    <span className="pl-1 text-[10px] italic">@{formatCurrency(item.unit_price)}</span>
                </td>
                <td className="text-right py-1">{item.quantity}</td>
                <td className="text-right py-1">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* --- UPDATED TOTALS SECTION --- */}
        <div className="space-y-1 border-t-2 border-dashed border-black pt-2">
            <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(saleInfo.subtotal)}</span>
            </div>
            {saleInfo.discount > 0 && (
                <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>- {formatCurrency(saleInfo.discount)}</span>
                </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-black mt-1 pt-1">
                <span>TOTAL:</span>
                <span>UGX {formatCurrency(saleInfo.total_amount)}</span>
            </div>
            <div className="flex justify-between mt-2">
                <span>{saleInfo.payment_method}:</span>
                <span>{formatCurrency(saleInfo.amount_tendered)}</span>
            </div>
            <div className="flex justify-between">
                <span>Change:</span>
                <span>{formatCurrency(saleInfo.change_due)}</span>
            </div>
            {saleInfo.amount_due > 0 && (
                <div className="flex justify-between font-bold text-red-600">
                    <span>AMOUNT DUE:</span>
                    <span>{formatCurrency(saleInfo.amount_due)}</span>
                </div>
            )}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-4 pt-2 border-t border-dashed border-black">
          <p>{storeInfo?.receipt_footer || 'Thank you for your business!'}</p>
        </div>
      </div>
    );
});

Receipt.displayName = "Receipt";