// src/lib/utils.ts

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react" // Import React to use its types for refs
import * as XLSX from 'xlsx'; // Import the excel library

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Merges multiple refs into a single ref callback.
 * This is useful when you need to assign a ref from a parent component
 * and also maintain an internal ref, for instance, with react-hook-form.
 * @param refs The refs to merge.
 * @returns A single ref callback function.
 */
export function mergeRefs<T = any>(
  ...refs: Array<React.MutableRefObject<T | null> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return (val) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(val);
      } else if (ref != null) {
        // Correctly assign the value (which can be T or null) to the ref's current property.
        (ref as React.MutableRefObject<T | null>).current = val;
      }
    });
  };
}

// === ADDED EXPORT FUNCTIONALITY ===
/**
 * Exports an array of objects to an Excel file.
 * @param data The array of data to export.
 * @param fileName The name of the file to be downloaded (without extension).
 */
export function exportToExcel<T>(data: T[], fileName: string): void {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    // Triggers the download of the file
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error("Failed to export data to Excel:", error);
    alert("An error occurred while trying to export the data.");
  }
}

// --- NEW REVOLUTIONARY CURRENCY FORMATTER ---
// This function makes your UI globally compatible.
export function formatCurrency(
  amount: number | string,
  currencyCode: string,
  locale?: string
) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // The Intl.NumberFormat object is a powerful native browser API
  // for language-sensitive number formatting.
  return new Intl.NumberFormat(locale || 'en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}