'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export function InviteAgentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');

    const { mutate: inviteAgent, isPending } = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('invite_telecom_agent', {
                p_email: email,
                p_full_name: fullName,
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            toast.success(`Invitation sent to ${email}!`);
            queryClient.invalidateQueries({ queryKey: ['allEmployees'] });
            onClose();
            setEmail('');
            setFullName('');
        },
        onError: (error) => {
            toast.error(`Failed to send invitation: ${error.message}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        inviteAgent();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite New Agent</DialogTitle>
                    <DialogDescription>
                        An invitation email will be sent to this user, allowing them to set their password and join your business as a cashier/agent.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Agent's Full Name</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Agent's Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Invitation
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}