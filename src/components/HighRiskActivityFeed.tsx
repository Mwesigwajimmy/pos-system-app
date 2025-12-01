'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, User, Clock, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// --- Type Definitions ---
interface AuditLogEntry {
  id: number;
  description: string;
  user_email: string;
  action_type: 'DELETE' | 'UPDATE' | 'void' | 'LOGIN' | 'high_value';
  severity: 'low' | 'medium' | 'high';
  created_at: string;
}

export default function HighRiskActivityFeed() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // 1. Initial Fetch of critical logs
    const fetchInitialLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_logs') // Ensure your table is named 'audit_logs' or 'audit_log'
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);
        
        if (error) throw error;
        if (data) setLogs(data as AuditLogEntry[]);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialLogs();

    // 2. Realtime Subscription
    const channel = supabase
      .channel('realtime-security-feed')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'audit_logs' // Must match your DB table name exactly
        },
        (payload) => {
          console.log('New security event received:', payload);
          const newLog = payload.new as AuditLogEntry;
          setLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep list from growing infinitely
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Helper for Severity Badges
  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100';
      default: return 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100';
    }
  };

  return (
    <Card className="mt-6 h-full border-red-100 dark:border-red-900/20">
      <CardHeader className="pb-3 border-b bg-red-50/30 dark:bg-red-900/10">
        <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-400">
          <ShieldAlert className="h-5 w-5" /> 
          Security & Audit Feed
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Syncing security logs...</span>
             </div>
          ) : logs.length === 0 ? (
             <div className="text-center p-8 text-muted-foreground text-sm">
                No high-risk activities detected recently.
             </div>
          ) : (
            <div className="flex flex-col">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col p-4 border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-foreground">
                        {log.description}
                    </span>
                    <Badge variant="outline" className={`${getSeverityColor(log.severity)} text-[10px] uppercase`}>
                        {log.severity}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.user_email}
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}