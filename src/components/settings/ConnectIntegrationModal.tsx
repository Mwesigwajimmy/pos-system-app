'use client';

/**
 * --- BBU1 SOVEREIGN CONNECT INTEGRATION MODAL ---
 * VERSION: v3.0 OMEGA (DYNAMIC MULTI-CREDENTIAL & ENVIRONMENT WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Settings
 */

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  Plug, Key, Lock, Building2, Smartphone, 
  ShieldCheck, Globe, Server, Sparkles, Radio,
  CreditCard, MessageSquare, ShieldAlert, Cpu
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { connectIntegration, FormState } from '@/lib/settings/actions/integrations';
import type { Integration } from '@/app/[locale]/(dashboard)/settings/integrations/page';

interface ConnectIntegrationModalProps {
    integration: Integration;
}

function SubmitButton({ isConnected }: { isConnected: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            disabled={pending} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-8 rounded-xl shadow-lg transition-all"
        >
            {pending ? 'Authorizing & Saving...' : (isConnected ? 'Update Connection' : 'Establish Connection')}
        </Button>
    );
}

export function ConnectIntegrationModal({ integration }: ConnectIntegrationModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const initialState: FormState = { success: false, message: '', errors: null };
    const [formState, formAction] = useFormState(connectIntegration, initialState);

    // SERVICE TYPE DYNAMIC DETECTION
    const serviceName = (integration.name || (integration as any).service_name || '').toLowerCase();
    const isPaymentGateway = serviceName.includes('pesapal') || serviceName.includes('momo') || serviceName.includes('airtel') || serviceName.includes('payment') || serviceName.includes('flutterwave');
    const isWhatsAppOrTelephony = serviceName.includes('whatsapp') || serviceName.includes('twilio') || serviceName.includes('sms') || serviceName.includes('aura');
    const isEfrisTax = serviceName.includes('efris') || serviceName.includes('tax') || serviceName.includes('ura');

    useEffect(() => {
        if (formState.success) {
            toast({ title: "Integration Sealed!", description: formState.message });
            setIsOpen(false);
            router.refresh();
        } else if (formState.message) {
            toast({ title: "Handshake Error", description: formState.message, variant: "destructive" });
        }
    }, [formState, router, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="w-full font-bold h-11 rounded-xl" variant={integration.is_connected ? "secondary" : "default"}>
                    {integration.is_connected ? "Manage Connection" : "Connect Gateway"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
                <form action={formAction}>
                    
                    {/* MODAL HEADER */}
                    <DialogHeader className="p-8 bg-slate-900 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
                                    {isPaymentGateway ? <CreditCard size={24} /> :
                                     isWhatsAppOrTelephony ? <MessageSquare size={24} /> :
                                     <Plug size={24} />}
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Connect {integration.name}</DialogTitle>
                                    <DialogDescription className="text-slate-400 text-xs mt-0.5 font-medium">
                                        Enter API credentials to authorize {integration.name} handshake.
                                    </DialogDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="border-blue-400 text-blue-300 text-[9px] uppercase font-mono">
                                {integration.is_connected ? 'CONNECTED' : 'STANDBY'}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <input type="hidden" name="integration_id" value={integration.id} />
                    <input type="hidden" name="service_type" value={integration.name} />

                    <div className="p-8 space-y-5 bg-white">
                        
                        {/* ENVIRONMENT SELECTOR */}
                        <div className="space-y-1.5">
                            <Label htmlFor="environment" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Environment</Label>
                            <Select name="environment" defaultValue="production">
                                <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200 bg-slate-50">
                                    <SelectValue placeholder="Select Environment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="production" className="font-bold text-xs">Live Production Node</SelectItem>
                                    <SelectItem value="sandbox" className="font-bold text-xs text-amber-600">Sandbox / Testing Node</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* PRIMARY API KEY FIELD */}
                        <div className="space-y-1.5">
                            <Label htmlFor="api_key" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {isPaymentGateway ? "API Consumer Key / Primary Key" : "API Access Token / Key *"}
                            </Label>
                            <div className="relative">
                                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    id="api_key" 
                                    name="api_key" 
                                    type="password"
                                    placeholder="Paste API Key or Consumer Key" 
                                    required 
                                    className="pl-10 h-11 rounded-xl font-mono text-xs border-slate-200"
                                />
                            </div>
                            {formState.errors?.api_key && <p className="text-xs text-rose-600 font-bold">{formState.errors.api_key[0]}</p>}
                        </div>

                        {/* CONDITIONAL FIELD: API SECRET / CONSUMER SECRET (FOR PAYMENT GATEWAYS) */}
                        {isPaymentGateway && (
                            <div className="space-y-1.5 animate-in fade-in">
                                <Label htmlFor="api_secret" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Consumer Secret Key *
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="api_secret" 
                                        name="api_secret" 
                                        type="password"
                                        placeholder="Paste Consumer Secret Key" 
                                        className="pl-10 h-11 rounded-xl font-mono text-xs border-slate-200"
                                    />
                                </div>
                            </div>
                        )}

                        {/* CONDITIONAL FIELD: MERCHANT CODE / TILL # (FOR PAYMENT GATEWAYS & MOMO) */}
                        {isPaymentGateway && (
                            <div className="space-y-1.5 animate-in fade-in">
                                <Label htmlFor="merchant_code" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Merchant Till # / IPN Notification Reference
                                </Label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="merchant_code" 
                                        name="merchant_code" 
                                        placeholder="e.g. Till # 689120 or IPN Callback ID" 
                                        className="pl-10 h-11 rounded-xl font-mono text-xs border-slate-200"
                                    />
                                </div>
                            </div>
                        )}

                        {/* CONDITIONAL FIELD: WHATSAPP PHONE NUMBER ID */}
                        {isWhatsAppOrTelephony && (
                            <div className="space-y-1.5 animate-in fade-in">
                                <Label htmlFor="phone_number_id" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    WhatsApp Phone Number ID / App SID
                                </Label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                    <Input 
                                        id="phone_number_id" 
                                        name="phone_number_id" 
                                        placeholder="e.g. 1098239182390" 
                                        className="pl-10 h-11 rounded-xl font-mono text-xs border-slate-200"
                                    />
                                </div>
                            </div>
                        )}

                        {/* SECURITY NOTICE */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                            <ShieldCheck size={18} className="text-blue-600 shrink-0" />
                            <p className="text-[10px] font-medium text-slate-500 leading-normal">
                                Credentials are encrypted using AES-256 in your sovereign database.
                            </p>
                        </div>

                    </div>

                    {/* MODAL FOOTER */}
                    <DialogFooter className="p-6 bg-slate-50 border-t flex items-center justify-between gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-xs uppercase text-slate-400 h-11">
                            Cancel
                        </Button>
                        <SubmitButton isConnected={integration.is_connected} />
                    </DialogFooter>

                </form>
            </DialogContent>
        </Dialog>
    );
}