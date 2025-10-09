"use client"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type CustomerRow = {
  id: number;
  name: string;
  phone_number: string | null;
  email: string | null;
  loyalty_points: number;
}

export const columns: ColumnDef<CustomerRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "phone_number", header: "Phone Number" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "loyalty_points", header: "Loyalty Points" },
  {
    id: "actions",
    cell: ({ row }) => {
      // We will add Edit/Delete functionality here later
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit Customer</DropdownMenuItem>
            <DropdownMenuItem>View Purchase History</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]