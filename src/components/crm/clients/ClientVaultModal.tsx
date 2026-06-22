'use client';

import { useState, useEffect } from 'react';
import { 
    FileUp, 
    FileText, 
    Trash2, 
    Loader2, 
    Lock, 
    CheckCircle, 
    Download, 
    Eye, 
    MoreVertical, 
    Check,
    FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

interface VaultFile {
    id: string;
    name: string;
    storage_path: string;
    file_type: string;
    size: number;
    forensic_category: string;
    verification_status: string;
    created_at: string;
}

export function ClientVaultModal({ isOpen, onOpenChange, clientId, clientName }: { isOpen: boolean, onOpenChange: (open: boolean) => void, clientId: string, clientName: string }) {
    const supabase = createClient();
    const { toast } = useToast();
    const [files, setFiles] = useState<VaultFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const fetchVault = async () => {
        const { data } = await supabase.from('documents')
            .select('*')
            .eq('crm_contact_id', clientId)
            .order('created_at', { ascending: false });
        if (data) setFiles(data);
    };

    useEffect(() => { if (isOpen) fetchVault(); }, [isOpen]);

    const handleFileAction = async (path: string, action: 'view' | 'download', filename: string) => {
        const { data, error } = await supabase.storage
            .from('audit-evidence')
            .createSignedUrl(path, 60);

        if (error) {
            toast({ title: "Access Denied", description: "Unable to authorize file access.", variant: "destructive" });
            return;
        }

        if (action === 'view') {
            window.open(data.signedUrl, '_blank');
        } else {
            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.download = filename;
            link.click();
        }
    };

    const handleVerify = async (fileId: string) => {
        setIsProcessing(fileId);
        const { error } = await supabase.from('documents')
            .update({ verification_status: 'VERIFIED' })
            .eq('id', fileId);

        if (error) toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        else {
            toast({ title: "Document Verified", description: "The status has been updated successfully." });
            fetchVault();
        }
        setIsProcessing(null);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setIsUploading(true);
        const file = e.target.files[0];
        const path = `crm-vault/${clientId}/${Date.now()}-${file.name}`;

        const { error: storageError } = await supabase.storage.from('audit-evidence').upload(path, file);
        if (storageError) {
            toast({ title: "Upload Failed", description: storageError.message, variant: "destructive" });
            setIsUploading(false);
            return;
        }

        await supabase.from('documents').insert({
            name: file.name,
            type: 'FILE', 
            crm_contact_id: clientId,
            storage_path: path,
            file_type: file.type,
            size: file.size,
            forensic_category: 'DOCUMENT'
        });

        fetchVault();
        setIsUploading(false);
        toast({ title: "Upload Complete", description: "The file has been added to the customer documents." });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] w-[95vw] p-0 border border-slate-200 shadow-2xl overflow-hidden bg-white rounded-xl outline-none">
                <div className="flex flex-col max-h-[85vh]">
                    
                    {/* CLEAN PROFESSIONAL HEADER */}
                    <DialogHeader className="px-8 py-6 border-b border-slate-100 bg-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                                <Lock className="text-blue-600" size={20} />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Customer Document Vault</DialogTitle>
                                <DialogDescription className="text-slate-500 text-xs font-medium">Managing secure files for {clientName}</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        
                        {/* UPLOAD SECTION */}
                        <div className="border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400 transition-all group cursor-pointer">
                            <input type="file" id="vault-upload" className="hidden" onChange={handleUpload} disabled={isUploading} />
                            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 group-hover:scale-105 transition-transform">
                                {isUploading ? <Loader2 className="animate-spin text-blue-600" size={20} /> : <FileUp className="text-slate-500 group-hover:text-blue-600" size={24} />}
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm font-semibold text-slate-700">Upload Documents</p>
                                <p className="text-xs text-slate-500">Drag and drop or click to browse files</p>
                            </div>
                            <Button asChild variant="outline" size="sm" className="mt-2 font-semibold h-9 px-6 border-slate-300 text-slate-700 hover:bg-white hover:text-blue-600 transition-all">
                                <label htmlFor="vault-upload" className="cursor-pointer">Browse Files</label>
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Stored Documents</Label>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold">{files.length} Files</Badge>
                            </div>
                            
                            {files.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2 border border-slate-100 rounded-xl border-dashed">
                                    <FolderOpen size={32} className="opacity-20" />
                                    <p className="text-sm font-medium">No documents stored in this vault.</p>
                                </div>
                            ) : (
                                files.map(file => (
                                    <div key={file.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                                                <FileText size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{file.name}</span>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{file.forensic_category}</span>
                                                    <span className="text-[10px] font-semibold text-slate-500">{(file.size / 1024).toFixed(0)} KB</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <Badge className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                                file.verification_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                                            }`} variant="outline">
                                                {file.verification_status}
                                            </Badge>
                                            
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-lg">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-xl border-slate-200 p-1">
                                                    <DropdownMenuItem onClick={() => handleFileAction(file.storage_path, 'view', file.name)} className="text-xs font-semibold p-2.5 rounded-md cursor-pointer flex items-center gap-2">
                                                        <Eye size={14} className="text-slate-500" /> View Document
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleFileAction(file.storage_path, 'download', file.name)} className="text-xs font-semibold p-2.5 rounded-md cursor-pointer flex items-center gap-2">
                                                        <Download size={14} className="text-slate-500" /> Download File
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {file.verification_status !== 'VERIFIED' && (
                                                        <DropdownMenuItem onClick={() => handleVerify(file.id)} className="text-xs font-bold p-2.5 rounded-md text-emerald-600 hover:bg-emerald-50 cursor-pointer flex items-center gap-2">
                                                            {isProcessing === file.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Mark Verified
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem className="text-xs font-bold p-2.5 rounded-md text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-2">
                                                        <Trash2 size={14} /> Remove Permanently
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                        <Button 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)} 
                            className="text-xs font-bold text-slate-500 hover:text-slate-900"
                        >
                            Close Repository
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}