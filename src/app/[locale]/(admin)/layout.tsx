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
  const supabase = createClient();

  // 2. Authoritative User Fetch
  // getUser() is a server-side network call to Supabase Auth to verify the JWT 
  // It is more secure than getSession() as it re-validates against the server.
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?reason=unauthenticated");
  }

  // 3. Authority Check: Fetching Profile from DB
  // We don't trust the JWT metadata for high-clearance actions.
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
    // Security Best Practice: Use notFound() to obfuscate admin routes 
    // from authenticated but unauthorized users.
    return notFound();
  }

  return (
    <div className="flex h-screen bg-[#020205] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar Injection with authoritative role */}
      <AdminSidebar role={role} />

      {/* Main Execution View */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        
        {/* Sovereign OS Aesthetic Overlays */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-600/50 to-transparent z-50" />
        <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-blue-600/[0.02] to-transparent pointer-events-none" />

        {/* Scrollable Content Buffer */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10 p-6 lg:p-10">
          {children}
        </div>

        {/* Global System Status Bar (Enterprise Detail) */}
        <footer className="h-8 border-t border-white/5 bg-black/40 px-6 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-emerald-500/80">Uplink: Authoritative</span>
             </div>
             <span>Region: Global_Mesh</span>
           </div>
           <div className="flex items-center gap-4">
             <span>Identity: {user.email}</span>
             <span className="text-blue-500/50">Clearance: {role}</span>
           </div>
        </footer>
      </main>
    </div>
  );
}