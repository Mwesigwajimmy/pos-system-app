'use client';

/**
 * --- BBU1 AURA OUTBOUND DIAL PAD ---
 * VERSION: v1.0 OMEGA (TELEPHONY COMMAND CENTER)
 * Use: Receptionist interface for manual number entry and Aura call triggering.
 * Logic: Linked to 'initiate_telephony_handshake' tool.
 */

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    PhoneCall, 
    Delete, 
    BrainCircuit, 
    Mic2, 
    ShieldCheck, 
    Hash,
    UserPlus,
    Target,
    Zap,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AuraDialPad() {
    const [number, setNumber] = React.useState("");
    const [purpose, setPurpose] = React.useState("meeting_demand");
    const [instruction, setInstruction] = React.useState("");
    const queryClient = useQueryClient();

    const keypad = [
        "1", "2", "3",
        "4", "5", "6",
        "7", "8", "9",
        "*", "0", "#"
    ];

    // THE WELD: Mutation to trigger Aura's voice call
    const initiateHandshake = useMutation({
        mutationFn: async (payload: { phone: string; purpose: string; instruction: string }) => {
            const response = await fetch('/api/telephony/outbound', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Voice Link Failed");
            return response.json();
        },
        onSuccess: () => {
            toast.success("Aura Handshake Initiated: Dialing...");
            queryClient.invalidateQueries({ queryKey: ['aura_call_ledger'] });
            setNumber("");
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleKeyClick = (key: string) => {
        if (number.length < 15) setNumber(prev => prev + key);
    };

    const handleDelete = () => setNumber(prev => prev.slice(0, -1));

    return (
        <Card className="border-none shadow-3xl bg-white rounded-[2.5rem] overflow-hidden w-full max-w-md mx-auto border border-slate-100">
            <CardHeader className="bg-slate-900 text-white p-8 space-y-1">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                        <Mic2 className="text-blue-500 animate-pulse" /> Outbound Gateway
                    </CardTitle>
                    <Badge className="bg-blue-600/20 text-blue-400 border-none text-[9px] font-black">VOICE-SECURE</Badge>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manual Dial & Aura Instruction</p>
            </CardHeader>
            
            <CardContent className="p-8 space-y-6">
                {/* DISPLAY AREA */}
                <div className="space-y-4">
                    <div className="relative">
                        <Input 
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            placeholder="+256..."
                            className="h-20 text-4xl font-black text-center border-none bg-slate-50 rounded-3xl tracking-tighter text-slate-900 focus-visible:ring-0"
                        />
                        {number.length > 0 && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={handleDelete}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"
                            >
                                <Delete size={24} />
                            </Button>
                        )}
                    </div>

                    {/* AURA CONFIGURATION */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Call Purpose</label>
                            <Select value={purpose} onValueChange={setPurpose}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="meeting_demand">Schedule Meeting</SelectItem>
                                    <SelectItem value="callback">Official Callback</SelectItem>
                                    <SelectItem value="invoice_follow_up">Payment Demand</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context Seal</label>
                            <Input 
                                placeholder="e.g. Talk to John" 
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                className="h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* NUMERIC PAD */}
                <div className="grid grid-cols-3 gap-4">
                    {keypad.map((key) => (
                        <Button
                            key={key}
                            variant="outline"
                            onClick={() => handleKeyClick(key)}
                            className="h-16 rounded-2xl border-slate-100 text-xl font-bold text-slate-600 hover:bg-slate-900 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                            {key}
                        </Button>
                    ))}
                </div>

                {/* THE TRIGGER */}
                <Button 
                    disabled={number.length < 5 || initiateHandshake.isPending}
                    onClick={() => initiateHandshake.mutate({ phone: number, purpose, instruction })}
                    className="w-full h-20 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100 flex items-center justify-center gap-4 group"
                >
                    {initiateHandshake.isPending ? (
                        <Loader2 className="animate-spin h-8 w-8" />
                    ) : (
                        <>
                            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <BrainCircuit size={24} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Aura Handshake</p>
                                <p className="text-lg font-black uppercase tracking-tight">Initiate Call</p>
                            </div>
                        </>
                    )}
                </Button>

                <div className="flex items-center justify-center gap-2 opacity-30">
                    <ShieldCheck size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">End-to-End Forensic Encryption</span>
                </div>
            </CardContent>
        </Card>
    );
}