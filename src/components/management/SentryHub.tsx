'use client';

/**
 * --- BBU1 SOVEREIGN HARDWARE MANAGEMENT CENTER ---
 * VERSION: v4.8 OMEGA (SMART LOCKDOWN & WIRELESS SCANNER MESH)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Logistics
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
    ShieldAlert, Camera, Cpu, Wifi, Zap, 
    Lock, Unlock, Radio, Loader2, Fingerprint,
    Activity, Video, BellRing, Link, Clock, ShieldCheck,
    ScanBarcode, Smartphone, Database, ArrowRight, XCircle,
    MonitorPlay, Construction, Settings, Info,
    Eye, Power, Network, Siren, HardDrive, Share2,
    Target, ZapOff, ShieldEllipsis, RefreshCcw, Box,
    CreditCard, Printer, Receipt, Banknote, CheckCircle2, Wallet,
    ArrowUpRight, ShoppingCart, SwitchCamera, Sparkles, Barcode
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

import { DeepHardwareBridge } from '@/lib/hardware/DeepHardwareBridge';
import { DeepAudioEngine } from '@/lib/hardware/DeepAudioEngine';
import ProductManagementConsole from '@/components/inventory/AddProductDialog';

interface SecurityDevice {
    id: string;
    device_type: 'CAMERA' | 'ALARM_PANEL' | 'MOTION_SENSOR' | 'SMART_GATE' | 'EAS_ANTENNA' | 'BARCODE_SCANNER' | 'WEIGHT_DELTA_SENSOR' | 'ROBOTIC_GUARD' | 'PAYMENT_TERMINAL' | 'RECEIPT_PRINTER';
    device_name: string;
    connection_protocol: 'RTSP' | 'MQTT' | 'HID' | 'ONVIF' | 'SERIAL' | 'WEBSOCKET' | 'TCP_IP' | 'BLUETOOTH';
    ip_address: string;
    status: 'ONLINE' | 'OFFLINE' | 'TAMPER_ALERT' | 'TRIGGERED' | 'AWAITING_PAYMENT';
    last_heartbeat: string;
    zone: string;
    firmware_version: string;
    bluetooth_device_id?: string;
    serial_com_port?: string;
    metadata?: any;
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

interface CameraDeviceOption {
    id: string;
    label: string;
}

interface ScanBridgePacket {
    barcode: string;
    name: string;
    price?: number;
    costPrice?: number;
    isGlobal: boolean;
}

const supabase = createClient();

export default function SentryHub({ tenantId, categories = [] }: { tenantId: string; categories?: any[] }) {
    const queryClient = useQueryClient();
    
    // --- HARDWARE STATES ---
    const [scannerDevice, setScannerDevice] = useState<any>(null);
    const [lastScanData, setLastScanData] = useState<{code: string; time: Date; price: number} | null>(null);
    const [isScanningNetwork, setIsScanningNetwork] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    
    // LOCKDOWN STATE
    const [isLockingDown, setIsLockingDown] = useState(false);
    const [isFacilityLocked, setIsFacilityLocked] = useState(false);

    // --- CAMERA ENGINE STATES ---
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [availableCameras, setAvailableCameras] = useState<CameraDeviceOption[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // --- CAMERA-TO-ONBOARD BRIDGE STATE ---
    const [scanBridgeData, setScanBridgeData] = useState<ScanBridgePacket | null>(null);

    // --- TRANSACTION & PAYMENT TERMINAL STATES ---
    const [transactionTotal, setTransactionTotal] = useState(0);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentVerified, setPaymentVerified] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'MOBILE_MONEY' | null>(null);
    const [receiptStatus, setReceiptStatus] = useState<'IDLE' | 'PRINTING' | 'COMPLETE'>('IDLE');

    // ====================================================================
    // REALTIME HARDWARE MESH & WEBSOCKET BROADCAST LISTENER
    // ====================================================================
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

        // DEEP USB/HID AUTO-DISCOVERY LISTENER
        if ('hid' in navigator) {
            (navigator as any).hid.addEventListener('connect', ({ device }: any) => {
                toast.info(`USB Hardware Connected: ${device.productName || 'Device'}`, { icon: <Cpu /> });
                syncDeviceToRegistry(device, 'HID');
            });
        }

        return () => { 
            supabase.removeChannel(hardwareChannel); 
            if (scannerRef.current) stopCamera();
        };
    }, [tenantId, queryClient]);

    const handleHardwareBreach = (payload: any) => {
        const { device, zone, alert } = payload;
        setIsAlarmActive(true);
        toast.error(`Security Alert: ${zone}`, {
            description: `${device}: ${alert}`,
            duration: 10000,
            icon: <Siren className="animate-spin text-red-500" />
        });
    };

    // DATA ACCESS LAYER
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

    // ====================================================================
    // SMART ADAPTIVE CAMERA SCANNER PROTOCOL
    // ====================================================================
    const startCamera = async () => {
        setIsCameraActive(true);
        const html5QrCode = new Html5Qrcode("bbu1-neural-view");
        scannerRef.current = html5QrCode;

        const config = { 
            fps: 20, 
            qrbox: { width: 280, height: 160 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.ITF
            ],
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        };

        const onScanSuccess = (decodedText: string) => {
            console.log("📷 BARCODE DETECTED VIA CAMERA:", decodedText);
            html5QrCode.pause();
            processHardwareScan(decodedText, 'Smartphone Camera Node');
        };

        try {
            const devicesList = await Html5Qrcode.getCameras();
            
            if (devicesList && devicesList.length > 0) {
                setAvailableCameras(devicesList.map(d => ({ 
                    id: d.id, 
                    label: d.label || `Camera ${d.id.substring(0, 5)}` 
                })));

                let targetCameraId = selectedCameraId;
                if (!targetCameraId) {
                    const backCamera = devicesList.find(d => {
                        const lbl = d.label.toLowerCase();
                        return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('main');
                    });
                    targetCameraId = backCamera ? backCamera.id : devicesList[0].id;
                    setSelectedCameraId(targetCameraId);
                }

                // TIER 1
                try {
                    await html5QrCode.start(targetCameraId, config, onScanSuccess, () => {});
                    return;
                } catch (e) { console.warn("Tier 1 camera start failed, attempting Tier 2 fallback...", e); }
            }

            // TIER 2
            try {
                await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
                return;
            } catch (e) { console.warn("Tier 2 environment failed, attempting Tier 3 fallback...", e); }

            // TIER 3: Universal Fallback (Webcams)
            await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, () => {});

        } catch (err: any) {
            console.error("Camera Protocol Exception:", err);
            toast.error("Camera Permission Blocked", { 
                description: "Tap the lock icon in your browser URL bar and set Camera to ALLOW." 
            });
            setIsCameraActive(false);
        }
    };

    const switchCamera = async () => {
        if (availableCameras.length <= 1) {
            return toast.info("Single Camera Hardware", { description: "No secondary camera detected." });
        }

        const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
        const nextIndex = (currentIndex + 1) % availableCameras.length;
        const nextCamera = availableCameras[nextIndex];

        setSelectedCameraId(nextCamera.id);

        if (scannerRef.current) {
            try { await scannerRef.current.stop(); scannerRef.current = null; } catch (e) {}
        }

        setIsCameraActive(true);
        const html5QrCode = new Html5Qrcode("bbu1-neural-view");
        scannerRef.current = html5QrCode;

        const config = { 
            fps: 20, 
            qrbox: { width: 280, height: 160 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.QR_CODE
            ],
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        };

        try {
            await html5QrCode.start(
                nextCamera.id,
                config,
                (decodedText) => {
                    html5QrCode.pause();
                    processHardwareScan(decodedText, 'Smartphone Camera Node');
                },
                () => {}
            );
            toast.success("Camera Flipped", { description: `Active: ${nextCamera.label}` });
        } catch (e) {
            toast.error("Camera Switch Failed");
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
            } catch (e) {}
        }
        setIsCameraActive(false);
    };

    // HARDWARE SCAN EXECUTION & REALTIME BROADCAST ENGINE
    const processHardwareScan = async (code: string, deviceName: string) => {
        setIsScanning(true);

        const { data: handshake, error } = await supabase.rpc('fn_sovereign_barcode_handshake', {
            p_barcode: code,
            p_business_id: tenantId
        });

        if (error || !handshake) {
            try { DeepAudioEngine.playError(); } catch (e) {}
            toast.error("Scan Query Failed", { description: `Barcode ${code} query error.` });
            setIsScanning(false);
            resumeCameraWithDelay();
            return;
        }

        // Broadcast Scan Event over Supabase Realtime Mesh to POS Terminals
        await supabase.channel(`fiduciary_mesh_${tenantId}`).send({
            type: 'broadcast',
            event: 'POS_BARCODE_SCANNED',
            payload: { barcode: code, timestamp: new Date() }
        });

        // CASE A: LOCAL PRODUCT FOUND -> AUTO-STOCK & UPDATE POS
        if (handshake.status === 'LOCAL_FOUND') {
            try { DeepAudioEngine.playSuccess(); } catch (e) {}
            const item = handshake.data;
            const priceVal = Number(item.price || item.cost_price || 0);

            setLastScanData({
                code: item.sku || code,
                time: new Date(),
                price: priceVal
            });
            setTransactionTotal(prev => prev + priceVal);

            toast.success(`Broadcasted to POS: ${item.product_name}`, {
                description: `Code ${code} injected into active cashier carts.`
            });

            resumeCameraWithDelay();
        } 
        // CASE B: GLOBAL MASTER FOUND -> TRIGGER AUTO-FILL ONBOARDING DIALOG
        else if (handshake.status === 'GLOBAL_FOUND') {
            try { DeepAudioEngine.playSuccess(); } catch (e) {}
            setScanBridgeData({
                barcode: code,
                name: handshake.data.product_name || '',
                price: Number(handshake.data.suggested_price) || 0,
                costPrice: Number(handshake.data.suggested_cost) || 0,
                isGlobal: true
            });
        } 
        // CASE C: NEW UNKNOWN CODE -> TRIGGER ONBOARDING DIALOG
        else {
            try { DeepAudioEngine.playError(); } catch (e) {}
            setScanBridgeData({
                barcode: code,
                name: '',
                price: 0,
                costPrice: 0,
                isGlobal: false
            });
        }

        setIsScanning(false);
    };

    const resumeCameraWithDelay = () => {
        if (scannerRef.current && scannerRef.current.isPaused()) {
            setTimeout(() => {
                try { scannerRef.current?.resume(); } catch (e) {}
            }, 2500);
        }
    };

    const handleCloseBridgeModal = () => {
        setScanBridgeData(null);
        if (scannerRef.current && scannerRef.current.isPaused()) {
            try { scannerRef.current.resume(); } catch (e) {}
        }
    };

    // HARDWARE KEYBOARD LISTENER FOR USB/BLUETOOTH LASER BARCODE GUNS
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            const now = Date.now();
            if (now - lastKeyTime > 50) buffer = '';
            
            if (e.key === 'Enter') {
                if (buffer.length > 2) processHardwareScan(buffer, 'Hardware Laser Gun');
                buffer = '';
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
            lastKeyTime = now;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tenantId]);

    // USB / BLUETOOTH / SERIAL HARDWARE PAIRING HANDSHAKES
    const syncDeviceToRegistry = async (device: any, protocol: string) => {
        const deviceName = device.productName || device.name || "Hardware Device Node";
        await supabase.rpc('fn_register_or_heartbeat_hardware', {
            p_tenant_id: tenantId,
            p_device_name: deviceName,
            p_device_type: deviceName.toLowerCase().includes('printer') ? 'RECEIPT_PRINTER' : 'BARCODE_SCANNER',
            p_connection_protocol: protocol
        });
        queryClient.invalidateQueries({ queryKey: ['security_hardware'] });
    };

    const pairBluetoothPrinter = async () => {
        try {
            toast.loading("Scanning Bluetooth Hardware Mesh...");
            const server = await DeepHardwareBridge.connectBluetooth();
            if (server) {
                await syncDeviceToRegistry(server.device, 'BLUETOOTH');
                toast.success(`Bluetooth Link Sealed: ${server.device.name}`);
            }
        } catch (err) {
            toast.error("Bluetooth Discovery Timed Out");
        }
    };

    const pairSerialScanner = async () => {
        try {
            const port = await DeepHardwareBridge.connectIndustrialScanner();
            if (port) {
                await syncDeviceToRegistry({ name: "Industrial RS232 COM Scanner" }, 'SERIAL');
                toast.success("RS232 Serial Scanner Welded to System");
            }
        } catch (err) {
            toast.error("Serial COM Handshake Refused");
        }
    };

    const connectUSBScannerHardware = async () => {
        try {
            const hidDevices = await (navigator as any).hid.requestDevice({ filters: [] });
            if (hidDevices && hidDevices.length > 0) {
                const device = hidDevices[0];
                await device.open();
                setScannerDevice(device);
                toast.success("USB Hardware Scanner Integrated");
                await syncDeviceToRegistry(device, 'HID');

                device.oninputreport = (event: any) => {
                    const sampleCode = "SKU-" + Math.floor(100000 + Math.random() * 900000);
                    processHardwareScan(sampleCode, device.productName || 'USB Scanner');
                };
            }
        } catch (err) {
            toast.error("USB HID Hardware Connection Failed");
        }
    };

    // ====================================================================
    // SMART LOCKDOWN & ACCESS RELEASE TOGGLE PROTOCOL
    // ====================================================================
    const handleToggleFacilityLockdown = async () => {
        setIsLockingDown(true);
        const nextAction = isFacilityLocked ? 'RELEASE' : 'LOCKDOWN';

        toast.loading(nextAction === 'LOCKDOWN' ? "Enforcing Perimeter Lockdown..." : "Restoring Facility Access...", {
            style: { background: nextAction === 'LOCKDOWN' ? '#ef4444' : '#10b981', color: '#fff' }
        });

        try {
            const { data, error } = await supabase.rpc('fn_toggle_facility_lockdown', {
                p_tenant_id: tenantId,
                p_action: nextAction
            });

            if (error) throw error;

            if (data?.status === 'LOCKED_DOWN') {
                setIsFacilityLocked(true);
                setIsAlarmActive(true);
                toast.success("Facility Perimeter Secured", {
                    description: `Non-admin staff access suspended (${data.affected_users} users restricted). Admins remain active.`
                });
            } else if (data?.status === 'ACCESS_GRANTED') {
                setIsFacilityLocked(false);
                setIsAlarmActive(false);
                toast.success("Facility Access Restored", {
                    description: `All employee accounts reactivated (${data.restored_users} users restored).`
                });
            }
        } catch (err: any) {
            toast.error(`Lockdown Protocol Failure: ${err.message}`);
        } finally {
            setIsLockingDown(false);
        }
    };

    const runAutonomousDiscovery = async () => {
        setIsScanningNetwork(true);
        setScanProgress(0);
        toast.info("Scanning Hardware Mesh...", { description: "Mapping local network nodes." });

        const interval = setInterval(() => setScanProgress(p => (p < 95 ? p + 5 : p)), 100);

        try {
            await supabase.rpc('discover_tenant_hardware', { t_id: tenantId });
            setTimeout(() => {
                clearInterval(interval);
                setScanProgress(100);
                setIsScanningNetwork(false);
                toast.success("Hardware Mesh Updated");
                queryClient.invalidateQueries({ queryKey: ['security_hardware'] });
            }, 1500);
        } catch (err) {
            setIsScanningNetwork(false);
            clearInterval(interval);
            toast.error("Subnet Hardware Discovery Failed");
        }
    };

    const initiatePaymentFlow = async (method: 'CARD' | 'MOBILE_MONEY') => {
        if (transactionTotal <= 0) return toast.error("Basket empty", { description: "Please scan items before payment." });
        
        setPaymentMethod(method);
        setIsProcessingPayment(true);

        toast.info("Connecting Payment Hub", { 
            description: method === 'CARD' ? "Awaiting card terminal..." : "Requesting mobile money confirmation...",
            icon: method === 'CARD' ? <CreditCard className="animate-pulse" /> : <Smartphone className="animate-bounce" />
        });

        setTimeout(() => {
            handlePaymentLogicSuccess({ amount: transactionTotal });
        }, 3000);
    };

    const handlePaymentLogicSuccess = (payload: any) => {
        setIsProcessingPayment(false);
        setPaymentVerified(true);
        try { DeepAudioEngine.playSuccess(); } catch (e) {}
        toast.success("Payment Verified", { 
            description: `Settled ${transactionTotal.toLocaleString()} UGX.`,
            icon: <CheckCircle2 className="text-emerald-500" />
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20 max-w-[1600px] mx-auto">
            
            {/* MASTER CONTROL HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-3.5 rounded-lg shadow-sm transition-all duration-300",
                        isAlarmActive || isFacilityLocked ? "bg-red-600 animate-pulse text-white" : "bg-blue-50 text-blue-600"
                    )}>
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
                            Hardware Management Center
                        </h1>
                        <div className="flex items-center gap-2.5 mt-2">
                            <div className={cn("h-2 w-2 rounded-full", isFacilityLocked ? "bg-red-500 animate-ping" : "bg-emerald-500")} />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Account ID: {tenantId.substring(0,12).toUpperCase()} | Status: {isFacilityLocked ? "LOCKED DOWN" : "ACTIVE"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <Button 
                        variant="outline" 
                        onClick={pairBluetoothPrinter}
                        className="flex-1 lg:flex-none h-11 rounded-lg border-blue-200 bg-blue-50/50 hover:bg-blue-100 font-bold text-xs"
                    >
                        <Radio size={18} className="mr-2 text-blue-600 animate-pulse" />
                        Pair Bluetooth POS
                    </Button>

                    <Button 
                        variant="outline" 
                        onClick={pairSerialScanner}
                        className="flex-1 lg:flex-none h-11 rounded-lg border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs"
                    >
                        <Zap size={18} className="mr-2 text-amber-500" />
                        Link Industrial Scanner
                    </Button>

                    <Button 
                        variant="outline" 
                        onClick={connectUSBScannerHardware}
                        className="flex-1 lg:flex-none h-11 rounded-lg border-slate-200 bg-white hover:bg-slate-50 font-semibold text-xs tracking-tight"
                    >
                        <ScanBarcode size={18} className="mr-2 text-blue-600" />
                        {scannerDevice ? "USB Integrated" : "Link USB Scanner"}
                    </Button>

                    <Button 
                        variant="outline" 
                        onClick={runAutonomousDiscovery}
                        disabled={isScanningNetwork}
                        className="flex-1 lg:flex-none h-11 rounded-lg border-slate-200 bg-white hover:bg-slate-50 font-semibold text-xs tracking-tight"
                    >
                        {isScanningNetwork ? <Loader2 className="animate-spin mr-2 text-blue-600" /> : <Network className="mr-2 text-blue-600" />}
                        {isScanningNetwork ? `Mapping Subnet ${scanProgress}%` : "Hardware Scan"}
                    </Button>
                    
                    {/* SMART LOCKDOWN / GRANT ACCESS TOGGLE BUTTON */}
                    <Button 
                        onClick={handleToggleFacilityLockdown}
                        disabled={isLockingDown}
                        className={cn(
                            "flex-1 lg:flex-none h-11 rounded-lg px-8 font-bold text-xs uppercase tracking-wider text-white transition-all shadow-md",
                            isFacilityLocked 
                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" 
                                : "bg-red-600 hover:bg-red-700 shadow-red-200"
                        )}
                    >
                        {isLockingDown ? (
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : isFacilityLocked ? (
                            <><Unlock size={16} className="mr-2" /> Grant Access</>
                        ) : (
                            <><Lock size={16} className="mr-2" /> Lockdown</>
                        )}
                    </Button>
                </div>
            </div>

            {isScanningNetwork && (
                <div className="px-1">
                    <Progress value={scanProgress} className="h-1 bg-slate-100" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT: VIDEO MONITORING & LOGS */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* CAMERA SCANNER VIEWPORT */}
                    <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white">
                        <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-slate-900 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                                    <Video className="text-blue-600" size={18} />
                                    Active Wireless Camera Scanner Stream
                                </CardTitle>
                                <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                                    Primary Node | High-Precision 1D/2D Broadcast active
                                </p>
                            </div>
                            <Button 
                                onClick={isCameraActive ? stopCamera : startCamera}
                                variant="outline" 
                                className="text-xs font-bold h-9 px-4 rounded-lg"
                            >
                                {isCameraActive ? "Shutdown Camera" : "Activate Camera"}
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0 relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
                            
                            {/* CAMERA DOM VIEWPORT */}
                            <div id="bbu1-neural-view" className={cn(
                                "w-full h-full rounded-xl overflow-hidden transition-opacity duration-500",
                                isCameraActive ? "opacity-100" : "opacity-0 absolute"
                            )} />

                            {!isCameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 text-center">
                                    <Barcode size={80} strokeWidth={1} className="text-slate-700" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wireless Scanner Offline</p>
                                    <Button onClick={startCamera} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                                        <Camera className="mr-2 h-4 w-4" /> Start Phone/Laptop Camera
                                    </Button>
                                </div>
                            )}

                            {/* CAMERA FLIP OVERLAY BUTTON */}
                            {isCameraActive && availableCameras.length > 1 && (
                                <Button
                                    onClick={switchCamera}
                                    variant="secondary"
                                    size="icon"
                                    title="Flip Camera"
                                    className="absolute top-4 right-4 h-11 w-11 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-md shadow-xl"
                                >
                                    <SwitchCamera className="h-5 w-5" />
                                </Button>
                            )}

                            {lastScanData && (
                                <div className="absolute top-6 left-6 animate-in fade-in zoom-in duration-300">
                                    <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-2xl flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                                            <Target size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Last Scanned Code</p>
                                            <p className="text-base font-bold text-slate-900 font-mono">{lastScanData.code}</p>
                                            <p className="text-xs font-bold text-blue-600">Broadcasted to POS</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-6 left-6">
                                <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold uppercase py-1 px-3">
                                    Live Realtime Mesh Link Active
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ACTIVITY LOGS */}
                    <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50 border-b p-6">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                Security & Hardware Event Log
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
                                        <p className="font-bold text-sm uppercase tracking-wider text-slate-300">System Hardware Mesh Healthy</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: PAYMENT TERMINAL & CONNECTED DEVICES */}
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
                                    <span className="text-sm font-bold text-slate-400">{dna?.currency || 'UGX'}</span>
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
                                        onClick={() => { setTransactionTotal(0); setPaymentVerified(false); setReceiptStatus('IDLE'); }}
                                        className="h-10 rounded-lg border-slate-200 font-bold text-[10px] uppercase tracking-wide text-red-600 hover:bg-red-50 col-span-2"
                                    >
                                        Void Entry
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CONNECTED DEVICES LIST */}
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
                                                <span className="text-[9px] font-mono text-slate-400 uppercase">{device.connection_protocol || 'WIRELESS'}</span>
                                            </div>
                                        </div>
                                        
                                        <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            device.status === 'ONLINE' ? "bg-emerald-500 shadow-sm" : "bg-red-500 animate-pulse"
                                        )} />
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center text-slate-300">
                                    <Wifi size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase">No Active Hardware</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* AUTOMATIC PRODUCT REGISTRY DIALOGUE BRIDGE */}
            {scanBridgeData && (
                <ProductManagementConsole 
                    categories={categories}
                    initialScanData={scanBridgeData}
                    onClose={handleCloseBridgeModal}
                />
            )}

        </div>
    );
}