import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SavingsProductsManager from '@/components/sacco/SavingsProductsManager';

export const metadata = {
  title: "Manage Savings Products",
  description: "Create and manage the different types of savings accounts your SACCO offers.",
};

export default async function SavingsProductsPage() {
  // 1. Initialize Supabase on Server
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 2. Authenticate User
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 3. Get Tenant ID safely
  // This ensures we never rely on client-side params for security
  const tenantId = user.user_metadata?.tenant_id || user.id;

  // 4. Pass tenantId to the Client Component
  return (
    <div className="container mx-auto py-6">
        <SavingsProductsManager tenantId={tenantId} />
    </div>
  );
}