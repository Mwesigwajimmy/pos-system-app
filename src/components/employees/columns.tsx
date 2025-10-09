"use client"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

export type EmployeeRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string;
  is_active: boolean;
}

export const columns: ColumnDef<EmployeeRow>[] = [
  { accessorKey: "full_name", header: "Full Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "phone_number", header: "Phone" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.role}</Badge>
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? "default" : "destructive"}>
        {row.original.is_active ? "Active" : "Inactive"}
      </Badge>
    )
  },
  // We will add an actions column here later for editing/deactivating users
]