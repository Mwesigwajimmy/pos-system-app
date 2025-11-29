"use client";

import React, { useEffect, useState } from "react";
import { Shield, Monitor, Globe, Clock, AlertCircle, Loader2 } from "lucide-react";
import { activityService, ActivityLog } from '@/services/activityService';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns'; // Recommended: npm install date-fns

export default function UserActivityFeed() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  // 1. Separate Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  
  // 2. Client-side only flag to prevent Hydration Errors
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const supabase = createClient();
    
    // 3. AbortController to cancel fetch if component unmounts (prevents memory leaks)
    const abortController = new AbortController();

    const init = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) throw authError;
        
        if (session?.user) {
          setEmail(session.user.email || '');
          // Ideally, pass { limit: 20 } here for pagination
          const data = await activityService.getUserActivity(session.user.id); 
          setLogs(data);
        }
      } catch(e: any) {
        console.error(e);
        // 4. User-facing Error State
        setError("Unable to load activity feed. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => abortController.abort();
  }, []);

  // 5. Helper to format "details" object into human text
  const formatDetails = (details: string | object) => {
    if (typeof details === 'string') return details;
    if (!details) return '';
    // Example: If details is { amount: 500 }, make it look nice
    return Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ');
  };

  // Prevent server-side rendering mismatch
  if (!isMounted) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Shield className="w-5 h-5" /></div>
        <div>
          <h3 className="font-bold text-gray-900">Your Activity</h3>
          <p className="text-xs text-gray-500">{email}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
        {loading ? (
           <div className="flex justify-center py-8 text-blue-500">
             <Loader2 className="w-6 h-6 animate-spin" />
           </div>
        ) : error ? (
           <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded">
             <AlertCircle className="w-4 h-4" /> {error}
           </div>
        ) : logs.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">No recent activity.</div>
        ) : (
            <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                {logs.map((log) => (
                <div key={log.id} className="relative pl-6 group">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-green-500" />
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div>
                        <p className="font-semibold text-sm text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]" title={String(log.details)}>
                          {formatDetails(log.details)}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                            {log.ip_address && <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {log.ip_address}</span>}
                            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {log.country_code}</span>
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-0 flex items-center gap-1 text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        {/* 6. Robust Date Formatting */}
                        <Clock className="w-3 h-3" /> {format(new Date(log.created_at), 'h:mm a')}
                    </div>
                    </div>
                </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}