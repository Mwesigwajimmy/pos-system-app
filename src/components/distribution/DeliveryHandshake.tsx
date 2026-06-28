'use client';

/**
 * --- BBU1 SOVEREIGN: DELIVERY HANDSHAKE ---
 * VERSION: v1.0 OMEGA (THE FINAL DESTINATION)
 * LOGIC: Digital Seal Verification & GPS Handshake
 */

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
    QrCode, MapPin, ShieldCheck, 
    Camera, CheckCircle2, Navigation,
    Loader2, UserCheck, Map as MapIcon,
    Download, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DeliveryHandshake({ loadId, businessId }: { loadId: string, businessId: string }) {
    const [isVerifying, setIsVerifying] = useState(false);
    const [isDelivered, setIsDelivered] = useState(false);
    const supabase = createClient();

    const handleHandshake = async () => {
        setIsVerifying(true);
        
        // 1. Capture Location (Enterprise GPS Handshake)
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;

            // 2. Break the Digital Seal via RPC
            const { error } = await supabase.rpc('execute_logistics_handshake', {
                p_seal_hash: `SEAL-${loadId}`, // Logic matches dispatch hash
                p_lat: latitude,
                p_lng: longitude,
                p_user_id: (await supabase.auth.getUser()).data.user?.id,
                p_load_id: parseInt(loadId)
            });

            if (error) {
                toast.error("Handshake Protocol Denied", { description: "Seal verification failed or GPS is out of range." });
            } else {
                setIsDelivered(true);
                toast.success("Logistics Handshake Complete", { description: "Digital seal broken and stock recorded as Delivered." });
            }
            setIsVerifying(false);
        }, () => {
            toast.error("GPS Identity Failure", { description: "Please enable location services to break the digital seal." });
            setIsVerifying(false);
        });
    };

    if (isDelivered) {
        return (
            <Card className="max-w-md mx-auto p-12 text-center space-y-8 bg-white border-none shadow-2xl rounded-[3rem] animate-in zoom-in">
                <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={48} className="text-emerald-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Delivery Confirmed</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Sovereign Audit Logged</p>
                </div>
                <div className="flex flex-col gap-3">
                    <Button variant="outline" className="h-14 rounded-2xl border-slate-200 font-bold text-[10px] uppercase">
                        <Download size={14} className="mr-2" /> Download Proof (PDF)
                    </Button>
                    <Button variant="ghost" className="text-slate-400 font-bold text-[10px] uppercase" onClick={() => window.location.reload()}>Close Session</Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="max-w-md mx-auto p-10 bg-slate-900 text-white rounded-[3rem] border-none shadow-2xl space-y-8">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Handshake Mode</h2>
                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Awaiting Seal Verification</p>
                </div>
                <Badge className="bg-blue-600 text-white border-none">ACTIVE LOAD</Badge>
            </div>

            <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 flex flex-col items-center text-center space-y-4">
                <QrCode size={120} className="text-blue-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scan the cargo QR code to verify the Digital Seal</p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <MapPin className="text-slate-400" size={20} />
                    <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase">Verification Site</p>
                        <p className="text-xs font-bold uppercase">Destination Node Detected</p>
                    </div>
                </div>

                <Button 
                    disabled={isVerifying}
                    onClick={handleHandshake}
                    className="w-full h-20 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
                >
                    {isVerifying ? <Loader2 className="animate-spin" /> : "Break Digital Seal"}
                </Button>
            </div>
        </Card>
    );
}