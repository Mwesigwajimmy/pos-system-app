"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button";
import { MoreHorizontal, History, User, Edit } from "lucide-react"; // Added icons for professional look
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useParams } from "next/navigation";

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
      const customer = row.original;
      
      // DEEP WELD: Get the current locale from the URL params to ensure 
      // the navigation stays within the correct country context (/en, /fr, etc.)
      const params = useParams();
      const locale = params?.locale || 'en';

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                Management
            </DropdownMenuLabel>
            
            <DropdownMenuItem className="cursor-pointer py-2">
                <Edit className="mr-2 h-4 w-4 text-slate-400" /> Edit Customer
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* 
                DEEP WELD FIX: 
                Wrapped the menu item in a Link that dynamically points to the 
                folder structure [customerId] we saw in your dashboard. 
                This solves the 404 by providing the full authenticated path.
            */}
            <Link href={`/${locale}/customers/${customer.id}`} className="w-full">
                <DropdownMenuItem className="cursor-pointer py-2 text-blue-600 focus:text-blue-600 font-bold">
                    <History className="mr-2 h-4 w-4" /> View Purchase History
                </DropdownMenuItem>
            </Link>

          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]