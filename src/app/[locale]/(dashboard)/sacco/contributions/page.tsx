import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { MemberContributionsTable } from '@/components/sacco/MemberContributionsTable';

export default async function ContributionsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return <div>Error: Tenant ID not found. Contact administrator.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Member Contributions</h1>
      {/* Component needs tenantId to query the correct 'collections' table rows */}
      <MemberContributionsTable tenantId={tenantId} />
    </div>
  );
}