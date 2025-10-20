// src/components/purchases/supplierColumns.ts
"use client"
import { ColumnDef } from "@tanstack/react-table"

export type SupplierRow = {
  id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
}

export const supplierColumns: ColumnDef<SupplierRow>[] = [
  { accessorKey: "name", header: "Supplier Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "phone_number", header: "Phone" },
  { accessorKey: "address", header: "Address" },
]