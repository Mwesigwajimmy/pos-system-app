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
import { Loader2, UserPlus, ShieldCheck } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

// --- ENTERPRISE TYPES ---
// Role is now a string because it is fetched dynamically from the database enum
export function InviteEmployeeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [role, setRole] = useState<string>('');

    // --- 1. SOVEREIGN ROLE DISCOVERY ---
    // Fetches the entire list of roles (Matatu Driver, Pharmacist, etc.) from the DB
    const { data: allRoles, isLoading: isLoadingRoles } = useQuery({
        queryKey: ['system_available_roles'],
        queryFn: async () => {
            // This calls the helper function we created to read your 'user_role' enum
            const { data, error } = await supabase.rpc('get_enum_values', { 
                enum_name: 'user_role' 
            });
            if (error) throw error;
            return data as string[];
        },
        enabled: isOpen, // Only fetch when modal opens to save resources
    });

    // --- 2. IDENTITY HANDSHAKE ---
    // Get the business context of the inviter
    const { data: profile } = useQuery({
        queryKey: ['userProfileForInvite'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('business_id')
                .eq('id', user.id)
                .single();

            if (error) {
                toast.error("Security Context Failure", { description: "Could not resolve your business ID." });
                return null;
            }
            return data;
        },
    });

    // --- 3. DISPATCH MUTATION ---
    const { mutate: inviteEmployee, isPending } = useMutation({
        mutationFn: async () => {
            // This calls the single intelligent API endpoint
            const response = await fetch('/management/api/invite', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    fullName: fullName.trim(),
                    phoneNumber: phoneNumber.trim(),
                    role: role,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'The recruitment protocol failed.');
            }
            return result.message;
        },
        onSuccess: (message) => {
            toast.success("Invitation Sealed", { description: message });
            // Invalidate queries to refresh staff lists immediately
            queryClient.invalidateQueries({ queryKey: ['agentManagementData'] });
            queryClient.invalidateQueries({ queryKey: ['allEmployees'] });
            
            // Reset and Close
            onClose();
            setFullName(''); 
            setEmail(''); 
            setPhoneNumber('');
            setRole('');
        },
        onError: (error) => {
            toast.error(`Recruitment Breach`, { description: error.message });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!role) {
            toast.error("Missing Role", { description: "Please assign an access level." });
            return;
        }
        inviteEmployee();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl">
                <DialogHeader className="space-y-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                        <UserPlus size={24} />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight uppercase italic">Invite Team Member</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Dispatch a secure activation link to the specified individual to join your sovereign business ledger.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Identity Name</Label>
                        <Input 
                            id="fullName" 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            placeholder="e.g., Samuel Okello" 
                            className="h-12 font-bold rounded-xl border-slate-200"
                            required 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-400 ml-1">Corporate Email Address</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="e.g., employee@company.com" 
                            className="h-12 font-bold rounded-xl border-slate-200"
                            required 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="text-[10px] font-black uppercase text-slate-400 ml-1">Contact Phone (Optional)</Label>
                        <Input 
                            id="phoneNumber" 
                            value={phoneNumber} 
                            onChange={(e) => setPhoneNumber(e.target.value)} 
                            placeholder="e.g., 0771234567" 
                            className="h-12 font-bold rounded-xl border-slate-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-[10px] font-black uppercase text-slate-400 ml-1">Authorized Access Role</Label>
                        <Select onValueChange={(value) => setRole(value)} value={role} required>
                            <SelectTrigger id="role" className="h-12 font-black rounded-xl bg-slate-50 border-slate-200 text-sm">
                                <SelectValue placeholder={isLoadingRoles ? "Synchronizing Roles..." : "Select industry role..."} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl shadow-2xl border-none p-2">
                                <ScrollArea className="h-[300px] w-full">
                                    {allRoles?.map((r: string) => (
                                        <SelectItem 
                                            key={r} 
                                            value={r} 
                                            className="font-bold capitalize py-3 rounded-lg focus:bg-blue-50 focus:text-blue-600 transition-all cursor-pointer"
                                        >
                                            {r.replace(/_/g, ' ')}
                                        </SelectItem>
                                    ))}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-[9px] font-black text-slate-300 uppercase tracking-widest leading-tight">
                            <ShieldCheck size={20} className="text-emerald-500" /> 
                            Neural Handshake <br/> Secure Session
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={onClose} 
                                className="font-bold text-slate-400"
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-slate-900 hover:bg-blue-600 text-white font-black px-10 h-12 rounded-xl shadow-xl transition-all flex-1"
                                disabled={isPending || !profile?.business_id}
                            >
                                {isPending ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> DISPATCHING...</>
                                ) : (
                                    "Send Invitation"
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}