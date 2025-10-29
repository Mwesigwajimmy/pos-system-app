'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { inviteAuditorAction, FormState } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Mail, Send } from 'lucide-react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Sending...' : <><Send className="mr-2 h-4 w-4" /> Send Invitation</>}
        </Button>
    );
}

function InviteForm() {
    const initialState: FormState = { success: false, message: '' };
    const [state, formAction] = useFormState(inviteAuditorAction, initialState);
    const formRef = React.useRef<HTMLFormElement>(null);

    React.useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast.success(state.message);
                formRef.current?.reset();
            } else {
                toast.error(state.message);
            }
        }
    }, [state]);

    return (
        <form ref={formRef} action={formAction} className="flex w-full max-w-md items-center space-x-2">
            <div className="relative flex-grow">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" name="email" placeholder="auditor@example.com" required className="pl-9" />
            </div>
            <SubmitButton />
        </form>
    );
}

export function AuditorManagement({ initialInvitations }: { initialInvitations: any[] }) {
    const queryClient = useQueryClient();

    const handleResend = (invitationId: string) => {
        toast.info(`Resending invitation for ID: ${invitationId}... (feature coming soon)`);
    };

    const handleRevoke = (invitationId: string) => {
        toast.warning(`Revoking access for ID: ${invitationId}... (feature coming soon)`);
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-medium">Invite New Auditor</h3>
                <p className="text-sm text-muted-foreground mb-4">The auditor will receive an email with instructions to create a secure, read-only account.</p>
                <InviteForm />
            </div>
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Pending & Active Invitations</h3>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Sent</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialInvitations.length > 0 ? initialInvitations.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={inv.status === 'accepted' ? 'default' : 'secondary'}>
                                            {inv.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{format(new Date(inv.created_at), 'PPP')}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {inv.status === 'pending' && <Button variant="outline" size="sm" onClick={() => handleResend(inv.id)}>Resend</Button>}
                                        <Button variant="destructive" size="sm" onClick={() => handleRevoke(inv.id)}>Revoke</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No auditors have been invited yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}