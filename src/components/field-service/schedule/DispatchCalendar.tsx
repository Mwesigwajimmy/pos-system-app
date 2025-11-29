'use client';

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useToast } from '@/components/ui/use-toast';
import { rescheduleWorkOrder } from '@/lib/actions/scheduler'; // Import the new server action
import { EventDropArg, EventClickArg } from '@fullcalendar/core';
import { Card } from '@/components/ui/card';

// Define the structure of the event object you pass to the calendar
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    uid: string;
    status: string;
    priority: string;
    customer: string;
    technicians: string[];
  };
}

interface DispatchCalendarProps {
  initialEvents: CalendarEvent[];
}

export function DispatchCalendar({ initialEvents }: DispatchCalendarProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Handle Drag & Drop Rescheduling
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    if (!dropInfo.event.start) return;

    setIsLoading(true);

    const workOrderId = dropInfo.event.id;
    // FullCalendar returns a Date object. Passed to Server Action.
    const newStartDate = dropInfo.event.start; 

    try {
        const result = await rescheduleWorkOrder(workOrderId, newStartDate);

        if (result.success) {
            toast({
                title: 'Schedule Updated',
                description: `Job rescheduled to ${newStartDate.toLocaleString()}`,
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({
            title: 'Update Failed',
            description: error.message || 'Could not update schedule',
            variant: 'destructive',
        });
        dropInfo.revert(); // Snap back if failed
    } finally {
        setIsLoading(false);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const { status, customer } = clickInfo.event.extendedProps;
    toast({
        title: clickInfo.event.title,
        description: `Customer: ${customer} | Status: ${status}`,
    });
  };

  return (
    <Card className="h-full p-2 relative overflow-hidden">
      {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50 backdrop-blur-[1px]">
              <div className="bg-white p-3 rounded shadow-lg flex items-center gap-2">
                 <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                 <span className="text-sm font-medium">Updating Schedule...</span>
              </div>
          </div>
      )}
      
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={initialEvents}
        editable={true}
        droppable={true}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        height="750px"
        nowIndicator={true}
        scrollTime="08:00:00"
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        eventClassNames="cursor-pointer text-xs font-semibold"
      />
    </Card>
  );
}