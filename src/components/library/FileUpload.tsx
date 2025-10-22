'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, Loader2, X, Tag as TagIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import * as libraryService from '@/services/libraryService';
import { useUserProfile } from '@/hooks/useUserProfile';

// The state for each file now includes detailed status and progress
type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';
interface UploadableFile {
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
}

// Props remain the same, the parent just needs to know when to refresh its file list.
interface FileUploadProps {
  onUploadComplete: () => void;
  currentFolderId: string | null;
}

export function FileUpload({ onUploadComplete, currentFolderId }: FileUploadProps) {
  const [stagedFiles, setStagedFiles] = useState<UploadableFile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { data: userProfile } = useUserProfile();

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    // Handle rejected files
    if (fileRejections.length > 0) {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error: any) => toast({
          title: `File Rejected: ${file.name}`,
          description: error.message,
          variant: "destructive"
        }));
      });
    }

    // Add accepted files to the staging area
    if (acceptedFiles.length > 0) {
      setStagedFiles(prev => [
        ...prev,
        // Explicitly cast 'pending' to the UploadStatus type.
        ...acceptedFiles.map(file => ({ file, progress: 0, status: 'pending' as UploadStatus }))
      ]);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxSize: 500 * 1024 * 1024 /* 500MB */ });

  const updateFileProgress = (index: number, progress: number, status: UploadStatus, error?: string) => {
    setStagedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index]) {
        newFiles[index] = { ...newFiles[index], progress, status, error };
      }
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (stagedFiles.length === 0 || !userProfile?.business_id) {
        toast({ title: "Upload Error", description: "No files to upload or business context is missing.", variant: "destructive"});
        return;
    }

    setIsUploading(true);

    const businessId = userProfile.business_id;

    // Use a queue to manage concurrency. We'll upload 3 files at a time.
    const concurrencyLimit = 3;
    const queue = [...stagedFiles.entries()]; // Get [index, file] pairs
    let activeUploads = 0;
    let successfulUploads = 0;

    const processQueue = async () => {
      while (queue.length > 0 && activeUploads < concurrencyLimit) {
        activeUploads++;
        const [index, uploadableFile] = queue.shift()!;
        
        if (uploadableFile.status !== 'pending') {
          activeUploads--;
          continue; // Skip already processed files
        }

        try {
          updateFileProgress(index, 0, 'uploading');
          
          await libraryService.uploadDocument(
            businessId,
            uploadableFile.file,
            currentFolderId,
            tags,
            (progress) => {
              // This is the real-time progress callback from the service
              updateFileProgress(index, progress, 'uploading');
            }
          );
          
          updateFileProgress(index, 100, 'success');
          successfulUploads++;

        } catch (error: any) {
          console.error("Upload failed for file:", uploadableFile.file.name, error);
          updateFileProgress(index, 0, 'error', error.message || 'An unknown error occurred.');
        } finally {
          activeUploads--;
          processQueue(); // Start the next item in the queue
        }
      }

      if (queue.length === 0 && activeUploads === 0) {
        // All uploads are finished
        setIsUploading(false);
        toast({ title: "Upload Complete", description: `${successfulUploads} of ${stagedFiles.length} files uploaded successfully.` });
        
        if (successfulUploads > 0) {
          onUploadComplete(); // Tell the parent page to refresh its file list
        }

        // Clear the staging area after a delay so user can see the status
        setTimeout(() => {
          setStagedFiles([]);
          setTags([]);
        }, 5000);
      }
    };

    processQueue(); // Kick off the initial batch of uploads
  };


  // --- Helper functions for the UI ---
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value);
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const clearFiles = () => {
    setStagedFiles([]);
  };

  // --- RENDER LOGIC ---
  if (stagedFiles.length > 0) {
    return (
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="font-medium text-lg">Upload Staging ({stagedFiles.length} file(s))</h3>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {stagedFiles.map((uf, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {uf.status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
                {uf.status === 'error' && <AlertCircle className="h-6 w-6 text-red-500" />}
                {(uf.status === 'pending' || uf.status === 'uploading') && <FileIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="font-medium truncate">{uf.file.name}</p>
                {uf.status === 'uploading' && <Progress value={uf.progress} className="h-2 mt-1" />}
                {uf.status === 'error' && <p className="text-xs text-red-500 truncate">{uf.error}</p>}
                {(uf.status === 'pending' || uf.status === 'success') && <p className="text-sm text-muted-foreground">{(uf.file.size / 1024 / 1024).toFixed(2)} MB</p>}
              </div>
            </div>
          ))}
        </div>
        
        <div>
          <label className="text-sm font-medium">Add Tags to all files (Optional)</label>
          <div className="flex items-center gap-2 mt-1 p-2 border rounded-md">
            <TagIcon className="h-4 w-4 text-muted-foreground"/>
            {tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}<X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)}/></Badge>
            ))}
            <Input className="flex-grow border-none shadow-none focus-visible:ring-0 h-auto p-0" placeholder="Type and press Enter..." value={tagInput} onChange={handleTagInputChange} onKeyDown={handleTagInputKeyDown}/>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={clearFiles} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Uploading...' : `Upload ${stagedFiles.length} file(s)`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <UploadCloud className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{isDragActive ? "Drop files here..." : "Drag & drop, or click to select"}</p>
        <p className="text-xs text-muted-foreground">Max file size: 500MB</p>
      </div>
    </div>
  );
}