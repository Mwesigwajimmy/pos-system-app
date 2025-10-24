'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Folder, FileText, MoreVertical, Download, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { bytesToSize } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export interface Document {
    id: string;
    name: string;
    type: 'FILE' | 'FOLDER';
    storage_path: string | null;
    size: number | null;
    created_at: string;
}

export function DocumentBrowser({ documents }: { documents: Document[] }) {
    const searchParams = useSearchParams();
    const supabase = createClient();

    const handleDownload = async (filePath: string, fileName: string) => {
        const { data, error } = await supabase.storage.from('documents').download(filePath);
        if (error) {
            alert('Error downloading file: ' + error.message);
            return;
        }
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Size</TableHead><TableHead>Last Modified</TableHead><TableHead className="w-[50px] text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {documents.filter(d => d.type === 'FOLDER').map(folder => (
                        <TableRow key={folder.id}>
                            <TableCell className="font-medium">
                                <Link href={`/professional-services/documents?folder=${folder.id}`} className="flex items-center hover:underline">
                                    <Folder className="mr-2 h-4 w-4" /> {folder.name}
                                </Link>
                            </TableCell>
                            <TableCell>--</TableCell>
                            <TableCell>{new Date(folder.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                    {documents.filter(d => d.type === 'FILE').map(file => (
                         <TableRow key={file.id}>
                             <TableCell className="font-medium flex items-center"><FileText className="mr-2 h-4 w-4" /> {file.name}</TableCell>
                             <TableCell>{bytesToSize(file.size || 0)}</TableCell>
                             <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                             <TableCell className="text-right">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleDownload(file.storage_path!, file.name)}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             </TableCell>
                         </TableRow>
                    ))}
                    {documents.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">This folder is empty.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}