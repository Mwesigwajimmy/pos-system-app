import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// FIX: Default Import (No curly braces)
import NotificationManager from '@/components/sacco/NotificationManager';

export default async function NotificationsPage() {
  // 1. Server-Side Authentication
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 2. Tenant Context
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Error:</strong> Tenant configuration missing. Please contact support.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">System Notifications</h1>
      
      {/* 
         FIX: Passing tenantId explicitly. 
         Removed userId prop because your component definition 
         function NotificationManager({ tenantId }) only expects tenantId.
      */}
      <NotificationManager tenantId={tenantId} />
    </div>
  );
}