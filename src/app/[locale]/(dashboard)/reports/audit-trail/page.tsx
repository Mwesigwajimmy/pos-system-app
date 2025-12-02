import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
// FIX 1: Import the type 'AuditLog' from the component to ensure they match exactly
import AuditTrailReportClient, { AuditLog } from '@/components/reports/AuditTrailReport';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'System Audit Logs',
  description: 'Immutable record of system activities, data changes, and user access.',
};

// FIX 2: Removed local 'interface AuditLog' definition to avoid conflicts.

export default async function AuditTrailPage({ searchParams }: { searchParams: { q?: string, page?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const query = searchParams.q || '';
  const page = parseInt(searchParams.page || '1');
  const limit = 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  // 1. Fetch Audit Logs with Pagination
  let dbQuery = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  // Apply server-side filtering
  if (query) {
    dbQuery = dbQuery.or(`user_email.ilike.%${query}%,table_name.ilike.%${query}%,action.ilike.%${query}%`);
  }

  const { data: rawLogs, count, error } = await dbQuery;

  if (error) {
    return <div className="p-4 text-red-500">Error loading audit logs: {error.message}</div>;
  }

  // 2. Transform Logic: Diffing JSONB
  const logs: AuditLog[] = (rawLogs || []).map((log: any) => {
    let summary = '';
    
    if (log.action === 'UPDATE' && log.old_data && log.new_data) {
        const changes: string[] = [];
        Object.keys(log.new_data).forEach(key => {
            if (JSON.stringify(log.new_data[key]) !== JSON.stringify(log.old_data[key])) {
                changes.push(`${key}: ${JSON.stringify(log.old_data[key])} -> ${JSON.stringify(log.new_data[key])}`);
            }
        });
        summary = changes.join(', ');
    } else if (log.action === 'INSERT') {
        summary = 'New Record Created';
    } else if (log.action === 'DELETE') {
        summary = 'Record Deleted';
    }

    return {
        id: log.id,
        table_name: log.table_name,
        action: log.action,
        user_email: log.user_email || 'System/Unknown',
        description: `Modified record ${log.record_id}`,
        changes_summary: summary,
        created_at: log.created_at,
        // FIX 3: Added 'record_id' because the component expects it
        record_id: log.record_id || 'N/A' 
    };
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <AuditTrailReportClient 
        logs={logs} 
        totalCount={count || 0} 
        currentPage={page} 
        pageSize={limit}
      />
    </div>
  );
}