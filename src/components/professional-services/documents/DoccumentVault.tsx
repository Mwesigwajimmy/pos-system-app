'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  File as FileIcon, 
  MoreVertical,
  Loader2,
  HardDrive
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Types ---
interface TenantContext { 
    tenantId: string; 
}

interface DocumentItem {
    id: string;
    title: string;
    filename: string;
    url: string;
    content_type: string; // Store mime type
    file_size: number;    // Store size in bytes
    created_at: string;
}

// --- Helpers ---
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <ImageIcon className="w-4 h-4 text-purple-600" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-600" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    return <FileIcon className="w-4 h-4 text-slate-500" />;
};

// --- API Logic ---
async function fetchDocs(tenantId: string): Promise<DocumentItem[]> {
    const db = createClient();
    const { data, error } = await db
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as DocumentItem[];
}

async function uploadDoc({ tenantId, file, title }: { tenantId: string, file: File, title: string }) {
    const db = createClient();
    
    // 1. Sanitize filename and create path
    const fileExt = file.name.split('.').pop();
    const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${tenantId}/${cleanFileName}`;

    // 2. Upload to Supabase Storage
    const { error: uploadError } = await db.storage
        .from('documents-vault')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

    // 3. Get Public URL
    const { data: { publicUrl } } = db.storage
        .from('documents-vault')
        .getPublicUrl(filePath);

    // 4. Insert Metadata to DB
    const { error: insertError } = await db.from('documents').insert([{ 
        tenant_id: tenantId, 
        title: title, 
        url: publicUrl, 
        filename: file.name,
        content_type: file.type,
        file_size: file.size,
        storage_path: filePath // Useful for deletion later
    }]);

    if (insertError) throw new Error(`Database Error: ${insertError.message}`);
    return publicUrl;
}

async function deleteDoc({ id, storagePath }: { id: string, storagePath?: string }) {
    const db = createClient();
    
    // 1. Delete from Storage if path exists
    if (storagePath) {
        const { error: storageError } = await db.storage
            .from('documents-vault')
            .remove([storagePath]);
        
        if (storageError) console.error("Failed to cleanup storage:", storageError);
    }

    // 2. Delete from DB
    const { error } = await db
        .from('documents')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// --- Main Component ---
export default function DocumentVault({ tenant }: { tenant: TenantContext }) {
    const queryClient = useQueryClient();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Query
    const { data: docs, isLoading } = useQuery({ 
        queryKey: ['doc-vault', tenant.tenantId], 
        queryFn: () => fetchDocs(tenant.tenantId) 
    });

    // Upload Mutation
    const uploadMutation = useMutation({
        mutationFn: (file: File) => uploadDoc({ tenantId: tenant.tenantId, file, title }),
        onSuccess: () => {
            toast.success('Document successfully archived');
            setIsUploadOpen(false);
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['doc-vault', tenant.tenantId] });
        },
        onError: (e: Error) => toast.error(e.message || 'Upload failed'),
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: deleteDoc,
        onSuccess: () => {
            toast.success('Document deleted');
            queryClient.invalidateQueries({ queryKey: ['doc-vault', tenant.tenantId] });
        },
        onError: (e: Error) => toast.error("Could not delete document"),
    });

    const resetForm = () => {
        setTitle('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_FILE_SIZE) {
                toast.error("File is too large (Max 10MB)");
                return;
            }
            setSelectedFile(file);
            // Auto-fill title if empty
            if (!title) setTitle(file.name.split('.')[0]);
        }
    };

    const handleUpload = () => {
        if (selectedFile && title) {
            uploadMutation.mutate(selectedFile);
        }
    };

    return (
        <Card className="h-full border-t-4 border-t-slate-800 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-slate-800"/> Document Vault
                    </CardTitle>
                    <CardDescription>Securely store and manage client contracts and files.</CardDescription>
                </div>
                
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 text-white hover:bg-slate-800">
                            <Upload className="w-4 h-4 mr-2" /> Upload Document
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Upload Document</DialogTitle>
                            <DialogDescription>
                                Add a new file to the secure vault. Max size 10MB.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Document Title</Label>
                                <Input 
                                    id="title" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    placeholder="e.g., Service Agreement v2"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="file">File</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        ref={fileInputRef}
                                        id="file" 
                                        type="file" 
                                        className="cursor-pointer" 
                                        onChange={handleFileSelect}
                                    />
                                </div>
                                {selectedFile && (
                                    <p className="text-xs text-muted-foreground">
                                        Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpload} disabled={!selectedFile || !title || uploadMutation.isPending}>
                                {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {uploadMutation.isPending ? "Uploading..." : "Save Document"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent>
                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead>Document Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Size</TableHead>
                                <TableHead className="hidden sm:table-cell">Upload Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : docs && docs.length > 0 ? (
                                docs.map((doc) => (
                                    <TableRow key={doc.id} className="group hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="p-2 bg-slate-100 rounded-md w-fit">
                                                {getFileIcon(doc.content_type || '')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700">{doc.title}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.filename}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">
                                            {formatBytes(doc.file_size || 0)}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-sm text-slate-600">
                                            {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                                                            <Download className="mr-2 h-4 w-4" /> Download
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        className="text-red-600 focus:text-red-600 cursor-pointer"
                                                        onClick={() => deleteMutation.mutate({ id: doc.id, storagePath: (doc as any).storage_path })}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="p-4 bg-slate-50 rounded-full">
                                                <Upload className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <p>No documents found.</p>
                                            <Button variant="link" onClick={() => setIsUploadOpen(true)}>Upload your first file</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}