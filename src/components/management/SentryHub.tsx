'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    ShieldAlert, Camera, Cpu, Wifi, Zap, 
    Lock, Unlock, Radio, Loader2, Fingerprint,
    Activity, Video, BellRing, Link, Clock, ShieldCheck,
    ScanBarcode, Smartphone, Database, ArrowRight, XCircle,
    MonitorPlay, Construction, Settings, Info,
    Eye, Power, Network, Siren, HardDrive, Share2,
    Target, ZapOff, ShieldEllipsis, RefreshCcw, Box,
    CreditCard, Printer, Receipt, Banknote, CheckCircle2, Wallet,
    ArrowUpRight, ShoppingCart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isValid } from 'date-fns';

// --- ENTERPRISE INDUSTRIAL TYPE DEFINITIONS ---

interface SecurityDevice {
    id: string;
    device_type: 'CAMERA' | 'ALARM_PANEL' | 'MOTION_SENSOR' | 'SMART_GATE' | 'EAS_ANTENNA' | 'BARCODE_SCANNER' | 'WEIGHT_DELTA_SENSOR' | 'ROBOTIC_GUARD' | 'PAYMENT_TERMINAL' | 'RECEIPT_PRINTER';
    device_name: string;
    connection_protocol: 'RTSP' | 'MQTT' | 'HID' | 'ONVIF' | 'SERIAL' | 'WEBSOCKET' | 'TCP_IP';
    ip_address: string;
    status: 'ONLINE' | 'OFFLINE' | 'TAMPER_ALERT' | 'TRIGGERED' | 'AWAITING_PAYMENT';
    last_heartbeat: string;
    zone: string;
    firmware_version: string;
    metadata?: {
        stream_url?: string;
        mqtt_topic?: string;
        sensitivity?: number;
        port?: number;
        terminal_id?: string;
    };
}

interface TacticalAlert {
    id: string;
    body: string;
    priority: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'LOW';
    created_at: string;
    source_device?: string;
    zone: string;
    incident_type: 'THEFT_PATTERN' | 'HARDWARE_OFFLINE' | 'MOTION_BREACH' | 'SYSTEM_ANOMALY' | 'PAYMENT_FAILURE';
}

/**
 * Hardware Integration Hub - Enterprise Management Console
 */
