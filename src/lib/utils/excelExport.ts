// src/lib/utils/excelExport.ts

import * as XLSX from 'xlsx';

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
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error("Failed to export data to Excel:", error);
    alert("An error occurred while trying to export the data.");
  }
}