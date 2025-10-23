import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { EquipmentList } from '@/components/field-service/equipment/EquipmentList';
import { CreateEquipmentModal } from '@/components/field-service/equipment/CreateEquipmentModal';

async function getAllEquipment(supabase: any) {
    const { data, error } = await supabase.from('equipment').select(`*`).order('name', { ascending: true });
    if (error) { console.error("Error fetching equipment:", error); return []; }
    return data;
}

export default async function EquipmentPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const equipment = await getAllEquipment(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Equipment Management</h2>
                    <p className="text-muted-foreground">Track all your company assets, vehicles, and tools.</p>
                </div>
                <CreateEquipmentModal />
            </div>
            <EquipmentList equipment={equipment} />
        </div>
    );
}