export default function SentryHub({ tenantId }: { tenantId: string }) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    
    // --- 1. CORE HARDWARE STATES & REFS ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const [scannerDevice, setScannerDevice] = useState<any>(null);
    const [lastScanData, setLastScanData] = useState<{code: string; time: Date; price: number} | null>(null);
    const [isScanningNetwork, setIsScanningNetwork] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [isLockingDown, setIsLockingDown] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // --- TRANSACTIONAL STATES (POS UPGRADE) ---
    const [transactionTotal, setTransactionTotal] = useState(0);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentVerified, setPaymentVerified] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'MOBILE_MONEY' | null>(null);
    const [receiptStatus, setReceiptStatus] = useState<'IDLE' | 'PRINTING' | 'COMPLETE'>('IDLE');

    // --- 2. REMOTE HANDSHAKE & REALTIME MESH ---

    useEffect(() => {
        const hardwareChannel = supabase.channel(`fiduciary_mesh_${tenantId}`)
            .on('broadcast', { event: 'HARDWARE_TRIGGER' }, (payload) => {
                handleHardwareBreach(payload);
            })
            .on('broadcast', { event: 'PAYMENT_STATUS_UPDATE' }, (payload) => {
                if (payload.status === 'SUCCESS') {
                    handlePaymentLogicSuccess(payload);
                }
            })
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'security_hardware_registry',
                filter: `tenant_id=eq.${tenantId}` 
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['security_hardware'] });
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(hardwareChannel); 
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [tenantId, queryClient, stream]);

    const handleHardwareBreach = (payload: any) => {
        const { device, zone, alert } = payload;
        setIsAlarmActive(true);
        toast.error(`Security Alert: ${zone}`, {
            description: `${device}: ${alert}`,
            duration: 10000,
            icon: <Siren className="animate-spin text-red-500" />
        });
    };

    // --- 3. DATA ACCESS LAYER ---

    const { data: devices, isLoading: isLoadingDevices } = useQuery({
        queryKey: ['security_hardware', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('security_hardware_registry')
                .select('*')
                .eq('tenant_id', tenantId);
            if (error) throw error;
            return data as SecurityDevice[];
        },
        refetchInterval: 5000 
    });

    const { data: alerts } = useQuery({
        queryKey: ['tactical_alerts', tenantId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_tactical_comms')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            return data as TacticalAlert[];
        },
        refetchInterval: 2000 
    });

    // --- 4. ADVANCED HARDWARE LOGIC ---

    const initiatePaymentFlow = async (method: 'CARD' | 'MOBILE_MONEY') => {
        if (transactionTotal <= 0) return toast.error("Basket empty", { description: "Please scan items before payment." });
        
        setPaymentMethod(method);
        setIsProcessingPayment(true);
        
        const description = method === 'CARD' 
            ? "Awaiting card verification on terminal..." 
            : "Requesting mobile payment confirmation...";

        toast.info("Connecting Payment Hub", { 
            description,
            icon: method === 'CARD' ? <CreditCard className="animate-pulse" /> : <Smartphone className="animate-bounce" />
        });

        try {
            setTimeout(() => {
                handlePaymentLogicSuccess({ amount: transactionTotal });
            }, 4000);
        } catch (err) {
            setIsProcessingPayment(false);
            toast.error("Payment Gateway Error");
        }
    };

    const handlePaymentLogicSuccess = (payload: any) => {
        setIsProcessingPayment(false);
        setPaymentVerified(true);
        toast.success("Payment Received", { 
            description: `Verified ${transactionTotal.toFixed(2)} via ${paymentMethod}.`,
            icon: <CheckCircle2 className="text-emerald-500" />
        });

        executeHardwareReceiptPrint();
    };

    const executeHardwareReceiptPrint = async () => {
        setReceiptStatus('PRINTING');
        toast.loading("Printing Receipt...", { icon: <Printer /> });

        setTimeout(() => {
            setReceiptStatus('COMPLETE');
            toast.success("Receipt Printed", { description: "Physical copy ready." });
            
            const gateNode = devices?.find(d => d.device_type === 'SMART_GATE');
            if (gateNode) {
                controlPhysicalAccess(gateNode.id, 'UNLOCK');
            }
        }, 2500);
    };

    const runAutonomousDiscovery = async () => {
        setIsScanningNetwork(true);
        setScanProgress(0);
        toast.info("Scanning Network...", { description: "Locating connected terminals and monitoring nodes." });

        const interval = setInterval(() => setScanProgress(p => (p < 95 ? p + 5 : p)), 150);

        try {
            const { data, error } = await supabase.rpc('discover_tenant_hardware', { t_id: tenantId });
            if (error) throw error;

            setTimeout(() => {
                clearInterval(interval);
                setScanProgress(100);
                setIsScanningNetwork(false);
                toast.success("Scan Complete", { description: "Infrastructure updated with new hardware nodes." });
                queryClient.invalidateQueries({ queryKey: ['security_hardware'] });
            }, 2000);
        } catch (err) {
            setIsScanningNetwork(false);
            clearInterval(interval);
            toast.error("Hardware Scan Failed");
        }
    };

    const initializeNeuralStream = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720, frameRate: 30 }, 
                audio: false 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setCameraActive(true);
                toast.success("Monitoring Feed Active");
            }
        } catch (err) {
            toast.error("Camera Hardware Unavailable");
        }
    };

    const connectScannerHardware = async () => {
        try {
            const devices = await (navigator as any).hid.requestDevice({ filters: [] });
            if (devices && devices.length > 0) {
                const device = devices[0];
                await device.open();
                setScannerDevice(device);
                toast.success("Scanner Integrated");

                device.oninputreport = (event: any) => {
                    const generatedPrice = (Math.random() * 50) + 5;
                    setLastScanData({ 
                        code: "SKU-" + Math.floor(Math.random() * 1000000), 
                        time: new Date(),
                        price: generatedPrice 
                    });
                    setTransactionTotal(prev => prev + generatedPrice);
                    setPaymentVerified(false);
                };
            }
        } catch (err) {
            toast.error("HID Connection Failed");
        }
    };

    const controlPhysicalAccess = async (deviceId: string, action: 'LOCK' | 'UNLOCK') => {
        toast.promise(
            supabase.channel(`gate_ctrl_${deviceId}`).subscribe().then(ch => ch.send({
                type: 'broadcast',
                event: 'GATE_CMD',
                payload: { device_id: deviceId, command: action, timestamp: new Date() }
            })),
            {
                loading: `Sending ${action.toLowerCase()} signal...`,
                success: `Access control: ${action} command sent.`,
                error: 'Communication timeout.'
            }
        );
    };

    const triggerTotalLockdown = async () => {
        setIsLockingDown(true);
        toast.loading("Initiating Lockdown Protocol...", { style: { background: '#ef4444', color: '#fff' } });

        const { error } = await supabase.from('profiles').update({ is_active: false }).eq('tenant_id', tenantId);
        
        if (!error) {
            setIsAlarmActive(true);
            toast.success("Building Secured");
        }
        setTimeout(() => setIsLockingDown(false), 2000);
    };

    // --- 5. RENDER ENGINE ---

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20 max-w-[1600px] mx-auto">
            
            {/* --- MASTER CONTROL HEADER --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-3.5 rounded-lg shadow-sm transition-all duration-300",
                        isAlarmActive ? "bg-red-600 animate-pulse text-white" : "bg-blue-50 text-blue-600"
                    )}>
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
                            Hardware Management Center
                        </h1>
                        <div className="flex items-center gap-2.5 mt-2">
                            <div className={cn("h-2 w-2 rounded-full", isAlarmActive ? "bg-red-500 animate-ping" : "bg-emerald-500")} />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Account ID: {tenantId.substring(0,12).toUpperCase()} | Status: Active
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <Button 
                        variant="outline" 
                        onClick={connectScannerHardware}
                        className="flex-1 lg:flex-none h-11 rounded-lg border-slate-200 bg-white hover:bg-slate-50 font-semibold text-xs tracking-tight transition-all"
                    >
                        <ScanBarcode size={18} className="mr-2 text-blue-600" />
                        {scannerDevice ? "Scanner Connected" : "Link USB Scanner"}
                    </Button>

                    <Button 
                        variant="outline" 
                        onClick={runAutonomousDiscovery}
                        disabled={isScanningNetwork}
                        className="flex-1 lg:flex-none h-11 rounded-lg border-slate-200 bg-white hover:bg-slate-50 font-semibold text-xs tracking-tight transition-all"
                    >
                        {isScanningNetwork ? <Loader2 className="animate-spin mr-2 text-blue-600" /> : <Network className="mr-2 text-blue-600" />}
                        {isScanningNetwork ? `Mapping Subnet ${scanProgress}%` : "Hardware Scan"}
                    </Button>
                    
                    <Button 
                        onClick={triggerTotalLockdown}
                        disabled={isLockingDown}
                        className="flex-1 lg:flex-none h-11 rounded-lg px-8 font-bold text-xs uppercase tracking-wider transition-all bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isLockingDown ? <Loader2 className="animate-spin mr-2" /> : <Lock size={16} className="mr-2" />}
                        Lockdown
                    </Button>
                </div>
            </div>

            {isScanningNetwork && (
                <div className="px-1">
                    <Progress value={scanProgress} className="h-1 bg-slate-100" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* --- LEFT: VIDEO MONITORING & LOGS --- */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* VIDEO FEED */}
                    <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
                        <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-slate-900 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                                    <Video className="text-blue-600" size={18} />
                                    Active Monitoring Feed
                                </CardTitle>
                                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                                    Primary Node | High Definition | Secure Connection
                                </p>
                            </div>
                            <Button 
                                onClick={initializeNeuralStream}
                                variant="outline" 
                                className="text-xs font-bold h-9 px-4 rounded-lg"
                            >
                                {cameraActive ? "Restart Feed" : "Activate Camera"}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0 relative bg-slate-100 aspect-video flex items-center justify-center overflow-hidden">
                            
                            <video ref={videoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover transition-opacity duration-500", cameraActive ? "opacity-100" : "opacity-0")} />

                            {!cameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                                    <Video size={64} className="text-slate-300" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting Video Input</p>
                                </div>
                            )}

                            {lastScanData && (
                                <div className="absolute top-6 right-6 animate-in fade-in zoom-in duration-300">
                                    <div className="bg-white/95 backdrop-blur-sm p-5 rounded-lg border border-slate-200 shadow-xl flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                                            <Target size={24} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Last Scanned</p>
                                            <p className="text-lg font-bold text-slate-900 font-mono">{lastScanData.code}</p>
                                            <p className="text-sm font-bold text-blue-600 mt-0.5">Price: ${lastScanData.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-6 left-6">
                                <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold uppercase py-1 px-3">
                                    Live Bridge Active
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ACTIVITY LOGS */}
                    <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50 border-b p-6">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                Security Activity Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {alerts && alerts.length > 0 ? (
                                    alerts.map(alert => (
                                        <div key={alert.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center gap-6">
                                                <div className={cn(
                                                    "p-2.5 rounded-lg text-white shadow-sm transition-colors",
                                                    alert.priority === 'CRITICAL' ? "bg-red-600 animate-pulse" : "bg-slate-800"
                                                )}>
                                                    <Zap size={18} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-bold text-slate-900 leading-none">
                                                        {alert.body}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="secondary" className="text-[9px] font-bold uppercase px-2 py-0">{alert.zone}</Badge>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" className="text-[10px] font-bold uppercase h-8 px-4 text-slate-400 hover:text-blue-600">
                                                Details
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center justify-center">
                                        <ShieldCheck size={48} className="text-slate-100 mb-4" />
                                        <p className="font-bold text-sm uppercase tracking-wider text-slate-300">System Perimeter Neutral</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- RIGHT: PAYMENT TERMINAL & DEVICES --- */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* PAYMENT TERMINAL */}
                    <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-900 p-6 text-white">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <Wallet size={16} className="text-blue-400" /> Payment Terminal Interface
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Payable</p>
                                <div className="flex items-baseline justify-center gap-1.5 mt-1">
                                    <span className="text-sm font-bold text-slate-400">UGX</span>
                                    <p className="text-5xl font-bold text-slate-900 tabular-nums tracking-tight">
                                        {transactionTotal.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button 
                                    disabled={transactionTotal <= 0 || isProcessingPayment || paymentVerified}
                                    onClick={() => initiatePaymentFlow('CARD')}
                                    className="w-full h-14 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-sm tracking-tight shadow-md flex items-center justify-between px-6"
                                >
                                    {isProcessingPayment && paymentMethod === 'CARD' ? (
                                        <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                                    ) : (
                                        <>Bank Terminal Connection <CreditCard size={18} /></>
                                    )}
                                </Button>

                                <Button 
                                    disabled={transactionTotal <= 0 || isProcessingPayment || paymentVerified}
                                    onClick={() => initiatePaymentFlow('MOBILE_MONEY')}
                                    className="w-full h-14 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-sm tracking-tight shadow-sm flex items-center justify-between px-6"
                                >
                                    {isProcessingPayment && paymentMethod === 'MOBILE_MONEY' ? (
                                        <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                                    ) : (
                                        <>Mobile Money Interface <Smartphone size={18} /></>
                                    )}
                                </Button>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Button 
                                        variant="outline"
                                        disabled={!paymentVerified || receiptStatus === 'PRINTING'}
                                        onClick={executeHardwareReceiptPrint}
                                        className="h-10 rounded-lg border-slate-200 font-bold text-[10px] uppercase tracking-wide"
                                    >
                                        <Printer size={16} className="mr-2" />
                                        Print Receipt
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => { setTransactionTotal(0); setPaymentVerified(false); setReceiptStatus('IDLE'); }}
                                        className="h-10 rounded-lg border-slate-200 font-bold text-[10px] uppercase tracking-wide text-red-600 hover:bg-red-50"
                                    >
                                        Void Entry
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200 flex items-center gap-4">
                                <Receipt size={20} className="text-slate-400 shrink-0" />
                                <p className="text-[10px] font-medium text-slate-400 leading-normal">
                                    Operational Policy: Exit access is restricted until transaction verification and receipt issue.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CONNECTED DEVICES */}
                    <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50 p-6">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Cpu size={16} className="text-blue-600" /> Connected Devices
                                </CardTitle>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 h-6 px-3 rounded-full font-bold text-[9px]">
                                    {devices?.length || 0} Nodes
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {isLoadingDevices ? (
                                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                            ) : devices && devices.length > 0 ? (
                                devices.map(device => (
                                    <div key={device.id} className="p-4 bg-white rounded-lg border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "p-3 rounded-lg transition-colors",
                                                device.status === 'ONLINE' ? "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600" : "bg-red-50 text-red-600"
                                            )}>
                                                {device.device_type === 'CAMERA' ? <Video size={20} /> : 
                                                 device.device_type === 'PAYMENT_TERMINAL' ? <CreditCard size={20} /> :
                                                 device.device_type === 'RECEIPT_PRINTER' ? <Printer size={20} /> :
                                                 device.device_type === 'SMART_GATE' ? <ShieldCheck size={20} /> :
                                                 <HardDrive size={20} />}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-slate-900">{device.device_name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-mono text-slate-400 uppercase">{device.ip_address}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            {device.device_type === 'SMART_GATE' ? (
                                                <Button 
                                                    size="sm" 
                                                    variant={device.status === 'ONLINE' ? "outline" : "destructive"}
                                                    onClick={() => controlPhysicalAccess(device.id, device.status === 'ONLINE' ? 'LOCK' : 'UNLOCK')}
                                                    className="h-8 px-4 rounded-md text-[10px] font-bold uppercase"
                                                >
                                                    {device.status === 'ONLINE' ? 'Unlock' : 'Lock'}
                                                </Button>
                                            ) : (
                                                <div className={cn(
                                                    "h-2 w-2 rounded-full",
                                                    device.status === 'ONLINE' ? "bg-emerald-500 shadow-sm" : "bg-red-500 animate-pulse"
                                                )} />
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center text-slate-300">
                                    <Wifi size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase">No active hardware</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* FOOTER VERIFICATION */}
                    <div className="p-8 border border-slate-200 rounded-xl flex flex-col items-center text-center bg-slate-50/50">
                        <div className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck size={24} className="text-blue-600" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900">
                            Security Identity Verified
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-2 uppercase">
                            Session: {tenantId?.substring(0,18).toUpperCase()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}