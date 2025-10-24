import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DocumentBrowser, Document } from '@/components/professional-services/documents/DocumentBrowser';
import { CreateFolderModal } from '@/components/professional-services/documents/CreateFolderModal';
import { UploadDocumentModal } from '@/components/professional-services/documents/UploadDocumentModal';
import { Card, CardContent } from '@/components/ui/card';

async function getDocuments(supabase: any, parentId: string | null): Promise<Document[]> {
    let query = supabase.from('documents').select('*');
    if (parentId) {
        query = query.eq('parent_id', parentId);
    } else {
        query = query.is('parent_id', null);
    }
    const { data, error } = await query.order('type', { ascending: true }).order('name');
    if (error) { console.error("Error fetching documents:", error); return []; }
    return data;
}

export default async function DocumentsPage({ searchParams }: { searchParams: { folder: string | null } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const parentId = searchParams.folder || null;
    const documents = await getDocuments(supabase, parentId);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Document Management</h2>
                    <p className="text-muted-foreground">Securely store and organize all your client and case files.</p>
                </div>
                <div className="flex space-x-2">
                    <CreateFolderModal parentId={parentId} />
                    <UploadDocumentModal parentId={parentId} />
                </div>
            </div>
            <Card>
                <CardContent className="p-4">
                    <DocumentBrowser documents={documents} />
                </CardContent>
            </Card>
        </div>
    );
}