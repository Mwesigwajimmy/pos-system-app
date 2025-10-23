'use client';

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useToast } from '@/components/ui/use-toast';
import { rescheduleWorkOrder } from '@/lib/field-service/actions/schedule';
import { EventDropArg } from '@fullcalendar/core';

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

  // This function is called when a user drags and drops an event
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    if (!dropInfo.event.start) {
        console.error("New event date is null.");
        return;
    }

    setIsLoading(true);

    const workOrderId = dropInfo.event.id;
    const newStartDate = dropInfo.event.start;

    const result = await rescheduleWorkOrder(workOrderId, newStartDate);

    if (result.success) {
      toast({
        title: 'Schedule Updated',
        description: `Work order has been rescheduled to ${newStartDate.toLocaleDateString()}.`,
      });
    } else {
      toast({
        title: 'Error',
        description: result.message || 'Could not update the schedule. Reverting change.',
        variant: 'destructive',
      });
      // If the server update fails, revert the event to its original position
      dropInfo.revert();
    }

    setIsLoading(false);
  };

  // --- Optional: Handle clicking on an event to show details ---
  const handleEventClick = (clickInfo: any) => {
    const { uid, status, priority, customer, technicians } = clickInfo.event.extendedProps;
    alert(
        `Work Order: ${uid}\n` +
        `Summary: ${clickInfo.event.title}\n` +
        `Customer: ${customer}\n` +
        `Status: ${status}\n` +
        `Priority: ${priority}\n` +
        `Assigned: ${technicians.join(', ') || 'None'}`
    );
  };

  return (
    <div className={`relative h-full ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
              <p>Updating schedule...</p>
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
        editable={true}          // Allows dragging and resizing events
        droppable={true}          // Allows events to be dropped onto the calendar
        eventDrop={handleEventDrop} // The magic function for drag-and-drop
        eventClick={handleEventClick} // Optional: for showing event details
        height="100%"
        nowIndicator={true}
        scrollTime="08:00:00"     // Start the weekly/daily view at 8 AM
      />
    </div>
  );
}