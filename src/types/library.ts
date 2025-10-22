// src/types/library.ts

// A structured Tag for better UI and filtering capabilities.
export interface Tag {
  id: string;
  name:string;
  color: string; // e.g., '#4A90E2'
}

// Represents a single version of a document for a full audit trail.
export interface DocumentVersion {
  id: string;
  version_number: number;
  storage_path: string;
  file_size: number;
  file_type: string | null;
  created_at: string;
  created_by: string; // User ID of the uploader
}

// The core Document type, now vastly more powerful.
export interface Document {
  id: string;
  business_id: string;
  folder_id: string | null;
  name: string;
  created_at: string;
  updated_at: string; // For tracking last modification
  created_by: string;
  last_modified_by: string; // User ID of the last person to modify
  type: 'document'; // Added for the LibraryItem union type

  // --- Enterprise & Versioning Features ---
  tags: Tag[]; // Uses the structured Tag interface
  versions: DocumentVersion[]; // A full history of the document
  current_version_id: string; // ID of the latest version
  
  // --- AI & Automation Features ---
  // Stores data extracted by AI (e.g., invoice total, contract date).
  extracted_data?: Record<string, any> | null; 
  
  // --- Convenience fields from the current version ---
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
}

// The Folder type, now with modification tracking.
export interface Folder {
  id: string;
  business_id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string; // For tracking last modification
  created_by: string;
  last_modified_by: string; // User ID of the last person to modify
  type: 'folder'; // Added for the LibraryItem union type
}

// This discriminated union is a robust way to handle items in the UI.
export type LibraryItem = Document | Folder;