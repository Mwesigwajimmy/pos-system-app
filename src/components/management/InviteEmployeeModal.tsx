'use client';

import React, { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
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
import { Loader2 } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

export function InviteEmployeeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [role, setRole] = useState<string>('');

    const { data: tenant, isLoading: isTenantLoading } = useTenant();
    const activeBusinessId = tenant?.id;

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

    const resetForm = () => {
        setFullName('');
        setEmail('');
        setPhoneNumber('');
        setRole('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const { mutate: inviteEmployee, isPending } = useMutation({
        mutationFn: async () => {
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

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("The server did not respond correctly. Please try again.");
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'The invitation could not be sent.');
            }
            return result.message;
        },
        onSuccess: (message) => {
            toast.success("Invitation sent", { description: message });
            queryClient.invalidateQueries({ queryKey: ['allEmployees', activeBusinessId] });
            resetForm();
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeBusinessId) {
            toast.error("No business selected");
            return;
        }
        if (!role) {
            toast.error("Select a role");
            return;
        }
        inviteEmployee();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-xl p-0 sm:max-w-md">
                <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left sm:px-6">
                    <DialogTitle className="text-base font-semibold text-slate-900">Invite a team member</DialogTitle>
                    {tenant?.name ? (
                        <p className="mt-0.5 text-sm text-slate-500">They will be added to {tenant.name}</p>
                    ) : null}
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-5 px-5 py-6 sm:px-6">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-xs font-medium text-slate-500">Full name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Samuel Okello"
                                className="h-11 rounded-lg border-slate-200 text-sm"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-medium text-slate-500">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                inputMode="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="h-11 rounded-lg border-slate-200 text-sm"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-medium text-slate-500">Phone number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                inputMode="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="0770000000"
                                className="h-11 rounded-lg border-slate-200 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-xs font-medium text-slate-500">Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger id="role" className="h-11 rounded-lg border-slate-200 text-sm">
                                    <SelectValue placeholder={isLoadingRoles ? "Loading roles" : "Select a role"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-72 rounded-lg">
                                    {allRoles?.length ? (
                                        allRoles.map((r: string) => (
                                            <SelectItem key={r} value={r} className="capitalize">
                                                {r.replace(/_/g, ' ')}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-sm text-slate-400">
                                            {isLoadingRoles ? 'Loading roles' : 'No roles available'}
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                            disabled={isPending}
                            className="h-11 rounded-lg px-4 text-sm font-medium text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || isTenantLoading}
                            className="h-11 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-800"
                        >
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Send invitation
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}