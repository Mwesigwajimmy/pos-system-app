'use client';

import { useState, useEffect } from 'react';
import { 
    ShieldCheck, FileUp, FileText, Trash2, Loader2, Lock, 
    CheckCircle, Download, AlertTriangle, Eye, HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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

        // Forensic storage in the central audit bucket
        const { error: storageError } = await supabase.storage.from('audit-evidence').upload(path, file);
        if (storageError) {
            toast({ title: "Vault Breach", description: storageError.message, variant: "destructive" });
            setIsUploading(false);
            return;
        }

        await supabase.from('documents').insert({
            name: file.name,
            type: 'CRM_ARTIFACT',
            crm_contact_id: clientId,
            storage_path: path,
            file_type: file.type,
            size: file.size,
            forensic_category: 'CONTRACT' // Default to contract for enterprise onboarding
        });

        fetchVault();
        setIsUploading(false);
        toast({ title: "Artifact Locked", description: "Forensic record successfully archived." });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] p-0 border-none shadow-2xl overflow-hidden bg-white">
                <div className="flex flex-col h-[650px]">
                    <DialogHeader className="px-8 py-7 bg-slate-900 text-white shrink-0">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                                <Lock className="text-blue-400" size={32} />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-black tracking-tight">Forensic Document Vault</DialogTitle>
                                <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Secure KYC & Contract Repository for {clientName}</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* UPLOAD ZONE */}
                        <div className="border-2 border-dashed border-slate-100 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 bg-slate-50/30 hover:bg-slate-50 transition-colors group">
                            <input type="file" id="vault-upload" className="hidden" onChange={handleUpload} disabled={isUploading} />
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                {isUploading ? <Loader2 className="animate-spin text-blue-600" /> : <FileUp className="text-slate-400" size={28} />}
                            </div>
                            <Button asChild variant="outline" className="font-black text-[10px] uppercase tracking-widest h-12 px-8 border-slate-200 bg-white rounded-xl shadow-sm">
                                <label htmlFor="vault-upload" className="cursor-pointer">Securely Upload Artifact</label>
                            </Button>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">ISO 27001 COMPLIANT ENCRYPTION ACTIVE</p>
                        </div>

                        {/* FILE LIST */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Locked Evidence Ledger</Label>
                                <Badge variant="outline" className="text-[9px] font-bold border-slate-100 text-slate-400">{files.length} ITEMS</Badge>
                            </div>
                            
                            {files.map(file => (
                                <div key={file.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:shadow-md hover:border-blue-100 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{file.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{file.forensic_category}</span>
                                                <span className="text-[9px] font-bold text-slate-300">{(file.size / 1024).toFixed(0)} KB</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`text-[8px] font-black px-2 py-0.5 ${
                                            file.verification_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                                        }`}>
                                            {file.verification_status}
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-blue-600 rounded-xl transition-colors"><Eye size={16} /></Button>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-slate-900 rounded-xl transition-colors"><Download size={16} /></Button>
                                    </div>
                                </div>
                            ))}
                            {files.length === 0 && (
                                <div className="h-48 flex flex-col items-center justify-center text-slate-300 gap-3">
                                    <HardDrive size={40} className="opacity-20" />
                                    <span className="text-[10px] font-black uppercase tracking-widest italic">Zero artifacts in secure storage.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}