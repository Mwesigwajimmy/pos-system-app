'use client';

/**
 * --- BBU1 AURA VOICE SOVEREIGNTY SETTINGS ---
 * VERSION: v1.0 OMEGA (IDENTITY & TELEPHONY COMMAND)
 * Use: Multi-tenant configuration for Caller ID verification and Aura Tonality.
 * Logic: Linked to tenants and aura_tenant_identities tables.
 */

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
    Mic2, 
    ShieldCheck, 
    PhoneCall, 
    Waves, 
    Bot, 
    Settings2, 
    CheckCircle2, 
    AlertCircle,
    Loader2,
    Save,
    Lock,
    Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AuraVoiceSettings({ businessId }: { businessId: string }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    
    // --- 1. IDENTITY FETCHING ---
    const { data: config, isLoading } = useQuery({
        queryKey: ['aura_voice_config', businessId],
        queryFn: async () => {
            const { data: tenant } = await supabase
                .from('tenants')
                .select('name, aura_caller_id_phone, aura_voice_verified, aura_tone_setting')
                .eq('id', businessId)
                .single();
            
            const { data: identity } = await supabase
                .from('aura_tenant_identities')
                .select('*')
                .eq('tenant_id', businessId)
                .single();

            return { tenant, identity };
        }
    });

    // --- 2. TELEPHONY VERIFICATION MUTATION ---
    const verifyPhone = useMutation({
        mutationFn: async (phone: string) => {
            // WELDING: Triggering the verification handshake via your Master Gateway
            const response = await fetch('/api/telephony/verify-line', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId, phone })
            });
            if (!response.ok) throw new Error("Verification Signal Failed");
            return response.json();
        },
        onSuccess: () => toast.success("Verification call triggered. Please answer your office phone."),
        onError: (err: any) => toast.error(err.message)
    });

    // --- 3. CONFIGURATION SAVE MUTATION ---
    const saveConfig = useMutation({
        mutationFn: async (formData: any) => {
            const { error: tErr } = await supabase
                .from('tenants')
                .update({ 
                    aura_caller_id_phone: formData.phone,
                    aura_tone_setting: formData.tone 
                })
                .eq('id', businessId);
            
            const { error: iErr } = await supabase
                .from('aura_tenant_identities')
                .upsert({ 
                    tenant_id: businessId,
                    assistant_name: formData.name,
                    voice_id: formData.voiceId,
                    custom_greeting: formData.greeting
                });

            if (tErr || iErr) throw new Error("Sovereign Sync Error");
        },
        onSuccess: () => {
            toast.success("Aura Neural Configuration Locked.");
            queryClient.invalidateQueries({ queryKey: ['aura_voice_config'] });
        }
    });

    if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">Saturating Voice Context...</div>;

    return (
        <div className="max-w-5xl mx-auto p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            {/* --- HEADER --- */}
            <div className="flex justify-between items-end pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Bot size={28} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Aura Voice Sovereignty</h1>
                    </div>
                    <p className="text-slate-500 font-medium italic">Configure the physical voice and telephony presence for your business node.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Forensic Protocol Active</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* --- SECTION A: TELEPHONY SWITCHBOARD --- */}
                <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border border-slate-100">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                            <PhoneCall className="text-blue-400" /> Company Line
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Verified Outbound Caller ID</p>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Office Telephone Number</Label>
                                <div className="flex gap-3">
                                    <Input 
                                        defaultValue={config?.tenant?.aura_caller_id_phone}
                                        placeholder="+256..."
                                        className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-mono text-lg font-bold"
                                        id="phone_input"
                                    />
                                    <Button 
                                        onClick={() => {
                                            const val = (document.getElementById('phone_input') as HTMLInputElement).value;
                                            verifyPhone.mutate(val);
                                        }}
                                        disabled={verifyPhone.isPending}
                                        className="h-14 px-8 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold"
                                    >
                                        {verifyPhone.isPending ? <Loader2 className="animate-spin" /> : "Verify"}
                                    </Button>
                                </div>
                            </div>

                            <div className={cn(
                                "p-6 rounded-3xl border flex items-center gap-4 transition-all",
                                config?.tenant?.aura_voice_verified 
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                    : "bg-amber-50 border-amber-100 text-amber-700"
                            )}>
                                {config?.tenant?.aura_voice_verified ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                                <div>
                                    <p className="font-black uppercase text-xs tracking-tight">
                                        {config?.tenant?.aura_voice_verified ? "Sovereign Line Verified" : "Identity Unverified"}
                                    </p>
                                    <p className="text-[11px] font-medium opacity-80 leading-tight mt-0.5">
                                        {config?.tenant?.aura_voice_verified 
                                            ? "Clients will see your company number on their screen when Aura calls." 
                                            : "Aura is currently using the Global Master Line. Verify your line to build trust."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* --- SECTION B: NEURAL TONALITY --- */}
                <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border border-slate-100">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                            <Waves className="text-purple-400" /> Voice DNA
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Aura Personality Settings</p>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Name</Label>
                                <Input 
                                    defaultValue={config?.identity?.assistant_name || "Aura"}
                                    id="aura_name"
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Speech Tone</Label>
                                <Select defaultValue={config?.tenant?.aura_tone_setting || "professional"} id="aura_tone">
                                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Executive / Sharp</SelectItem>
                                        <SelectItem value="warm">Warm / Helpful</SelectItem>
                                        <SelectItem value="direct">Concise / Task-Oriented</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vocal Identity (Voice Engine)</Label>
                            <Select defaultValue={config?.identity?.voice_id || "eleven_labs_prof"}>
                                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                                    <div className="flex items-center gap-3">
                                        <Mic2 size={18} className="text-blue-500" />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="eleven_labs_prof">British Professional (Elite)</SelectItem>
                                    <SelectItem value="google_standard">East African Standard (Clear)</SelectItem>
                                    <SelectItem value="vapi_custom_1">American Corporate (Warm)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- SECTION C: RECEPTIONIST DIRECTIVES --- */}
            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border border-slate-100">
                <CardHeader className="bg-slate-50 border-b p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
                        <Settings2 className="text-blue-600" /> Receptionist Handshake Logic
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Office Greeting</Label>
                        <Textarea 
                            id="aura_greeting"
                            defaultValue={config?.identity?.custom_greeting || `Hello, thank you for calling ${config?.tenant?.name || 'the office'}. I am Aura, your digital concierge. How may I direct your inquiry?`}
                            className="min-h-[120px] rounded-3xl border-slate-100 bg-slate-50 p-6 text-sm font-medium italic text-slate-600 leading-relaxed"
                        />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-2 flex items-center gap-2">
                            <Globe size={10} /> Aura will automatically adjust her accent based on the caller's country code.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-3 opacity-40">
                            <Lock size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">End-to-End Voice Encryption Standard</span>
                        </div>
                        <Button 
                            onClick={() => {
                                const formData = {
                                    phone: (document.getElementById('phone_input') as HTMLInputElement).value,
                                    name: (document.getElementById('aura_name') as HTMLInputElement).value,
                                    tone: (document.querySelector('#aura_tone') as any)?.value,
                                    greeting: (document.getElementById('aura_greeting') as HTMLTextAreaElement).value,
                                    voiceId: 'eleven_labs_prof' // Mock static for now
                                };
                                saveConfig.mutate(formData);
                            }}
                            className="bg-slate-900 hover:bg-black text-white px-12 h-14 rounded-2xl font-bold flex gap-3 shadow-xl"
                        >
                            <Save size={18} /> Lock Neural Configuration
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}