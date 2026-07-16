import { jsPDF } from 'jspdf';
import type { ReceiptData } from '@/components/pos/Receipt';
import { normalizeReceiptData } from '@/components/pos/Receipt';

const PAGE_WIDTH = 80; // mm — narrow thermal-receipt-style page
const MARGIN = 5;
const RIGHT = PAGE_WIDTH - MARGIN;
const CENTER = PAGE_WIDTH / 2;

/**
 * Builds a receipt PDF directly from the sale data (no DOM screenshot
 * involved). Downloading the on-screen <Receipt> via html2canvas was the
 * original approach, but html2canvas can't parse the oklch() color
 * functions Tailwind v4's palette uses — it hangs indefinitely instead of
 * producing an image. Drawing straight into the PDF sidesteps that
 * entirely, since jsPDF never reads computed CSS.
 */
export function buildReceiptPdf(receiptData: ReceiptData): jsPDF {
  const { saleInfo, store, customer, lines, currency } = normalizeReceiptData(receiptData);
  const storeName = store.name || store.legal_name || 'Store';
  const address = store.address || store.physical_address;
  const phone = store.phone_number || store.official_phone;

  // Rough height estimate so the page isn't needlessly long or clipped.
  const estimatedHeight = 55 + lines.length * 9 + (store.receipt_footer ? 14 : 4);
  const doc = new jsPDF({ unit: 'mm', format: [PAGE_WIDTH, Math.max(estimatedHeight, 70)] });
  let y = 10;

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(storeName, CENTER, y, { align: 'center' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  if (address) { doc.text(address, CENTER, y, { align: 'center' }); y += 4; }
  if (phone) { doc.text(phone, CENTER, y, { align: 'center' }); y += 4; }
  if (store.tin_number) { doc.text(`TIN: ${store.tin_number}`, CENTER, y, { align: 'center' }); y += 4; }

  y += 1;
  doc.line(MARGIN, y, RIGHT, y);
  y += 5;

  doc.text('Receipt #', MARGIN, y);
  doc.text(String(saleInfo.kernel_seal_id || saleInfo.id), RIGHT, y, { align: 'right' });
  y += 4;
  doc.text('Date', MARGIN, y);
  doc.text(new Date(saleInfo.created_at).toLocaleString(), RIGHT, y, { align: 'right' });
  y += 4;
  doc.text('Customer', MARGIN, y);
  doc.text(customer?.name || 'Walk-in', RIGHT, y, { align: 'right' });
  y += 4;

  y += 1;
  doc.line(MARGIN, y, RIGHT, y);
  y += 5;

  lines.forEach((line) => {
    const name = line.product_name || line.name || '';
    const variant = line.variant_name;
    const qty = line.quantity ?? line.qty ?? 0;
    const unitPrice = line.unit_price ?? line.price ?? 0;
    const lineTotal = line.subtotal ?? line.total ?? qty * unitPrice;

    doc.setFont('courier', 'bold');
    doc.text(`${name}${variant ? ` (${variant})` : ''}`, MARGIN, y, { maxWidth: 50 });
    doc.text(lineTotal.toLocaleString(), RIGHT, y, { align: 'right' });
    y += 4;
    doc.setFont('courier', 'normal');
    doc.text(`${qty} x ${unitPrice.toLocaleString()}`, MARGIN, y);
    y += 5;
  });

  y += 1;
  doc.line(MARGIN, y, RIGHT, y);
  y += 5;

  doc.text('Subtotal', MARGIN, y);
  doc.text(`${currency} ${saleInfo.subtotal.toLocaleString()}`, RIGHT, y, { align: 'right' });
  y += 4;

  if (saleInfo.discount > 0) {
    doc.text('Discount', MARGIN, y);
    doc.text(`-${currency} ${saleInfo.discount.toLocaleString()}`, RIGHT, y, { align: 'right' });
    y += 4;
  }
  if (saleInfo.total_tax) {
    doc.text('Tax', MARGIN, y);
    doc.text(`${currency} ${saleInfo.total_tax.toLocaleString()}`, RIGHT, y, { align: 'right' });
    y += 4;
  }

  y += 1;
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('Total', MARGIN, y);
  doc.text(`${currency} ${saleInfo.total_amount.toLocaleString()}`, RIGHT, y, { align: 'right' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(`Paid (${saleInfo.payment_method})`, MARGIN, y);
  doc.text(`${currency} ${saleInfo.amount_tendered.toLocaleString()}`, RIGHT, y, { align: 'right' });
  y += 4;

  if (saleInfo.change_due > 0) {
    doc.text('Change', MARGIN, y);
    doc.text(`${currency} ${saleInfo.change_due.toLocaleString()}`, RIGHT, y, { align: 'right' });
    y += 4;
  }
  if (saleInfo.amount_due > 0) {
    doc.setFont('courier', 'bold');
    doc.text('Balance Due', MARGIN, y);
    doc.text(`${currency} ${saleInfo.amount_due.toLocaleString()}`, RIGHT, y, { align: 'right' });
    y += 4;
  }

  if (store.receipt_footer) {
    y += 2;
    doc.line(MARGIN, y, RIGHT, y);
    y += 5;
    doc.setFontSize(7.5);
    doc.text(store.receipt_footer, CENTER, y, { align: 'center', maxWidth: PAGE_WIDTH - MARGIN * 2 });
  }

  return doc;
}

export function downloadReceiptPdf(receiptData: ReceiptData) {
  buildReceiptPdf(receiptData).save(`Receipt-${receiptData.saleInfo.id}.pdf`);
}
