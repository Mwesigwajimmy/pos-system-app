'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Loader2, UserPlus, ShieldCheck, Fingerprint, Building2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTenant } from '@/hooks/useTenant';

/**
 * SOVEREIGN RECRUITMENT MODAL
 * Fully corrected to match your filesystem path structure.
 */
export function InviteEmployeeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    // Form State
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [role, setRole] = useState<string>('');

    // --- 1. CONTEXT RESOLUTION ---
    const { data: tenant, isLoading: isTenantLoading } = useTenant();
    const activeBusinessId = tenant?.id;

    // --- 2. SOVEREIGN ROLE DISCOVERY ---
    const { data: allRoles, isLoading: isLoadingRoles } = useQuery({
        queryKey: ['system_available_roles'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_enum_values', { 
                enum_name: 'user_role' 
            });
            if (error) throw error;
            return data as string[];
        },
        enabled: isOpen,
    });

    // --- 3. RECRUITMENT MUTATION ---
    const { mutate: inviteEmployee, isPending } = useMutation({
        mutationFn: async () => {
            // FIX: Updated path to match your folder structure: management/api/invite
            const response = await fetch('/management/api/invite', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    fullName: fullName.trim(),
                    phoneNumber: phoneNumber.trim(),
                    role: role,
                    businessId: activeBusinessId 
                }),
            });

            // Handle non-JSON responses (like 404s) gracefully
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Sovereign Protocol Breach: Server returned non-JSON response. Check route path.");
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'The recruitment protocol failed.');
            }
            return result.message;
        },
        onSuccess: (message) => {
            toast.success("Invitation Sealed", { description: message });
            queryClient.invalidateQueries({ queryKey: ['allEmployees', activeBusinessId] });
            
            setFullName(''); 
            setEmail(''); 
            setPhoneNumber('');
            setRole('');
            onClose();
        },
        onError: (error: any) => {
            console.error("RECRUITMENT_BREACH:", error);
            toast.error(`Recruitment Breach`, { description: error.message });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeBusinessId) {
            toast.error("Security Breach", { description: "Active business node not resolved." });
            return;
        }
        if (!role) {
            toast.error("Missing Role", { description: "Please assign an authorized access level." });
            return;
        }
        inviteEmployee();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl">
                <DialogHeader className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <UserPlus size={28} />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-slate-900">
                                Recruit Personnel
                            </DialogTitle>
                            <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] uppercase tracking-widest">
                                <Building2 size={12} />
                                Target Node: {tenant?.name || "Resolving..."}
                            </div>
                        </div>
                    </div>
                    <DialogDescription className="font-medium text-slate-500 text-sm leading-relaxed">
                        Dispatch an encrypted activation handshake to onboard new talent into this specific business ledger.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.15em]">
                            Full Identity Name
                        </Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Samuel Okello" className="h-12 font-bold rounded-xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.15em]">
                            Verification Email
                        </Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., identity@bbu1.com" className="h-12 font-bold rounded-xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.15em]">
                            Authorized System Role
                        </Label>
                        <Select onValueChange={(value) => setRole(value)} value={role} required>
                            <SelectTrigger id="role" className="h-12 font-black rounded-xl bg-slate-900 text-white border-none shadow-lg">
                                <SelectValue placeholder={isLoadingRoles ? "Synchronizing Matrix..." : "Assign Access Level..."} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-2xl border-none p-2 bg-white">
                                <ScrollArea className="h-[280px] w-full pr-2">
                                    {allRoles?.map((r: string) => (
                                        <SelectItem key={r} value={r} className="font-bold capitalize py-3 rounded-xl focus:bg-blue-50 focus:text-blue-600 transition-all cursor-pointer m-1">
                                            <div className="flex items-center gap-2">
                                                <Fingerprint size={14} className="opacity-20" />
                                                {r.replace(/_/g, ' ')}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-[9px] font-black text-slate-300 uppercase tracking-widest leading-tight">
                            <ShieldCheck size={20} className="text-emerald-500" /> 
                            Sovereign <br/> Handshake
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button type="button" variant="ghost" onClick={onClose} className="font-bold text-slate-400 hover:text-slate-900" disabled={isPending}>
                                Abort
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 h-12 rounded-xl shadow-xl transition-all active:scale-95 flex-1" disabled={isPending || isTenantLoading}>
                                {isPending ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> DISPATCHING...</span> : "Dispatch Invitation"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}