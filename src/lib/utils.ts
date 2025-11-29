// src/lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";
import * as XLSX from 'xlsx';

// --- UI Class Utility ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Ref Merging Utility ---
/**
 * Merges multiple refs into a single ref callback.
 * Useful for integrating React Hook Form with UI libraries.
 */
export function mergeRefs<T = any>(
  ...refs: Array<React.MutableRefObject<T | null> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return (val) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(val);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = val;
      }
    });
  };
}

// --- Excel Export Utility ---
/**
 * Exports an array of JSON objects to an Excel file.
 */
export function exportToExcel<T>(data: T[], fileName: string): void {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error("Failed to export data to Excel:", error);
    // In a real app, use a toast notification here instead of alert
    alert("An error occurred while trying to export the data.");
  }
}

// --- Number Formatting Utility ---
/**
 * Formats a number to a specified number of decimal places.
 */
export function formatNumber(
  amount: number | string,
  decimalPlaces: number = 0,
  locale: string = 'en-US'
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '0';

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(numericAmount);
}

// --- File Size Utility ---
export function bytesToSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- Date Formatting Utility ---
export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', 
      month: 'short', 
      year: 'numeric'
    }).format(new Date(dateString));
  } catch (e) {
    return dateString; // Fallback if invalid date
  }
};

// --- Currency Formatting Utility ---
/**
 * Enterprise-grade currency formatter.
 * Automatically handles decimals based on currency code (e.g. USD=2, UGX=0).
 * Defaults to UGX if not specified.
 */
export function formatCurrency(
  amount: number | string,
  currencyCode: string = 'UGX', 
  locale: string = 'en-US'
) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Graceful fallback for invalid numbers
  if (typeof numericAmount !== 'number' || isNaN(numericAmount)) {
    return '0.00';
  }

  // Intl.NumberFormat automatically handles standard decimal places for currencies.
  // We allow it to decide (e.g. USD gets 2 decimals, UGX gets 0) unless overridden.
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    // We intentionally do NOT hardcode minimumFractionDigits here 
    // to allow Intl to follow standard banking rules for each currency.
  }).format(numericAmount);
}