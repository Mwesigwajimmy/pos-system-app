import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import SourcingEventCalendar from '@/components/procurement/SourcingEventCalendar';

export default async function CalendarPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  // FIX: Using 'business_id'
  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();

  if (!profile?.business_id) return <div className="p-10 text-center">Unauthorized: No Business ID found.</div>;

  return (
    <div className="container mx-auto py-8 px-4">
       <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Sourcing Calendar</h1>
        <p className="text-muted-foreground">Upcoming tenders, contract renewals, and sourcing events.</p>
      </div>
      <SourcingEventCalendar tenantId={profile.business_id} />
    </div>
  );
}