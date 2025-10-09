import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { SyncProvider } from "@/components/core/SyncProvider"; // 1. FIXED: Import with curly braces {}

// 2. FIXED: This line tells Next.js to use the standard server runtime, which solves the Supabase error.
export const runtime = 'nodejs'; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 3. The SyncProvider now correctly wraps your dashboard content
    <SyncProvider>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SyncProvider>
  );
}