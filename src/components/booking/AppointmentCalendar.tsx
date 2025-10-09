'use client';

import React, { useState, useCallback, useMemo } from 'react'; // 1. Import useMemo
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg, EventContentArg } from '@fullcalendar/core';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Trash2 } from 'lucide-react';

// Types
interface Appointment { id: number; title: string; start: string; end: string; extendedProps: any; }
interface FormData { id?: number; service_id: string; employee_id: string; start_time: string; end_time: string; notes: string; }
interface Service { id: number; name: string; }
interface Employee { id: number; name: string; }

// API Functions
const supabase = createClient();
const fetchAppointments = async (dateInfo: { start: Date, end: Date }): Promise<Appointment[]> => {
    const { data, error } = await supabase.rpc('get_appointments_in_range', { start_date: dateInfo.start.toISOString(), end_date: dateInfo.end.toISOString() });
    if (error) throw new Error(error.message);
    // Note: The ID from the database is a number, which is correct for our internal logic.
    return data.map((event: any) => ({ id: event.id, title: event.title, start: event.start_time, end: event.end_time, extendedProps: { ...event } }));
};
const fetchPrereqs = async () => {
    const { data: services, error: serviceError } = await supabase.from('services').select('id, name');
    if (serviceError) throw new Error(serviceError.message);
    const { data: employees, error: employeeError } = await supabase.from('employees').select('id, name');
    if (employeeError) throw new Error(employeeError.message);
    return { services, employees };
};
const upsertAppointment = async (formData: FormData) => { const { error } = await supabase.from('appointments').upsert(formData); if (error) throw new Error(error.message); };
const deleteAppointment = async (id: number) => { const { error } = await supabase.from('appointments').delete().eq('id', id); if (error) throw new Error(error.message); };

const AppointmentDialog = ({ isOpen, onClose, appointmentData, onSave, onDelete }: { isOpen: boolean, onClose: () => void, appointmentData: any, onSave: (data: FormData) => void, onDelete: (id: number) => void }) => {
    const { data: prereqs, isLoading: isLoadingPrereqs } = useQuery({ queryKey: ['appointmentPrereqs'], queryFn: fetchPrereqs });
    const [formData, setFormData] = useState<FormData>({ ...appointmentData });

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{formData.id ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
                    <DialogDescription>Fill in the details for the appointment below.</DialogDescription>
                </DialogHeader>
                {isLoadingPrereqs ? <div className="py-4"><Skeleton className="h-40 w-full" /></div> :
                <form id="appointmentForm" onSubmit={handleSubmit} className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Service</Label><Select name="service_id" onValueChange={val => setFormData(p => ({...p, service_id: val}))} defaultValue={formData.service_id}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{prereqs?.services.map((s: Service) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Staff</Label><Select name="employee_id" onValueChange={val => setFormData(p => ({...p, employee_id: val}))} defaultValue={formData.employee_id}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{prereqs?.employees.map((e: Employee) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>Start Time</Label><Input type="datetime-local" value={formData.start_time} onChange={e => setFormData(p => ({...p, start_time: e.target.value}))} /></div>
                        <div><Label>End Time</Label><Input type="datetime-local" value={formData.end_time} onChange={e => setFormData(p => ({...p, end_time: e.target.value}))} /></div>
                    </div>
                    <div><Label>Notes</Label><Input value={formData.notes || ''} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} /></div>
                </form>}
                <DialogFooter className="justify-between">
                    {formData.id && <Button variant="destructive" onClick={() => onDelete(formData.id!)}><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>}
                    <Button type="submit" form="appointmentForm" disabled={isLoadingPrereqs}>Save Appointment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const renderEventContent = (eventInfo: EventContentArg) => (
    <div className="p-1">
        <b className="text-xs">{eventInfo.timeText}</b>
        <p className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{eventInfo.event.title}</p>
        <p className="text-xs text-muted-foreground">{eventInfo.event.extendedProps.staff_name}</p>
    </div>
);

export default function AppointmentCalendar() {
    const [viewRange, setViewRange] = useState({ start: new Date(), end: new Date() });
    const [action, setAction] = useState<{ type: 'add' | 'edit' | 'delete', data?: any }>({ type: 'add', data: null });
    const queryClient = useQueryClient();

    const { data: events, isLoading, isError, error } = useQuery({
        queryKey: ['appointments', viewRange.start.toISOString()],
        queryFn: () => fetchAppointments(viewRange),
    });
    
    // 2. Memoize and transform the event data for FullCalendar.
    const calendarEvents = useMemo(() => {
        if (!events) return [];
        // FullCalendar requires the `id` to be a string. We map it here.
        return events.map(event => ({
            ...event,
            id: String(event.id),
        }));
    }, [events]);

    const handleMutation = (promise: Promise<any>, successMessage: string) => {
        toast.promise(promise, {
            loading: 'Processing...',
            success: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); setAction({ type: 'add', data: null }); return successMessage; },
            error: (err: Error) => err.message,
        });
    };
    
    const upsertMutation = useMutation({ mutationFn: upsertAppointment, onMutate: (data) => handleMutation(Promise.resolve(), `Appointment ${data.id ? 'updated' : 'created'}.`) });
    const deleteMutation = useMutation({ mutationFn: deleteAppointment, onMutate: () => handleMutation(Promise.resolve(), 'Appointment deleted.') });

    const handleDateClick = useCallback((arg: DateClickArg) => {
        const defaultStartTime = new Date(arg.date);
        const defaultEndTime = new Date(defaultStartTime.getTime() + 30 * 60000);
        const toLocalISOString = (date: Date) => date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2) + 'T' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
        
        setAction({ type: 'add', data: { start_time: toLocalISOString(defaultStartTime), end_time: toLocalISOString(defaultEndTime) } });
    }, []);
    
    const handleEventClick = useCallback((arg: EventClickArg) => {
        // arg.event.id is now a string from the calendar, so we parse it back to a number for our logic.
        const eventId = parseInt(arg.event.id, 10);
        const { start, end, extendedProps } = arg.event;
        const toLocalISOString = (date: Date) => date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2) + 'T' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
        setAction({ type: 'edit', data: { ...extendedProps, id: eventId, start_time: toLocalISOString(start!), end_time: toLocalISOString(end!) } });
    }, []);

    return (
        <div className="bg-card p-4 rounded-lg shadow-sm">
            {isLoading && <Skeleton className="h-[800px] w-full" />}
            {isError && <p className="text-destructive">Error loading appointments: {error.message}</p>}
            {!isLoading && !isError && (
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                    events={calendarEvents} // 3. Use the transformed calendarEvents array here.
                    datesSet={(dateInfo) => setViewRange({ start: dateInfo.start, end: dateInfo.end })}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventContent={renderEventContent}
                    height="auto"
                />
            )}
            
            {(action.type === 'add' || action.type === 'edit') && (
                <AppointmentDialog
                    isOpen={true}
                    onClose={() => setAction({ type: 'add', data: null })}
                    appointmentData={action.data}
                    onSave={upsertMutation.mutate}
                    onDelete={(id) => setAction({ type: 'delete', data: { id } })}
                />
            )}
            
            <AlertDialog open={action.type === 'delete'} onOpenChange={(open) => !open && setAction({type: 'add', data: null})}>
                 <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the appointment. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(action.data.id)}>Continue</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}