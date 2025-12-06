import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers'; // 1. Import cookies helper
import { createClient } from '@/lib/supabase/server';
import { AgentMobilePortal } from '@/components/sacco/AgentMobilePortal';

export default async function AgentPortalPage() {
  // 2. Retrieve the cookies from the request headers
  const cookieStore = cookies();

  // 3. Pass the cookies to the Supabase client creator (Fixes the "Expected 1 arguments" error)
  const supabase = createClient(cookieStore);

  // 4. Authenticate User
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // 5. Security Guard Clause: Redirect if no valid session
  if (error || !user) {
    redirect('/login');
  }

  // 6. Resolve IDs from the authenticated session
  const agentId = user.id;
  
  // Try to get tenant_id from metadata, fall back safely if missing
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Configuration Error:</strong> Your account is not linked to a valid tenant Organization. 
        Please contact your system administrator.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col">
      <div className="p-6 border-b">
         <h1 className="text-3xl font-bold tracking-tight">Agent Mobile Portal</h1>
         <p className="text-sm text-gray-500">View of the mobile interface deployed to field agents</p>
      </div>
      <div className="flex-1 bg-gray-50 p-4 flex justify-center overflow-auto">
        {/* Pass the resolved real-world IDs to the client component */}
        <AgentMobilePortal tenantId={tenantId} agentId={agentId} />
      </div>
    </div>
  );
}