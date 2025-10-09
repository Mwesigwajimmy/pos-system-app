// src/components/HighRiskActivityFeed.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, Title, List, ListItem, Text } from '@tremor/react';
import { createClient } from '@/lib/supabase/client'; // Corrected import
import { AuditLogEntry } from '@/types/dashboard';

export default function HighRiskActivityFeed() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const supabase = createClient(); // Create the client instance

  useEffect(() => {
    // Fetch initial data
    const fetchInitialLogs = async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setLogs(data);
    };

    fetchInitialLogs();

    // Set up real-time subscription
    const channel = supabase
      .channel('realtime-audit-log')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log' },
        (payload) => {
          setLogs((currentLogs) => [payload.new as AuditLogEntry, ...currentLogs]);
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]); // Added supabase to dependency array

  return (
    <Card className="mt-6">
      <Title>High-Risk Activity Feed</Title>
      <List className="mt-4">
        {logs.slice(0, 10).map((log) => (
          <ListItem key={log.id}>
            <div className="w-full">
              <Text>{log.description}</Text>
              <Text className="text-xs text-gray-500">
                {log.user_email} at {new Date(log.created_at).toLocaleString()}
              </Text>
            </div>
          </ListItem>
        ))}
      </List>
    </Card>
  );
}