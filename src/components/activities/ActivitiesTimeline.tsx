"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Search, Globe, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// Strict typing for the Activity Log based on typical Audit Table schema
interface ActivityLog {
  id: string;
  actor_email: string;
  action: string;
  entity: string;
  details: string | object | null; // Can be JSONB (object) or text
  country_code: string;
  created_at: string;
  tenant_id: string;
}

interface Props {
  tenantId?: string;
}

export default function ActivitiesTimeline({ tenantId: propTenantId }: Props) {
  // 1. Context & Hooks
  const { data: tenant } = useTenant();
  const tenantId = propTenantId || tenant?.id;
  const supabase = createClient();

  // 2. State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // 3. Data Fetching
  useEffect(() => {
    if (!tenantId) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        // Fetching directly from Supabase 'audit_logs' or 'activities' table
        const { data, error } = await supabase
          .from('activity_logs') // Ensure this matches your DB table name
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50); // Limit for performance on timeline view

        if (error) throw error;
        if (data) setLogs(data as ActivityLog[]);
        
      } catch (err) {
        console.error("Failed to fetch activity logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [tenantId, supabase]);

  // 4. Filtering Logic
  const filteredLogs = useMemo(() => 
    logs.filter(log => 
      (log.actor_email || '').toLowerCase().includes(filter.toLowerCase()) || 
      (log.action || '').toLowerCase().includes(filter.toLowerCase()) ||
      (log.entity || '').toLowerCase().includes(filter.toLowerCase())
    ),
  [logs, filter]);

  // 5. Helper to safely render details (Fixes the Build Error)
  const renderDetails = (details: string | object | null) => {
    if (!details) return null;
    if (typeof details === 'object') {
      return JSON.stringify(details);
    }
    return details;
  };

  // 6. Loading & Empty States
  if (loading && !logs.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500 mt-2">Loading audit trail...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col max-h-[600px]">
      {/* Header Section */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-lg font-bold text-gray-900">Global Audit Trail</h2>
                <p className="text-xs text-gray-500">Real-time log across all regions.</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
              <Globe className="w-5 h-5"/>
            </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            type="text" 
            placeholder="Search logs by actor, action, or ID..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-hidden p-5">
        <ScrollArea className="h-full pr-4">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
              <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
              No activity logs found matching your criteria.
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
              {filteredLogs.map((log) => (
                <div key={log.id} className="relative pl-8 group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm bg-blue-600 group-hover:bg-blue-700 transition-colors z-10" />
                  
                  {/* Content */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">{log.actor_email}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-mono uppercase tracking-wide">
                        {log.action}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      Modified <span className="font-medium text-gray-800">{log.entity}</span>
                    </p>
                    
                    {/* Fixed: Safely render object or string */}
                    <p className="text-xs text-gray-400 mt-1 font-mono break-all line-clamp-3">
                      {renderDetails(log.details)}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                       <span className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider font-semibold border border-gray-200 px-1.5 rounded bg-gray-50">
                         <Globe className="w-3 h-3" /> {log.country_code || 'GLB'}
                       </span>
                       <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}