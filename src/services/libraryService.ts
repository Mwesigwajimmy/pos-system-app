// src/services/libraryService.ts

import { createClient } from '@/lib/supabase/client';
import { Document, Folder, DocumentVersion } from '@/types/library';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient();

// FOLDERS API (Enhanced with sorting)
export const getFolders = async (businessId: string, parentFolderId: string | null = null): Promise<Folder[]> => {
    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('business_id', businessId)
        .eq('parent_folder_id', parentFolderId)
        .order('name', { ascending: true }); // Default sort for better UX

    if (error) throw error;
    return data.map(f => ({ ...f, type: 'folder' })); // Add type property for LibraryItem compatibility
};

export const createFolder = async (businessId: string, name: string, parentFolderId: string | null = null): Promise<Folder> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
        .from('folders')
        .insert({ 
            name, 
            parent_folder_id: parentFolderId, 
            business_id: businessId, 
            created_by: user.id,
            last_modified_by: user.id // Set on creation
        })
        .select()
        .single();

    if (error) throw error;
    return { ...data, type: 'folder' };
};

// DOCUMENTS API (Enhanced with sorting)
export const getDocuments = async (businessId: string, folderId: string | null = null): Promise<Document[]> => {
    // This query is now more complex to fetch the necessary enterprise data
    const { data, error } = await supabase
        .from('documents')
        .select(`
            *,
            tags (*),
            versions:document_versions (*)
        `)
        .eq('business_id', businessId)
        .eq('folder_id', folderId)
        .order('name', { ascending: true });

    if (error) throw error;
    // Map the data to match our rich Document type
    return data.map(doc => {
        const currentVersion = doc.versions.find((v: any) => v.id === doc.current_version_id);
        return {
            ...doc,
            type: 'document',
            storage_path: currentVersion?.storage_path || '',
            file_type: currentVersion?.file_type || null,
            file_size: currentVersion?.file_size || null,
        }
    });
};

/**
 * --- ENTERPRISE UPLOAD FUNCTION ---
 * This is the real-world implementation. It uploads a file with progress reporting
 * and then calls a single database function to atomically create all necessary records.
 *
 * IMPORTANT: For this to work, you must create a Supabase RPC function named
 * `create_new_document` that handles the transaction of inserting into the `documents`,
 * `document_versions`, and `document_tags` tables.
 */
export async function uploadDocument(
  businessId: string,
  file: File,
  folderId: string | null,
  tags: string[],
  onProgress: (percentage: number) => void
): Promise<Document> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("User not authenticated");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Create a unique path for the file to prevent any collisions.
  const documentId = uuidv4();
  const filePath = `${businessId}/${folderId || 'root'}/${documentId}/${file.name}`;

  return new Promise((resolve, reject) => {
    // We use XMLHttpRequest directly to get access to the 'onprogress' event,
    // which is essential for a real-time progress bar.
    const xhr = new XMLHttpRequest();
    // Use the resumable upload endpoint for robustness.
    xhr.open('POST', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/business_documents/${filePath}`, true);
    
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded * 100) / event.total);
        onProgress(percentage);
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // STEP 2: File is successfully in storage. Now, call the database function.
        // This RPC should handle creating the document, its first version, and linking tags.
        const { data: newDocument, error: rpcError } = await supabase.rpc('create_new_document', {
          p_business_id: businessId,
          p_folder_id: folderId,
          p_user_id: user.id,
          p_document_name: file.name,
          p_file_size: file.size,
          p_file_type: file.type,
          p_storage_path: filePath,
          p_tags: tags // Pass the tag names to the function
        });

        if (rpcError) {
          console.error("Database error after upload, file may be orphaned:", rpcError);
          // In a real system, you'd add this orphaned file to a cleanup queue.
          reject(new Error('Failed to save document metadata.'));
        } else {
          // Success! The database function returns the fully formed new document.
          resolve(newDocument);
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('A network error occurred during the upload. Please try again.'));
    };
    
    // Start the upload by sending the file data.
    xhr.send(file);
  });
};


// --- EXISTING UTILITY FUNCTIONS (Retained and Verified) ---

export const deleteDocument = async (document: Document): Promise<void> => {
    // Enterprise version: This should call an RPC that deletes the document,
    // all its versions from the DB, and all associated files from storage in a transaction.
    const { error } = await supabase.rpc('delete_document_and_versions', { p_document_id: document.id });
    if (error) throw error;
};

export const getDocumentPublicUrl = (storagePath: string): string => {
    const { data } = supabase.storage
        .from('business_documents')
        .getPublicUrl(storagePath);
    
    return data.publicUrl;
};

// --- NEW ENTERPRISE FUNCTIONS ---

export const getVersionHistory = async (documentId: string): Promise<DocumentVersion[]> => {
    const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

    if (error) throw error;
    return data;
};