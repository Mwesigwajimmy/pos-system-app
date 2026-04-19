"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { UserCheck, Shield, Mail, Phone } from "lucide-react"

/**
 * SOVEREIGN EMPLOYEE TYPE
 * Represents a team member's identity within a specific business node.
 */
export type EmployeeRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string;
  is_active: boolean;
  status?: string; // Support for extended status strings like 'Pending'
}

/**
 * EMPLOYEE DATA TABLE COLUMNS
 * Fully upgraded to match the Sovereign OS Identity Protocol.
 */
export const columns: ColumnDef<EmployeeRow>[] = [
  {
    accessorKey: "full_name",
    header: "Authorized Personnel",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
          {row.original.full_name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900 tracking-tight leading-none">
            {row.original.full_name || "Unknown Identity"}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-1">
            UID: {row.original.id.substring(0, 8)}
          </span>
        </div>
      </div>
    )
  },
  {
    accessorKey: "email",
    header: "Communication",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Mail className="h-3 w-3 text-slate-300" />
          <span className="text-xs font-semibold lowercase tracking-tight">
            {row.original.email || "No Email Provided"}
          </span>
        </div>
        {row.original.phone_number && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Phone className="h-3 w-3 text-slate-300" />
            <span className="text-[10px] font-bold tracking-tighter">
              {row.original.phone_number}
            </span>
          </div>
        )}
      </div>
    )
  },
  {
    accessorKey: "role",
    header: "Sovereign Role",
    cell: ({ row }) => {
      const role = row.original.role || 'member';
      
      return (
        <Badge 
          variant="outline" 
          className={cn(
            "rounded-md border-slate-100 bg-white px-2 py-0.5",
            "text-[10px] font-black uppercase tracking-[0.15em]",
            role === 'owner' || role === 'architect' ? "text-blue-600 border-blue-100 bg-blue-50/30" : "text-slate-500"
          )}
        >
          {role.replace('_', ' ')}
        </Badge>
      );
    }
  },
  {
    accessorKey: "is_active",
    header: "Authentication Status",
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      
      return (
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-1.5 w-1.5 rounded-full",
            isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
          )} />
          <Badge 
            className={cn(
              "rounded-full px-2 py-0 text-[9px] font-black uppercase tracking-widest shadow-none border-none",
              isActive 
                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-50" 
                : "bg-slate-100 text-slate-400 hover:bg-slate-100"
            )}
          >
            {isActive ? "Authorized" : "Deactivated"}
          </Badge>
        </div>
      )
    }
  },
  {
    id: "actions",
    header: () => <div className="text-right">Protocols</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <button className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors group">
          <Shield className="h-4 w-4 text-slate-300 group-hover:text-blue-600" />
        </button>
      </div>
    )
  }
]