'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Radio } from 'lucide-react';
import { createClient } from '@/lib/supabase/client'; // Uses the client-side singleton

interface IoTData {
  id?: number;
  created_at: string;
  property: string;
  value: number | string;
  equipment_id?: number;
}

export default function IoTDeviceMonitor({ equipmentId }: { equipmentId: number; mqttTopic?: string }) {
  const [messages, setMessages] = useState<IoTData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // 1. Initial Fetch (Get last 5 readings)
    const fetchInitial = async () => {
        const { data } = await supabase
            .from('equipment_telemetry') // Ensure this table exists
            .select('*')
            .eq('equipment_id', equipmentId)
            .order('created_at', { ascending: false })
            .limit(5);
        if (data) setMessages(data as IoTData[]);
    };
    fetchInitial();

    // 2. Realtime Subscription (WebSocket)
    const channel = supabase
      .channel(`equipment-${equipmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'equipment_telemetry',
          filter: `equipment_id=eq.${equipmentId}`,
        },
        (payload) => {
          const newData = payload.new as IoTData;
          setMessages((prev) => [newData, ...prev].slice(0, 10)); // Keep last 10
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [equipmentId, supabase]);

  return (
    <Card className="h-full border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
                <Radio className={`h-5 w-5 ${isConnected ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} /> 
                IoT Telemetry
            </span>
            <span className={`text-xs px-2 py-1 rounded-full border ${isConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700'}`}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        {isConnected ? "Waiting for data stream..." : <Loader2 className="animate-spin mx-auto" />}
                    </TableCell>
                </TableRow>
            ) : (
                messages.map((msg, idx) => (
                <TableRow key={idx} className="animate-in slide-in-from-left-2 fade-in duration-300">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(msg.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-medium">{msg.property}</TableCell>
                    <TableCell className="font-bold font-mono">{msg.value}</TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}