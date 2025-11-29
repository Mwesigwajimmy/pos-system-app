"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, CalendarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SourcingEvent {
  id: string;
  event_type: string;
  title: string;
  entity: string;
  country: string;
  start_date: string;
  end_date: string;
  status: "planned" | "in_progress" | "concluded";
  owner: string;
}

interface Props {
  tenantId?: string;
}

export default function SourcingEventCalendar({ tenantId }: Props) {
  const [events, setEvents] = useState<SourcingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if(!tenantId) return;

    const fetchEvents = async () => {
      const { data } = await supabase
        .from('sourcing_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('start_date', { ascending: true });
      
      if (data) setEvents(data as any);
      setLoading(false);
    };

    fetchEvents();
  }, [tenantId, supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sourcing Events & Calendar</CardTitle>
        <CardDescription>
          Major sourcing milestones, tenders, and contract renewals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-12 justify-center"><Loader2 className="w-7 h-7 animate-spin" /></div>
          : (
            <ul className="space-y-4">
              {events.length === 0
                ? <li className="text-center text-muted-foreground py-10">No upcoming events scheduled.</li>
                : events.map(event => (
                    <li key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-3 border-b pb-3 last:border-0">
                      <div className="flex items-center gap-2 min-w-[200px]">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-sm">{event.title}</span>
                      </div>
                      <div className="flex flex-1 gap-4 text-sm text-muted-foreground items-center flex-wrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs dark:bg-slate-800">{event.event_type}</span>
                        <span>{new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}</span>
                        <span className="hidden md:inline">| {event.entity}</span>
                        <span className="ml-auto flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide ${
                            event.status === 'planned' ? 'bg-yellow-100 text-yellow-700' :
                            event.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {event.status.replace('_', ' ')}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))
              }
            </ul>
          )
        }
      </CardContent>
    </Card>
  );
}