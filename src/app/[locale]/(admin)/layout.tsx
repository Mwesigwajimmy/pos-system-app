import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Get the server-side session user
  const { data: getUserData } = await supabase.auth.getUser();
  const user = getUserData?.user ?? null;

  // Fetch profile row if available
  const { data: profile } = await supabase
    .from("profiles")
    .select("system_access_role")
    .eq("id", user?.id)
    .single()
    .catch(() => ({ data: null }));

  // Resolve role from profile first, then fall back to auth app metadata
  const roleFromProfile = profile?.system_access_role ?? null;
  const roleFromAuth = (user as any)?.app_metadata?.role ?? (user as any)?.user_metadata?.role ?? null;

  // Normalize and compare in lowercase (backend stores roles in lowercase)
  const normalizedRole = String(roleFromProfile ?? roleFromAuth ?? "").toLowerCase();

  const allowed = ["architect", "commander"];
  if (!normalizedRole || !allowed.includes(normalizedRole)) {
    // Not authorized or no valid role found -> redirect out
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <AdminSidebar role={normalizedRole} />
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        {children}
      </main>
    </div>
  );
}