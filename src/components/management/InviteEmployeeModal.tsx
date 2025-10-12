// This is the updated code for your InviteEmployeeModal component.

'use client';

import { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

type UserRole = 'manager' | 'cashier' | 'accountant' | 'dsr';

export function InviteEmployeeModal({ isOpen, onClose, defaultRole }: { isOpen: boolean; onClose: () => void; defaultRole: UserRole }) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [role, setRole] = useState<UserRole>(defaultRole);

    // We get the business ID of the admin sending the invite.
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
                toast.error("Could not load your user profile to send invite.");
                return null;
            }
            return data;
        },
    });

    // This mutation now calls our new, secure API route.
    const { mutate: inviteEmployee, isPending } = useMutation({
        mutationFn: async () => {
            // This now calls our single, intelligent API endpoint.
            const response = await fetch('/management/api/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    fullName: fullName,
                    role: role,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'An unknown server error occurred.');
            }
            // We use the success message from the API itself.
            return result.message;
        },
        onSuccess: (message) => {
            toast.success(message);
            queryClient.invalidateQueries({ queryKey: ['agentManagementData'] });
            queryClient.invalidateQueries({ queryKey: ['allEmployees'] });
            onClose();
            setFullName(''); setEmail(''); setPhoneNumber('');
        },
        onError: (error) => {
            toast.error(`Failed to Process Request`, { description: error.message });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        inviteEmployee();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite New Team Member</DialogTitle>
                    <DialogDescription>
                        An invitation will be sent to this user, allowing them to join your business with the selected role.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* The form remains unchanged */}
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Jane Doe" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., employee@company.com" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                        <Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g., 0771234567" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Assign Role</Label>
                        <Select onValueChange={(value) => setRole(value as UserRole)} defaultValue={role} required>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select a role for the user..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="cashier">Telecom Agent / Cashier</SelectItem>
                                <SelectItem value="dsr">DSR (Direct Sales Representative)</SelectItem>
                                <SelectItem value="accountant">Accountant</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                        <Button type="submit" disabled={isPending || !profile?.business_id}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Invitation
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}