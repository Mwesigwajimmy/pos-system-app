import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import TimeAttendanceTracker, { AttendanceEntry } from '@/components/hr/TimeAttendanceTracker';

export default async function TimeAttendancePage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Fetch attendance logs joined with employee details
    // Assuming table 'attendance_logs' exists
    const { data: rawLogs } = await supabase
        .from('attendance_logs')
        .select(`
            id,
            date,
            clock_in,
            clock_out,
            status,
            location_name,
            employees (
                first_name,
                last_name,
                email,
                department,
                country_code
            )
        `)
        .order('date', { ascending: false });

    // Format for UI
    const entries: AttendanceEntry[] = (rawLogs || []).map((log: any) => ({
        id: log.id,
        employee: `${log.employees?.first_name} ${log.employees?.last_name}`,
        email: log.employees?.email,
        entity: log.employees?.department || 'N/A',
        status: log.status || 'absent',
        clockIn: log.clock_in,
        clockOut: log.clock_out,
        date: log.date,
        location: log.location_name || 'Office',
        country: log.employees?.country_code || 'UG',
    }));

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Time & Attendance</h2>
            <TimeAttendanceTracker entries={entries} />
        </div>
    );
}