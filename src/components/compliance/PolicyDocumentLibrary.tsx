'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Download, Trash2, FileText, FileCheck, Search } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PolicyDoc {
  id: string;
  name: string;
  version: string;
  country: string;
  entity: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  size_bytes: number;
}

export default function PolicyDocumentLibrary() {
  const supabase = createClient();
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    try {
        let query = supabase.from('policy_docs').select('*').order('created_at', { ascending: false });
        if (filter) query = query.ilike('name', `%${filter}%`);
        
        const { data, error } = await query;
        if (error) throw error;
        setDocs(data as PolicyDoc[] || []);
    } catch (e) {
        toast.error("Failed to load policies");
    } finally {
        setLoading(false);
    }
  }, [supabase, filter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchDocs, 400);
    return () => clearTimeout(t);
  }, [fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g., 20MB limit)
    if (file.size > 20 * 1024 * 1024) {
        return toast.error("File size exceeds 20MB limit");
    }
    
    setUploading(true);
    try {
        // 1. Upload to 'policies' bucket
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const path = `policies/${fileName}`;

        const { error: uploadErr } = await supabase.storage.from('policies').upload(path, file);
        if (uploadErr) throw uploadErr;

        // 2. Insert record
        const { error: dbErr } = await supabase.from('policy_docs').insert([{
            name: file.name,
            version: '1.0', // In a real app, you'd prompt for this
            country: 'Global',
            entity: 'All',
            storage_path: path,
            uploaded_by: 'Admin', // In real app, use auth context
            size_bytes: file.size
        }]);
        if (dbErr) throw dbErr;

        toast.success("Policy uploaded successfully");
        fetchDocs();
    } catch (err: any) {
        toast.error("Upload failed: " + err.message);
    } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const download = async (path: string) => {
    try {
        const { data, error } = await supabase.storage.from('policies').createSignedUrl(path, 60); // 60 seconds
        if (error) throw error;
        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (e) {
        toast.error("Could not generate download link");
    }
  };

  const remove = async (id: string, path: string) => {
    if(!confirm("Are you sure? This document will be permanently deleted.")) return;
    try {
        await supabase.storage.from('policies').remove([path]);
        await supabase.from('policy_docs').delete().eq('id', id);
        setDocs(prev => prev.filter(d => d.id !== id));
        toast.success("Policy deleted");
    } catch (e) {
        toast.error("Delete failed");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Policy Document Library</CardTitle>
        <CardDescription>Centralized repository for governance & compliance documentation.</CardDescription>
        <div className="flex items-center gap-2 mt-4">
             <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground"/>
                <Input 
                    placeholder="Search policies..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-8"
                />
             </div>
             <Input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden"/>
             <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>} 
                Upload New
             </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {loading ? (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400"/>
            </div>
        ) : (
        <ScrollArea className="h-full border rounded-md">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0">
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.length === 0 ? (
                 <TableRow>
                     <TableCell colSpan={5} className="text-center h-24 text-gray-500">No documents found.</TableCell>
                 </TableRow>
              ) : (
                  docs.map(d => (
                      <TableRow key={d.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 rounded text-blue-600">
                                    <FileText className="w-4 h-4"/>
                                </div>
                                <div>
                                    <p>{d.name}</p>
                                    <Badge variant="outline" className="text-[10px] h-4">v{d.version}</Badge>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col text-sm">
                                <span>{d.entity}</span>
                                <span className="text-xs text-muted-foreground">{d.country}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{formatSize(d.size_bytes || 0)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => download(d.storage_path)}>
                                <Download className="w-3 h-3 mr-1"/> Download
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => remove(d.id, d.storage_path)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-3 h-3"/>
                            </Button>
                        </TableCell>
                      </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}