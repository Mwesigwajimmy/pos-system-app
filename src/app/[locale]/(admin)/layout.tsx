import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { cn } from "@/lib/utils";

// 1. Strict Role Definition - Matches your Database Check Constraints
type SovereignRole = 'architect' | 'commander';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * ARCHITECT-LEVEL SECURITY GATE
 * This layout acts as the authoritative boundary for the /admin segment.
 * It performs dual-layer verification: Auth JWT + Real-time Database Profile.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Authoritative server-side auth initialization
  const supabase = createClient(cookies());

  // 2. Authoritative User Fetch
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?reason=unauthenticated");
  }

  // 3. Authority Check: Fetching Profile from DB
  const { data: profile, error: dbError } = await supabase
    .from("profiles")
    .select("system_access_role, organization_id")
    .eq("id", user.id)
    .single();

  if (dbError || !profile) {
    console.error(`[SECURITY_VIOLATION]: Unauthorized access attempt by ${user.email}`);
    redirect("/dashboard");
  }

  // 4. Role Normalization & Validation
  const role = profile.system_access_role?.toLowerCase() as SovereignRole;
  const ALLOWED_ROLES: SovereignRole[] = ["architect", "commander"];

  if (!ALLOWED_ROLES.includes(role)) {
    return notFound();
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Injection with authoritative role */}
      <AdminSidebar role={role} />

      {/* Main Execution View - Professional Light Theme */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden bg-[#f8fafc]">
        
        {/* Subtle Professional Top Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/10 z-50" />

        {/* Scrollable Content Buffer */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
          {children}
        </div>

        {/* Global System Status Bar - Clean Professional Style */}
        <footer className="h-10 border-t border-slate-200 bg-white px-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
           <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
               <span className="text-emerald-600">Uplink: Authoritative</span>
             </div>
             <span className="border-l border-slate-200 pl-6">Region: Global_Mesh</span>
           </div>
           <div className="flex items-center gap-6">
             <span className="hidden md:inline">Identity: {user.email}</span>
             <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100 font-black">
               Clearance: {role}
             </div>
           </div>
        </footer>
      </main>
    </div>
  );
}