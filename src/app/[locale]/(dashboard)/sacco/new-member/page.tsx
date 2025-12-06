import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// FIX: Default Import (No curly braces)
import NewMemberModal from '@/components/sacco/NewMemberModal'; 

export default async function RegisterMemberPage() {
  // 1. Server-Side Authentication
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 2. Tenant Context Resolution
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Error:</strong> Organization context missing. Please contact support.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card className="shadow-md">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>Member Registration</CardTitle>
          <CardDescription>
            Create a new SACCO membership account. This will generate a unique Member Number and default savings wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
           {/* 
              FIX: Passed required props.
              isOpen={true} and isPageMode={true} allows it to render inline on the page 
              instead of as a popup.
           */}
           <NewMemberModal isOpen={true} isPageMode={true} tenantId={tenantId} />
        </CardContent>
      </Card>
    </div>
  );
}