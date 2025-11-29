"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Copy, Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import toast from "react-hot-toast"

export type SupplierRow = {
  id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  status?: string; // Optional: meaningful for filtering active/inactive
}

export const supplierColumns: ColumnDef<SupplierRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-slate-100"
        >
          Supplier Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
        <div className="font-medium text-slate-900 pl-4">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: "Contact Email",
    cell: ({ row }) => {
      const email = row.getValue("email") as string | null

      if (!email) return <span className="text-muted-foreground text-xs italic">N/A</span>

      return (
        <div className="flex items-center gap-2 group">
            <Mail className="h-3 w-3 text-slate-400" />
            <span className="text-sm">{email}</span>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                    navigator.clipboard.writeText(email)
                    toast.success("Email copied to clipboard")
                }}
            >
                <Copy className="h-3 w-3" />
            </Button>
        </div>
      )
    },
  },
  {
    accessorKey: "phone_number",
    header: "Phone",
    cell: ({ row }) => {
        const phone = row.getValue("phone_number") as string | null
        if (!phone) return <span className="text-muted-foreground text-xs italic">-</span>

        return (
            <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-slate-400" />
                <span className="text-sm font-mono">{phone}</span>
            </div>
        )
    },
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
        const address = row.getValue("address") as string | null
        if (!address) return <span className="text-muted-foreground text-xs italic">-</span>

        return (
            <div className="flex items-center gap-2 max-w-[250px]" title={address}>
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate text-sm text-slate-600">{address}</span>
            </div>
        )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const supplier = row.original

      return (
        <div className="text-right">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => {
                        navigator.clipboard.writeText(supplier.name)
                        toast.success("Supplier name copied")
                    }}
                >
                    <Copy className="mr-2 h-4 w-4" /> Copy Name
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => console.log("Edit", supplier.id)}>
                    <Pencil className="mr-2 h-4 w-4 text-blue-600" /> Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    onClick={() => {
                        // In a real app, trigger a delete dialog or mutation here
                        console.log("Delete", supplier.id)
                        toast.error("Delete functionality requires admin privileges")
                    }}
                >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Supplier
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]