import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import FleetManagement, { FleetAssignment } from '@/components/hr/FleetManagement';

export default async function FleetPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Fetch fleet assignments joined with employee data
    // Assumes table 'fleet_assignments' exists
    const { data: rawData } = await supabase
        .from('fleet_assignments')
        .select(`
            id,
            vehicle_model,
            plate_number,
            license_number,
            license_expiry,
            insurance_expiry,
            assigned_date,
            return_date,
            status,
            notes,
            employees (
                first_name,
                last_name,
                email,
                department,
                country_code
            )
        `)
        .order('assigned_date', { ascending: false });

    // Map DB columns to UI Props
    const assignments: FleetAssignment[] = (rawData || []).map((item: any) => ({
        id: item.id,
        vehicle: item.vehicle_model,
        plate: item.plate_number,
        assignedTo: `${item.employees?.first_name} ${item.employees?.last_name}`,
        employeeEmail: item.employees?.email,
        driverLicense: item.license_number,
        licenseExpiry: item.license_expiry,
        insuranceExpiry: item.insurance_expiry,
        country: item.employees?.country_code || 'UG',
        entity: item.employees?.department || 'Operations',
        assignmentDate: item.assigned_date,
        returnDate: item.return_date,
        status: item.status || 'active',
        notes: item.notes
    }));

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Fleet Management</h2>
            <FleetManagement initialAssignments={assignments} />
        </div>
    );
}