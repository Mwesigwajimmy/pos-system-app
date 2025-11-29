'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface RegulatoryDoc {
  id: number;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
  uploader_name?: string; // Optional if you join with users table
}

export async function fetchRegulatoryDocs(workOrderId: number, tenantId: string) {
  const supabase = createClient(cookies());
  const { data, error } = await supabase
    .from('regulatory_documents')
    .select('*')
    .eq('work_order_id', workOrderId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data as RegulatoryDoc[];
}

export async function uploadRegulatoryDoc(formData: FormData) {
  const supabase = createClient(cookies());
  
  // 1. Extract Data
  const file = formData.get('file') as File;
  const title = formData.get('title') as string;
  const workOrderId = formData.get('workOrderId');
  const tenantId = formData.get('tenantId');

  if (!file || !title) throw new Error("Missing file or title");

  // 2. Upload File to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const filePath = `${tenantId}/${workOrderId}/${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('compliance-docs')
    .upload(filePath, file);

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // 3. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('compliance-docs')
    .getPublicUrl(filePath);

  // 4. Save Metadata to Database
  const { error: dbError } = await supabase.from('regulatory_documents').insert({
    work_order_id: Number(workOrderId),
    tenant_id: tenantId,
    title: title,
    file_url: publicUrl,
    file_type: fileExt,
    content: 'Attachment' // Legacy field support
  });

  if (dbError) throw new Error(`Database save failed: ${dbError.message}`);
  
  return { success: true };
}

export async function deleteRegulatoryDoc(docId: number, fileUrl: string) {
  const supabase = createClient(cookies());

  // 1. Delete from Database first
  const { error: dbError } = await supabase
    .from('regulatory_documents')
    .delete()
    .eq('id', docId);

  if (dbError) throw new Error(dbError.message);

  // 2. Cleanup Storage (Optional but recommended for Enterprise)
  // Extract path from URL: .../compliance-docs/UUID/WO/file.pdf
  const path = fileUrl.split('/compliance-docs/')[1];
  if (path) {
    await supabase.storage.from('compliance-docs').remove([path]);
  }

  return { success: true };
}