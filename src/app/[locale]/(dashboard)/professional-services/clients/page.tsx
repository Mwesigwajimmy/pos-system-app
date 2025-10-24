import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ClientList, Client } from '@/components/professional-services/clients/ClientList';
import { CreateClientModal } from '@/components/professional-services/clients/CreateClientModal';
import { Card, CardContent } from '@/components/ui/card';

async function getAllClients(supabase: any): Promise<Client[]> {
    const { data, error } = await supabase.from('customers').select(`id, name, email, phone`).order('name', { ascending: true });
    if (error) { console.error("Error fetching clients:", error); return []; }
    return data;
}

export default async function ClientHubPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const clients = await getAllClients(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Client Hub</h2>
                    <p className="text-muted-foreground">Manage all your firm's clients in one place.</p>
                </div>
                <CreateClientModal />
            </div>
            <Card>
                <CardContent className="p-4">
                    <ClientList clients={clients} />
                </CardContent>
            </Card>
        </div>
    );
}