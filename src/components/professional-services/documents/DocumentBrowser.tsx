'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Folder, FileText, MoreVertical, Download, Trash2, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export interface Document {
    id: string;
    name: string;
    type: 'FILE' | 'FOLDER';
    storage_path: string | null;
    size: number | null;
    created_at: string;
    mime_type?: string;
}

// Utility for file sizes
function bytesToSize(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

export function DocumentBrowser({ documents }: { documents: Document[] }) {
    const supabase = createClient();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDownload = async (filePath: string, fileName: string) => {
        const toastId = toast.loading("Downloading...");
        try {
            const { data, error } = await supabase.storage.from('documents').download(filePath);
            if (error) throw error;
            
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.dismiss(toastId);
            toast.success("Download started");
        } catch (error: any) {
            toast.error('Download failed: ' + error.message, { id: toastId });
        }
    };

    const handleDelete = async (doc: Document) => {
        if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) return;
        
        setDeletingId(doc.id);
        const toastId = toast.loading("Deleting...");
        
        // Note: Real deletion usually happens via Server Action to keep DB and Storage in sync.
        // Assuming a server action or API route handles the actual logic, we emulate success here
        // or call Supabase directly if Row Level Security permits.
        
        try {
            if (doc.type === 'FILE' && doc.storage_path) {
                const { error } = await supabase.storage.from('documents').remove([doc.storage_path]);
                if (error) throw error;
            }
            
            const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id);
            if (dbError) throw dbError;

            toast.success("Item deleted", { id: toastId });
            // In a real app, router.refresh() would be called here
            window.location.reload(); 
        } catch (e: any) {
            toast.error("Delete failed: " + e.message, { id: toastId });
        } finally {
            setDeletingId(null);
        }
    };

    const getIcon = (doc: Document) => {
        if (doc.type === 'FOLDER') return <Folder className="mr-3 h-5 w-5 text-blue-500 fill-blue-100" />;
        if (doc.mime_type?.includes('image')) return <ImageIcon className="mr-3 h-5 w-5 text-purple-500" />;
        if (doc.mime_type?.includes('sheet')) return <FileSpreadsheet className="mr-3 h-5 w-5 text-green-500" />;
        return <FileText className="mr-3 h-5 w-5 text-slate-500" />;
    };

    return (
        <div className="rounded-md border bg-white shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead className="w-[50px] text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {/* Folders First */}
                    {documents.filter(d => d.type === 'FOLDER').map(folder => (
                        <TableRow key={folder.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium py-3">
                                <Link href={`/professional-services/documents?folder=${folder.id}`} className="flex items-center hover:text-blue-600 transition-colors">
                                    {getIcon(folder)} {folder.name}
                                </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">--</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{format(new Date(folder.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-800">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(folder)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}

                    {/* Then Files */}
                    {documents.filter(d => d.type === 'FILE').map(file => (
                         <TableRow key={file.id} className="hover:bg-slate-50/50">
                             <TableCell className="font-medium py-3 flex items-center">
                                {getIcon(file)} {file.name}
                             </TableCell>
                             <TableCell className="font-mono text-xs text-muted-foreground">{bytesToSize(file.size || 0)}</TableCell>
                             <TableCell className="text-muted-foreground text-sm">{format(new Date(file.created_at), 'MMM d, yyyy')}</TableCell>
                             <TableCell className="text-right">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-800">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleDownload(file.storage_path!, file.name)}>
                                            <Download className="mr-2 h-4 w-4" /> Download
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(file)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             </TableCell>
                         </TableRow>
                    ))}
                    
                    {documents.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center">
                                    <Folder className="h-8 w-8 text-slate-300 mb-2" />
                                    <span>This folder is empty.</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}