import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // SECURE GUARD: Only allow ARCHITECT or COMMANDER roles
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("system_access_role")
    .eq("id", user?.id)
    .single();

  if (!profile || !['ARCHITECT', 'COMMANDER'].includes(profile.system_access_role)) {
    redirect("/dashboard"); // Unauthorized users are booted to standard dashboard
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <AdminSidebar role={profile.system_access_role} />
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* The "God-Mode" Background Aura */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        {children}
      </main>
    </div>
  );
}