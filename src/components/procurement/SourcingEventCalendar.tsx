"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, CalendarIcon, Clock, Globe, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

// ENTERPRISE TYPE ALIGNMENT: Interconnected with 'view_sourcing_events'
interface SourcingEvent {
  id: string;
  event_type: "Tender" | "Renewal" | string;
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
      // Querying the autonomous view that pulls from Tenders and Contracts
      const { data } = await supabase
        .from('view_sourcing_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('end_date', { ascending: true });
      
      if (data) setEvents(data as any);
      setLoading(false);
    };

    fetchEvents();
  }, [tenantId, supabase]);

  const getDaysRemaining = (endDate: string) => {
    const diff = new Date(endDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <Card className="border-t-4 border-t-orange-500 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
           <CalendarIcon className="h-5 w-5 text-orange-600" /> Sourcing Events & Calendar
        </CardTitle>
        <CardDescription>
          Automated view of major sourcing milestones, tenders, and contract renewals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <div className="flex py-12 justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
          : (
            <div className="space-y-2">
              {events.length === 0
                ? <div className="text-center text-muted-foreground py-16 bg-slate-50 rounded-lg border-2 border-dashed">
                    No upcoming events scheduled. Data is pulled automatically from Tenders and Contracts.
                  </div>
                : events.map(event => {
                    const daysLeft = getDaysRemaining(event.end_date);
                    return (
                      <div key={event.id} className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border hover:bg-slate-50 transition-all duration-200">
                        
                        {/* Event Identification */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                             <Badge variant={event.event_type === 'Tender' ? 'default' : 'outline'} className="text-[10px] h-5">
                                {event.event_type}
                             </Badge>
                             <span className="font-bold text-slate-900">{event.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                             <div className="flex items-center gap-1"><Globe className="h-3 w-3"/> {event.country} / {event.entity}</div>
                             <div className="flex items-center gap-1 font-medium"><Clock className="h-3 w-3"/> Due: {new Date(event.end_date).toLocaleDateString()}</div>
                          </div>
                        </div>

                        {/* Status & Predictive Logic */}
                        <div className="flex items-center gap-4">
                           <div className="hidden lg:flex flex-col items-end text-right">
                              <span className={`text-xs font-bold ${daysLeft < 7 && event.status !== 'concluded' ? 'text-red-500' : 'text-slate-400'}`}>
                                 {event.status === 'concluded' ? 'COMPLETED' : `${daysLeft} DAYS LEFT`}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                 {new Date(event.start_date).toLocaleDateString()} <ArrowRight className="h-2 w-2"/> {new Date(event.end_date).toLocaleDateString()}
                              </div>
                           </div>
                           
                           <span className={`min-w-[100px] text-center px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ${
                            event.status === 'planned' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            event.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            'bg-slate-100 text-slate-500 grayscale'
                          }`}>
                            {event.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          )
        }
      </CardContent>
    </Card>
  );
}