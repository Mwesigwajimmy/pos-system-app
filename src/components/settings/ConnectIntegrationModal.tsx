'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { connectIntegration, FormState } from '@/lib/settings/actions/integrations';
import type { Integration } from '@/app/[locale]/(dashboard)/settings/integrations/page'; // Type import from page

interface ConnectIntegrationModalProps {
    integration: Integration;
}

function SubmitButton({ isConnected }: { isConnected: boolean }) {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : (isConnected ? 'Update Connection' : 'Connect')}</Button>;
}

export function ConnectIntegrationModal({ integration }: ConnectIntegrationModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(connectIntegration, initialState);

    useEffect(() => {
        if (formState.success) {
            toast({ title: "Success!", description: formState.message });
            setIsOpen(false);
            router.refresh();
        } else if (formState.message) {
            toast({ title: "Error", description: formState.message, variant: "destructive" });
        }
    }, [formState, router, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="w-full" variant={integration.is_connected ? "secondary" : "default"}>
                    {integration.is_connected ? "Manage" : "Connect"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Connect to {integration.name}</DialogTitle>
                        <DialogDescription>
                            Enter your API credentials to connect your {integration.name} account.
                        </DialogDescription>
                    </DialogHeader>
                    <input type="hidden" name="integration_id" value={integration.id} />
                    <div className="grid gap-4 py-6">
                        <div className="space-y-1">
                            <Label htmlFor="api_key">API Key</Label>
                            <Input id="api_key" name="api_key" placeholder="Enter your API key" required />
                            {formState.errors?.api_key && <p className="text-sm text-destructive">{formState.errors.api_key[0]}</p>}
                        </div>
                        {/* Add more fields here for other credentials as needed */}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <SubmitButton isConnected={integration.is_connected} />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}