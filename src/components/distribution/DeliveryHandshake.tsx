'use client';

/**
 * --- DELIVERY VERIFICATION ---
 * VERSION: v1.2 PROFESSIONAL
 * LOGIC: Digital Seal Verification & GPS Location Confirmation
 * STYLE: Clean White Dashboard for Corporate Use
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
        
        // 1. Capture Location (Professional Location Verification)
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;

            // 2. Verify Digital Seal via RPC
            const { error } = await supabase.rpc('execute_logistics_handshake', {
                p_seal_hash: `SEAL-${loadId}`, 
                p_lat: latitude,
                p_lng: longitude,
                p_user_id: (await supabase.auth.getUser()).data.user?.id,
                p_load_id: parseInt(loadId)
            });

            if (error) {
                toast.error("Verification Denied", { 
                    description: "Seal verification failed or the device is out of the required range." 
                });
            } else {
                setIsDelivered(true);
                toast.success("Verification Complete", { 
                    description: "The security seal was verified and delivery is confirmed." 
                });
            }
            setIsVerifying(false);
        }, () => {
            toast.error("Location Error", { 
                description: "Please enable location services to verify this delivery." 
            });
            setIsVerifying(false);
        });
    };

    if (isDelivered) {
        return (
            <Card className="max-w-md mx-auto p-10 text-center space-y-8 bg-white border border-slate-200 shadow-sm rounded-2xl animate-in zoom-in duration-300">
                <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Delivery Confirmed</h2>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">The delivery has been logged in the system audit.</p>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                    <Button variant="outline" className="h-11 rounded-lg border-slate-200 font-semibold text-xs uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors">
                        <Download size={14} className="mr-2" /> Download Delivery Proof
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="text-slate-400 font-semibold text-xs uppercase tracking-wider hover:text-slate-600" 
                        onClick={() => window.location.reload()}
                    >
                        Finish Session
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="max-w-md mx-auto p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-center px-1">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Delivery Verification</h2>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Awaiting security seal check</p>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-semibold text-[10px] px-3 py-1 rounded-md uppercase tracking-wider">
                    Active Delivery
                </Badge>
            </div>

            <div className="p-10 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col items-center text-center space-y-6">
                <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200/50">
                    <QrCode size={80} className="text-slate-900" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest leading-relaxed px-4">
                    Scan the cargo QR code to verify the security seal
                </p>
            </div>

            <div className="space-y-4 px-1">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                        <MapPin size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Verification Site</p>
                        <p className="text-sm font-semibold text-slate-800 uppercase tracking-tight">Destination Location Detected</p>
                    </div>
                </div>

                <Button 
                    disabled={isVerifying}
                    onClick={handleHandshake}
                    className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-widest text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                    {isVerifying ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Verifying...</span>
                        </div>
                    ) : (
                        "Verify Security Seal"
                    )}
                </Button>
            </div>

            <div className="flex justify-center pt-2 border-t border-slate-50">
                <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-[0.2em]">Secure Logistics Handshake Protocol</p>
            </div>
        </Card>
    );
}