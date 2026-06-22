'use client';

import { useState, useEffect } from 'react';
import { 
    ShieldCheck, FileUp, FileText, Trash2, Loader2, Lock, 
    CheckCircle, Download, Eye, HardDrive,
    MoreVertical, ShieldAlert, X
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

    const fetchVault = async () => {
        const { data } = await supabase.from('documents')
            .select('*')
            .eq('crm_contact_id', clientId)
            .order('created_at', { ascending: false });
        if (data) setFiles(data);
    };

    useEffect(() => { if (isOpen) fetchVault(); }, [isOpen]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setIsUploading(true);
        const file = e.target.files[0];
        const path = `crm-vault/${clientId}/${Date.now()}-${file.name}`;

        const { error: storageError } = await supabase.storage.from('audit-evidence').upload(path, file);
        if (storageError) {
            toast({ title: "Storage Failure", description: storageError.message, variant: "destructive" });
            setIsUploading(false);
            return;
        }

        /**
         * 🛡️ AUDIT-ALIGNED INSERT:
         * Using 'FILE' to satisfy the documents_type_check constraint.
         */
        const { error: dbError } = await supabase.from('documents').insert({
            name: file.name,
            type: 'FILE', 
            crm_contact_id: clientId,
            storage_path: path,
            file_type: file.type,
            size: file.size,
            forensic_category: 'CONTRACT'
        });

        if (dbError) {
            toast({ title: "Database Rejection", description: dbError.message, variant: "destructive" });
        } else {
            fetchVault();
            toast({ title: "Artifact Locked", description: "Forensic record successfully archived." });
        }
        
        setIsUploading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {/* Centered Professional Container */}
            <DialogContent className="sm:max-w-[700px] w-[90vw] p-0 border-none shadow-2xl overflow-hidden bg-white rounded-2xl outline-none">
                <div className="flex flex-col max-h-[85vh]">
                    
                    {/* Enterprise Header */}
                    <DialogHeader className="px-8 py-7 bg-slate-900 text-white shrink-0">
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-inner">
                                <Lock className="text-blue-400" size={26} />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Forensic Vault</DialogTitle>
                                <DialogDescription className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                    Secure KYC & Contract Repository for {clientName}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        
                        {/* Upload Zone with Blue Pulse Hover */}
                        <div className="border-2 border-dashed border-slate-100 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 bg-slate-50/40 hover:border-blue-400 hover:bg-blue-50/30 transition-all group cursor-pointer">
                            <input type="file" id="vault-upload" className="hidden" onChange={handleUpload} disabled={isUploading} />
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-50 group-hover:scale-110 transition-transform">
                                {isUploading ? <Loader2 className="animate-spin text-blue-600" size={28} /> : <FileUp className="text-slate-400 group-hover:text-blue-600" size={32} />}
                            </div>
                            <Button asChild variant="outline" className="font-black text-[11px] uppercase tracking-widest h-12 px-10 border-slate-200 bg-white rounded-xl shadow-sm group-hover:border-blue-600 group-hover:text-blue-600 transition-all">
                                <label htmlFor="vault-upload" className="cursor-pointer">Securely Upload Artifact</label>
                            </Button>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Supports PDF, PNG, JPG</p>
                        </div>

                        {/* Artifact Ledger */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Locked Evidence ledger</Label>
                                <Badge variant="outline" className="text-[10px] font-black border-slate-100 text-slate-400 uppercase">{files.length} Artifacts</Badge>
                            </div>
                            
                            {files.map(file => (
                                <div key={file.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:shadow-xl hover:border-blue-500/50 transition-all group cursor-default">
                                    <div className="flex items-center gap-5">
                                        <div className="h-11 w-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                                            <FileText size={22} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{file.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0 border-none uppercase tracking-tighter">{file.forensic_category}</Badge>
                                                <span className="text-[9px] font-black text-slate-300 uppercase">{(file.size / 1024).toFixed(0)} KB</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <Badge className={`text-[9px] font-black px-3 py-0.5 uppercase rounded-full shadow-sm ${
                                            file.verification_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                                        }`}>
                                            {file.verification_status}
                                        </Badge>
                                        
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                                                    <MoreVertical size={18} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-52 font-black border-slate-100 shadow-2xl p-2">
                                                <DropdownMenuItem className="text-[11px] uppercase p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3"><Eye size={16} className="text-blue-500" /> View Artifact</DropdownMenuItem>
                                                <DropdownMenuItem className="text-[11px] uppercase p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3"><Download size={16} className="text-blue-500" /> Download</DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-50" />
                                                <DropdownMenuItem className="text-[11px] uppercase p-3 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer transition-colors flex items-center gap-3"><Trash2 size={16} /> Delete Permanently</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                            
                            {files.length === 0 && (
                                <div className="h-48 flex flex-col items-center justify-center text-slate-200 gap-3 border-2 border-dashed border-slate-50 rounded-3xl">
                                    <HardDrive size={48} className="opacity-10" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Vault Empty</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-8 py-6 bg-slate-50 border-t flex justify-end shrink-0">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black text-[11px] uppercase text-slate-400 tracking-widest hover:text-red-500 transition-colors">Close Vault Access</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}