'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Folder as FolderIcon, File as FileIcon, MoreHorizontal, Download, Trash2, History, Share2, ShieldCheck } from 'lucide-react';
import { LibraryItem } from '@/types/library';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LibraryDataTableProps {
  items: LibraryItem[];
  isLoading: boolean;
  onItemClick: (item: LibraryItem) => void;
  onDownload: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
  
  // New enterprise actions
  onShowVersionHistory: (item: LibraryItem) => void;
  onShare: (item: LibraryItem) => void;
  onManageAccess: (item: LibraryItem) => void;
}

export function LibraryDataTable({
  items,
  isLoading,
  onItemClick,
  onDownload,
  onDelete,
  onShowVersionHistory,
  onShare,
  onManageAccess
}: LibraryDataTableProps) {

  const formatBytes = (bytes: number | null | undefined, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={`skeleton-${i}`}>
        <TableCell><div className="h-5 w-5 bg-muted rounded-full" /></TableCell>
        <TableCell><div className="h-4 w-48 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-32 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-48 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
        <TableCell className="text-right"><div className="h-8 w-8 bg-muted rounded-full" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Modified By</TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? renderSkeleton() : items.map((item) => {
              // --- THIS IS THE FIX ---
              // We derive the version number here for clean rendering below.
              const currentVersion = item.type === 'document' 
                ? item.versions.find(v => v.id === item.current_version_id) 
                : null;
              const versionNumber = currentVersion?.version_number ?? 1;

              return (
                <TableRow key={item.id} onDoubleClick={() => onItemClick(item)} className="cursor-pointer hover:bg-muted/50">
                  <TableCell onClick={() => onItemClick(item)}>
                    {item.type === 'folder' 
                      ? <FolderIcon className="h-5 w-5 text-yellow-500" /> 
                      : <FileIcon className="h-5 w-5 text-blue-500" />}
                  </TableCell>
                  <TableCell onClick={() => onItemClick(item)} className="font-medium flex items-center gap-2">
                    {item.name}
                    {/* Use the derived versionNumber for the condition and display */}
                    {item.type === 'document' && versionNumber > 1 && (
                       <Tooltip>
                          <TooltipTrigger asChild>
                             <Badge variant="outline">v{versionNumber}</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                             <p>This document has {item.versions.length} versions.</p>
                          </TooltipContent>
                       </Tooltip>
                    )}
                  </TableCell>
                  <TableCell onClick={() => onItemClick(item)}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{format(new Date(item.updated_at), 'PPP p')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell onClick={() => onItemClick(item)}>
                    {item.type === 'document' ? formatBytes(item.file_size) : '--'}
                  </TableCell>
                  <TableCell onClick={() => onItemClick(item)}>
                    {item.type === 'document' && item.tags.map(tag => (
                      <Badge key={tag.id} variant="secondary" className="mr-1" style={{ backgroundColor: tag.color + '20', color: tag.color }}>{tag.name}</Badge>
                    ))}
                  </TableCell>
                  <TableCell onClick={() => onItemClick(item)}>{item.last_modified_by}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.type === 'document' && (
                          <>
                            <DropdownMenuItem onClick={() => onDownload(item)}>
                              <Download className="mr-2 h-4 w-4" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onShowVersionHistory(item)}>
                              <History className="mr-2 h-4 w-4" /> Version History
                            </DropdownMenuItem>
                          </>
                        )}
                         <DropdownMenuItem onClick={() => onShare(item)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onManageAccess(item)}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Manage Access
                          </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={() => onDelete(item)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
            {!isLoading && items.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        This folder is empty.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}