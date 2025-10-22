'use client';

import { useEffect, useState, useTransition } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LibraryItem, Folder, Document } from '@/types/library';
import * as libraryService from '@/services/libraryService';

// Import our new, powerful components
import { FileUpload } from '@/components/library/FileUpload';
import { LibraryDataTable } from '@/components/library/LibraryDataTable';

import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FolderPlus, Home, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

export default function LibraryPage() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
    const [isDataLoading, startTransition] = useTransition();
    const { toast } = useToast();
    
    // Get the businessId from the user's profile
    const { data: userProfile, isLoading: isProfileLoading, isError: isProfileError } = useUserProfile();
    const businessId = userProfile?.business_id;

    // This function is now simplified to just load/refresh the data.
    const loadItems = (folder: Folder | null) => {
        if (!businessId) return;

        startTransition(async () => {
            try {
                const folderId = folder ? folder.id : null;
                const foldersPromise = libraryService.getFolders(businessId, folderId);
                const documentsPromise = libraryService.getDocuments(businessId, folderId);

                const [folders, documents] = await Promise.all([foldersPromise, documentsPromise]);

                const combined: LibraryItem[] = [...folders, ...documents];
                
                setItems(combined.sort((a, b) => a.name.localeCompare(b.name)));
                setCurrentFolder(folder);
            } catch (error: any) {
                toast({ title: "Error loading files", description: error.message, variant: "destructive" });
            }
        });
    };

    // Initial load effect
    useEffect(() => {
        if (businessId && !isProfileLoading) {
            loadItems(null);
            setBreadcrumbs([]);
        }
    }, [businessId, isProfileLoading]);

    const handleItemClick = (item: LibraryItem) => {
        if (item.type === 'folder') {
            setBreadcrumbs(prev => [...prev, item]);
            loadItems(item);
        } else {
            // Future: Open a document preview modal
            toast({ title: "Preview", description: `Opening preview for ${item.name}` });
        }
    };

    const handleBreadcrumbClick = (folder: Folder | null, index: number) => {
        setBreadcrumbs(breadcrumbs.slice(0, index));
        loadItems(folder);
    };

    const handleHomeClick = () => {
        setBreadcrumbs([]);
        loadItems(null);
    };

    // --- Enterprise Action Handlers ---
    // These functions are passed to the data table.
    // They can be built out later to open modals or perform actions.

    const handleDownload = (item: LibraryItem) => {
        if (item.type === 'document') {
            const url = libraryService.getDocumentPublicUrl(item.storage_path);
            window.open(url, '_blank');
        }
    };

    const handleDelete = async (item: LibraryItem) => {
        // Here you would add a confirmation dialog
        try {
            if (item.type === 'document') {
                await libraryService.deleteDocument(item);
                toast({ title: "Success", description: `"${item.name}" deleted successfully.` });
                loadItems(currentFolder); // Refresh the list
            } else {
                // Add folder deletion logic here
                toast({ title: "Info", description: "Folder deletion is not yet implemented." });
            }
        } catch (error: any) {
            toast({ title: "Error Deleting Item", description: error.message, variant: "destructive" });
        }
    };

    const handleShowVersionHistory = (item: LibraryItem) => {
        toast({ title: "Coming Soon", description: `Viewing version history for ${item.name}` });
    };

    const handleShare = (item: LibraryItem) => {
        toast({ title: "Coming Soon", description: `Sharing options for ${item.name}` });
    };

    const handleManageAccess = (item: LibraryItem) => {
        toast({ title: "Coming Soon", description: `Managing access for ${item.name}` });
    };

    // --- Loading and Error State UI ---
    if (isProfileLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (isProfileError || !businessId) {
         return (
            <Alert variant="destructive" className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Business Context Error</AlertTitle>
                <AlertDescription>
                    Could not identify the business for your account. Please log out and try again.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="flex flex-col h-full p-4 md:p-6 space-y-4">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Document Hub</h1>
                <div className="flex gap-2">
                    <Button variant="outline" disabled><FolderPlus className="mr-2 h-4 w-4" /> New Folder</Button>
                </div>
            </header>

            <nav className="flex items-center text-sm text-muted-foreground bg-muted p-2 rounded-md">
                <Home className="h-4 w-4 cursor-pointer hover:text-primary" onClick={handleHomeClick} />
                {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.id} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-1" />
                        <span className="cursor-pointer hover:text-primary" onClick={() => handleBreadcrumbClick(crumb, index + 1)}>
                            {crumb.name}
                        </span>
                    </div>
                ))}
            </nav>

            <div className="flex-grow space-y-4 flex flex-col">
                {/* 
                  The new FileUpload component handles all the complex upload logic internally.
                  We just tell it what to do when an upload finishes (`onUploadComplete`).
                */}
                <FileUpload 
                    onUploadComplete={() => loadItems(currentFolder)} 
                    currentFolderId={currentFolder?.id ?? null}
                />
                
                {/* 
                  The new LibraryDataTable component is passed the new enterprise action handlers.
                */}
                <LibraryDataTable 
                    items={items} 
                    isLoading={isDataLoading}
                    onItemClick={handleItemClick} 
                    onDelete={handleDelete} 
                    onDownload={handleDownload}
                    onShowVersionHistory={handleShowVersionHistory}
                    onShare={handleShare}
                    onManageAccess={handleManageAccess}
                />
            </div>
        </div>
    );
}