import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// FIX: Default Import (No curly braces)
import OpenAPIGatewayPanel from '@/components/sacco/OpenAPIGatewayPanel';

export default async function ApiGatewayPage() {
  // 1. Server-Side Authentication (Route Protection)
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 2. Tenant Context Check
  // Even though the component fetches its own data, we check valid membership here
  // to prevent unauthorized rendering of the page structure.
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Access Denied:</strong> Your account is not linked to a valid Organization.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">OpenAPI Gateway Configuration</h1>
      {/* 
         FIX: Removed props because your component definition 
         function OpenAPIGatewayPanel() { ... } 
         does not accept any props.
      */}
      <OpenAPIGatewayPanel />
    </div>
  );
}