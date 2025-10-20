// src/components/migration/AppConnectionManager.tsx
'use client';

import React, { useState, memo, FormEvent } from 'react'; // Added FormEvent
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm, UseFormReturn } from 'react-hook-form'; // Added UseFormReturn
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Power, PowerOff, LayoutGrid, Info } from 'lucide-react';

// --- 1. Type Definitions & Main Hook ---

type AppInstallation = { is_connected: boolean; settings: Record<string, any> | null };
export type AppData = {
  id: string;
  name: string;
  category: string;
  description: string;
  logo_url: string | null;
  setup_instructions: string | null;
  app_installations: AppInstallation[] | AppInstallation | null;
};

const settingsSchema = z.object({
  api_key: z.string().min(10, { message: "API Key must be at least 10 characters long." }),
});
type SettingsFormInput = z.infer<typeof settingsSchema>;

const useAppConnection = (app: AppData) => {
  const router = useRouter();
  const supabase = createClient();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  const installation = Array.isArray(app.app_installations) ? app.app_installations[0] : app.app_installations;
  const isConnected = installation?.is_connected ?? false;
  const currentSettings = installation?.settings ?? {};

  const form = useForm<SettingsFormInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { api_key: currentSettings.api_key || '' },
  });

  const { mutate: connectApp, isPending: isConnecting } = useMutation({
    mutationFn: async (settings: SettingsFormInput) => {
      const { error } = await supabase.rpc('connect_app', {
        p_app_id: app.id,
        p_settings: settings,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(`${app.name} connected successfully!`);
      router.refresh();
    },
    onError: (err) => toast.error(`Connection failed: ${err.message}`),
  });

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    const toastId = toast.loading(`Disconnecting ${app.name}...`);
    const { error } = await supabase.rpc('disconnect_app', { p_app_id: app.id });

    if (error) {
      toast.error(`Failed to disconnect: ${error.message}`, { id: toastId });
    } else {
      toast.success(`${app.name} disconnected successfully.`, { id: toastId });
      router.refresh();
    }
    setIsDisconnecting(false);
  };

  return {
    isConnected,
    isConnecting,
    isDisconnecting,
    form,
    currentSettings,
    // CORRECTED: Wrap the `connectApp` mutation in an arrow function.
    // This creates a valid SubmitHandler that `handleSubmit` can call.
    // It correctly passes only the form data to the mutation function.
    onSubmit: form.handleSubmit((formData) => connectApp(formData)),
    handleDisconnect,
  };
};


// --- 2. UI Sub-components ---

const AppHeader = memo(({ app }: { app: AppData }) => (
  <header className="flex items-center gap-6">
    {app.logo_url ? (
      <Image src={app.logo_url} alt={`${app.name} Logo`} width={80} height={80} className="rounded-2xl border p-2" />
    ) : (
      <div className="h-20 w-20 rounded-2xl border bg-muted flex items-center justify-center">
          <LayoutGrid className="h-10 w-10 text-muted-foreground" />
      </div>
    )}
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
      <p className="text-muted-foreground mt-1 text-lg">{app.description}</p>
    </div>
  </header>
));
AppHeader.displayName = 'AppHeader';

// CORRECTED: Improved the type for the onSubmit prop for better type safety.
const SettingsForm = memo(({ onSubmit, isConnecting, form }: { onSubmit: (e: FormEvent) => void; isConnecting: boolean; form: UseFormReturn<SettingsFormInput>; }) => (
  <Form {...form}>
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField
        control={form.control}
        name="api_key"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl><Input placeholder="Enter your API Key from the service" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit" disabled={isConnecting}>
        {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Power className="mr-2 h-4 w-4" /> Connect
      </Button>
    </form>
  </Form>
));
SettingsForm.displayName = 'SettingsForm';

// Using a type for the props of the connection card for better readability
type ConnectionCardProps = ReturnType<typeof useAppConnection> & { app: AppData };

const ConnectionCard = memo(({ app, isConnected, isConnecting, isDisconnecting, form, currentSettings, onSubmit, handleDisconnect }: ConnectionCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        Integration Status
        <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700" : ""}>
          {isConnected ? <><CheckCircle className="mr-2 h-4 w-4"/>Connected</> : 'Not Connected'}
        </Badge>
      </CardTitle>
      <CardDescription>Manage your connection to {app.name}.</CardDescription>
    </CardHeader>
    <CardContent>
      {isConnected ? (
        <div className="space-y-4">
          <Alert variant="default" className="border-green-300 dark:border-green-700">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Connection Active</AlertTitle>
            <AlertDescription>You are successfully connected to {app.name}.</AlertDescription>
          </Alert>
          {currentSettings.api_key && (
            <div>
                <FormLabel>API Key</FormLabel>
                <p className="text-sm font-mono p-2 border rounded-md bg-muted text-muted-foreground">
                    {`••••••••••••${currentSettings.api_key.slice(-4)}`}
                </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {app.setup_instructions && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Setup Instructions</AlertTitle>
                <AlertDescription>{app.setup_instructions}</AlertDescription>
            </Alert>
          )}
          <SettingsForm onSubmit={onSubmit} isConnecting={isConnecting} form={form} />
        </div>
      )}
    </CardContent>
    {isConnected && (
      <CardFooter className="border-t pt-4">
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDisconnecting}>
                    {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PowerOff className="mr-2 h-4 w-4" />}
                    Disconnect
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Disconnecting {app.name} will stop any data synchronization. You can reconnect at any time.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Confirm Disconnect</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    )}
  </Card>
));
ConnectionCard.displayName = 'ConnectionCard';


// --- 3. Main Manager Component ---

export default function AppConnectionManager({ app }: { app: AppData }) {
  const connection = useAppConnection(app);
  
  return (
    <div className="space-y-8">
      <AppHeader app={app} />
      <ConnectionCard app={app} {...connection} />
    </div>
  );
}