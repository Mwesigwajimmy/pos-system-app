'use client';

import React, { useState, useEffect, useRef } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Upload, Download, Trash2, FileText, Lock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface AuditFile {
  id: string;
  filename: string;
  uploaded_by: string;
  upload_date: string;
  size: number;
  entity: string;
  storage_path: string;
}

export default function AuditFileManager() {
  const supabase = createClient();
  const [files, setFiles] = useState<AuditFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    const { data, error } = await supabase.from('audit_files').select('*').order('upload_date', { ascending: false });
    if (!error) setFiles(data as AuditFile[]);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Validation (Example: Max 10MB)
    if (file.size > 10 * 1024 * 1024) return toast.error("File too large (Max 10MB)");

    setUploading(true);
    try {
        // 2. Upload to Storage Bucket
        const filePath = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('audit-evidence').upload(filePath, file);
        if (uploadError) throw uploadError;

        // 3. Insert Metadata to DB
        const { error: dbError } = await supabase.from('audit_files').insert([{
            filename: file.name,
            size: file.size,
            storage_path: filePath,
            entity: "General", // This would ideally come from context or a selector
            uploaded_by: "Current User" // Replace with session.user.email
        }]);

        if (dbError) throw dbError;

        toast.success("File uploaded securely");
        fetchFiles();
    } catch (e: any) {
        toast.error("Upload failed: " + e.message);
    } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
        // 4. Secure Download (Signed URL)
        // This ensures only authorized users with a valid token can see the file
        const { data, error } = await supabase.storage.from('audit-evidence').createSignedUrl(path, 60); // Valid for 60s
        if (error) throw error;
        
        // Trigger download
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        toast.error("Could not download file");
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
        // Delete from Storage AND DB
        await supabase.storage.from('audit-evidence').remove([path]);
        await supabase.from('audit_files').delete().eq('id', id);
        setFiles(prev => prev.filter(f => f.id !== id));
        toast.success("File deleted");
    } catch(e) { toast.error("Delete failed"); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Evidence Locker</CardTitle>
        <CardDescription>Secure ISO/SOC2 compliant storage for audit artifacts.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4">
          <Input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden"/>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>} Upload Evidence
          </Button>
        </div>

        {loading ? <div className="text-center py-8 text-sm text-muted-foreground">Syncing files...</div> :
        <ScrollArea className="h-[350px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8">No files found.</TableCell></TableRow> :
                files.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        <Lock className="w-3 h-3 text-green-600"/> 
                        {f.filename}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(f.size/1024).toFixed(1)} KB</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        {f.upload_date ? formatDistanceToNow(new Date(f.upload_date), { addSuffix: true }) : 'Just now'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(f.storage_path, f.filename)}>
                            <Download className="w-3 h-3"/>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(f.id, f.storage_path)}>
                            <Trash2 className="w-3 h-3"/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>
        }
      </CardContent>
    </Card>
  );
}