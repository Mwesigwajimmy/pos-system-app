'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
    ShieldAlert, Camera, Cpu, Wifi,
    Lock, Unlock, Radio, Loader2,
    Video, ShieldCheck, AlertTriangle,
    ScanBarcode, Smartphone, Network,
    HardDrive, Printer, CreditCard, Wallet,
    SwitchCamera, Barcode, Usb, X
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface BusinessDNA {
    name: string;
    currency: string;
}

const supabase = createClient();

const SCANNER_CONFIG = {
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

const PAYMENT_TIMEOUT_MS = 90000;

export default function SentryHub({ tenantId, categories = [] }: { tenantId: string; categories?: any[] }) {
    const queryClient = useQueryClient();

    const [scannerDevice, setScannerDevice] = useState<any>(null);
    const [lastScanData, setLastScanData] = useState<{ code: string; time: Date; price: number } | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isScanningNetwork, setIsScanningNetwork] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [isAlarmActive, setIsAlarmActive] = useState(false);

    const [dna, setDna] = useState<BusinessDNA | null>(null);
    const businessName = dna?.name || "";
    const businessCurrency = dna?.currency || "UGX";

    const [isLockingDown, setIsLockingDown] = useState(false);
    const [isFacilityLocked, setIsFacilityLocked] = useState(false);

    const [isCameraActive, setIsCameraActive] = useState(false);
    const [availableCameras, setAvailableCameras] = useState<CameraDeviceOption[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const [scanBridgeData, setScanBridgeData] = useState<ScanBridgePacket | null>(null);

    const [transactionTotal, setTransactionTotal] = useState(0);
    const [paymentState, setPaymentState] = useState<'IDLE' | 'WAITING' | 'PAID'>('IDLE');
    const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'MOBILE_MONEY' | null>(null);

    const [meshStatus, setMeshStatus] = useState<'CONNECTING' | 'CONNECTED' | 'OFFLINE'>('CONNECTING');
    const channelRef = useRef<any>(null);
    const paymentTimerRef = useRef<any>(null);

    useEffect(() => {
        const fetchNodeIdentity = async () => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_name, currency')
                .or(`business_id.eq.${tenantId},tenant_id.eq.${tenantId}`)
                .maybeSingle();

            if (profile) {
                setDna({
                    name: profile.business_name || "",
                    currency: profile.currency || 'UGX'
                });
            }
        };
        if (tenantId) fetchNodeIdentity();
    }, [tenantId]);

    const handleHardwareBreach = useCallback((message: any) => {
        const body = message?.payload || {};
        setIsAlarmActive(true);
        toast.error(`Alert in ${body.zone || 'the facility'}`, {
            description: [body.device, body.alert].filter(Boolean).join(': '),
            duration: 10000
        });
    }, []);

    const clearPaymentTimer = () => {
        if (paymentTimerRef.current) {
            clearTimeout(paymentTimerRef.current);
            paymentTimerRef.current = null;
        }
    };

    const handlePaymentConfirmed = useCallback((amount?: number) => {
        clearPaymentTimer();
        setPaymentState('PAID');
        try { DeepAudioEngine.playSuccess(); } catch (e) {}
        toast.success(`Payment received: ${(Number(amount) || 0).toLocaleString()} ${businessCurrency}`);
    }, [businessCurrency]);

    const syncDeviceToRegistry = useCallback(async (device: any, protocol: string) => {
        const deviceName = device.productName || device.name || "Hardware device";
        await supabase.rpc('fn_register_or_heartbeat_hardware', {
            p_tenant_id: tenantId,
            p_device_name: deviceName,
            p_device_type: deviceName.toLowerCase().includes('printer') ? 'RECEIPT_PRINTER' : 'BARCODE_SCANNER',
            p_connection_protocol: protocol
        });
        queryClient.invalidateQueries({ queryKey: ['security_hardware'] });
    }, [tenantId, queryClient]);

    useEffect(() => {
        const hardwareChannel = supabase.channel(`fiduciary_mesh_${tenantId}`)
            .on('broadcast', { event: 'HARDWARE_TRIGGER' }, (message) => {
                handleHardwareBreach(message);
            })
            .on('broadcast', { event: 'PAYMENT_STATUS_UPDATE' }, (message: any) => {
                const body = message?.payload || {};
                if (body.status === 'SUCCESS') handlePaymentConfirmed(body.amount);
                if (body.status === 'FAILED') {
                    clearPaymentTimer();
                    setPaymentState('IDLE');
                    toast.error("Payment was declined");
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
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setMeshStatus('CONNECTED');
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setMeshStatus('OFFLINE');
            });

        channelRef.current = hardwareChannel;

        return () => {
            supabase.removeChannel(hardwareChannel);
            channelRef.current = null;
        };
    }, [tenantId, queryClient, handleHardwareBreach, handlePaymentConfirmed]);

    useEffect(() => {
        if (!('hid' in navigator)) return;

        const onConnect = ({ device }: any) => {
            toast.success(`Connected: ${device.productName || 'USB device'}`);
            syncDeviceToRegistry(device, 'HID');
        };

        (navigator as any).hid.addEventListener('connect', onConnect);
        return () => (navigator as any).hid.removeEventListener('connect', onConnect);
    }, [syncDeviceToRegistry]);

    useEffect(() => {
        return () => {
            clearPaymentTimer();
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
        };
    }, []);

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
        refetchInterval: 5000
    });

    const resumeCameraWithDelay = () => {
        if (scannerRef.current && scannerRef.current.isPaused()) {
            setTimeout(() => {
                try { scannerRef.current?.resume(); } catch (e) {}
            }, 2500);
        }
    };

    const processHardwareScan = useCallback(async (code: string, deviceName: string) => {
        setIsScanning(true);

        const { data: handshake, error } = await supabase.rpc('fn_sovereign_barcode_handshake', {
            p_barcode: code,
            p_business_id: tenantId
        });

        if (error || !handshake) {
            try { DeepAudioEngine.playError(); } catch (e) {}
            toast.error(`Could not look up ${code}`);
            setIsScanning(false);
            resumeCameraWithDelay();
            return;
        }

        await supabase.channel(`fiduciary_mesh_${tenantId}`).send({
            type: 'broadcast',
            event: 'POS_BARCODE_SCANNED',
            payload: { barcode: code, timestamp: new Date() }
        });

        if (handshake.status === 'LOCAL_FOUND') {
            try { DeepAudioEngine.playSuccess(); } catch (e) {}
            const item = handshake.data;
            const priceVal = Number(item.price || item.cost_price || 0);

            setLastScanData({ code: item.sku || code, time: new Date(), price: priceVal });
            setTransactionTotal(prev => prev + priceVal);
            setPaymentState('IDLE');
            toast.success(`${item.product_name} sent to the till`);
            resumeCameraWithDelay();
        } else if (handshake.status === 'GLOBAL_FOUND') {
            try { DeepAudioEngine.playSuccess(); } catch (e) {}
            setScanBridgeData({
                barcode: code,
                name: handshake.data.product_name || '',
                price: Number(handshake.data.suggested_price) || 0,
                costPrice: Number(handshake.data.suggested_cost) || 0,
                isGlobal: true
            });
        } else {
            try { DeepAudioEngine.playError(); } catch (e) {}
            setScanBridgeData({ barcode: code, name: '', price: 0, costPrice: 0, isGlobal: false });
        }

        setIsScanning(false);
    }, [tenantId]);

    const startScanner = async (target: any) => {
        const html5QrCode = new Html5Qrcode("bbu1-camera-view");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
            target,
            SCANNER_CONFIG,
            (decodedText: string) => {
                html5QrCode.pause();
                processHardwareScan(decodedText, 'Camera');
            },
            () => {}
        );
    };

    const startCamera = async () => {
        setIsCameraActive(true);

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
                        const lbl = (d.label || '').toLowerCase();
                        return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('main');
                    });
                    targetCameraId = backCamera ? backCamera.id : devicesList[0].id;
                    setSelectedCameraId(targetCameraId);
                }

                try {
                    await startScanner(targetCameraId);
                    return;
                } catch (e) { /* try the next option */ }
            }

            try {
                await startScanner({ facingMode: "environment" });
                return;
            } catch (e) { /* try the next option */ }

            await startScanner({ facingMode: "user" });
        } catch (err: any) {
            toast.error("Camera blocked", {
                description: "Allow camera access for this site in your browser settings."
            });
            setIsCameraActive(false);
        }
    };

    const switchCamera = async () => {
        if (availableCameras.length <= 1) {
            toast.info("No other camera found");
            return;
        }

        const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
        const nextCamera = availableCameras[(currentIndex + 1) % availableCameras.length];
        setSelectedCameraId(nextCamera.id);

        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch (e) {}
            scannerRef.current = null;
        }

        try {
            await startScanner(nextCamera.id);
        } catch (e) {
            toast.error("Could not switch camera");
            setIsCameraActive(false);
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch (e) {}
            scannerRef.current = null;
        }
        setIsCameraActive(false);
    };

    const handleCloseBridgeModal = () => {
        setScanBridgeData(null);
        if (scannerRef.current && scannerRef.current.isPaused()) {
            try { scannerRef.current.resume(); } catch (e) {}
        }
    };

    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const now = Date.now();
            if (now - lastKeyTime > 50) buffer = '';

            if (e.key === 'Enter') {
                if (buffer.length > 2) processHardwareScan(buffer, 'Barcode gun');
                buffer = '';
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
            lastKeyTime = now;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [processHardwareScan]);

    const pairBluetoothPrinter = async () => {
        try {
            const server = await DeepHardwareBridge.connectBluetooth();
            if (server) {
                await syncDeviceToRegistry(server.device, 'BLUETOOTH');
                toast.success(`Paired: ${server.device.name}`);
            }
        } catch (err) {
            toast.error("Bluetooth pairing failed");
        }
    };

    const pairSerialScanner = async () => {
        try {
            const port = await DeepHardwareBridge.connectIndustrialScanner();
            if (port) {
                await syncDeviceToRegistry({ name: "Serial scanner" }, 'SERIAL');
                toast.success("Serial scanner connected");
            }
        } catch (err) {
            toast.error("Serial connection failed");
        }
    };

    const connectUSBScannerHardware = async () => {
        if (!('hid' in navigator)) {
            toast.error("This browser cannot connect USB devices");
            return;
        }
        try {
            const hidDevices = await (navigator as any).hid.requestDevice({ filters: [] });
            if (hidDevices && hidDevices.length > 0) {
                const device = hidDevices[0];
                await device.open();
                setScannerDevice(device);
                await syncDeviceToRegistry(device, 'HID');
                toast.success("USB scanner connected");
            }
        } catch (err) {
            toast.error("USB connection failed");
        }
    };

    const handleToggleFacilityLockdown = async () => {
        setIsLockingDown(true);
        const nextAction = isFacilityLocked ? 'RELEASE' : 'LOCKDOWN';

        try {
            const { data, error } = await supabase.rpc('fn_toggle_facility_lockdown', {
                p_tenant_id: tenantId,
                p_action: nextAction
            });

            if (error) throw error;

            if (data?.status === 'LOCKED_DOWN') {
                setIsFacilityLocked(true);
                setIsAlarmActive(true);
                toast.success("Facility locked", {
                    description: `${data.affected_users} staff accounts suspended. Admins keep access.`
                });
            } else if (data?.status === 'ACCESS_GRANTED') {
                setIsFacilityLocked(false);
                setIsAlarmActive(false);
                toast.success("Access restored", {
                    description: `${data.restored_users} staff accounts reactivated.`
                });
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsLockingDown(false);
        }
    };

    const runAutonomousDiscovery = async () => {
        setIsScanningNetwork(true);
        setScanProgress(0);

        const interval = setInterval(() => setScanProgress(p => (p < 95 ? p + 5 : p)), 100);

        try {
            await supabase.rpc('discover_tenant_hardware', { t_id: tenantId });
            setTimeout(() => {
                clearInterval(interval);
                setScanProgress(100);
                setIsScanningNetwork(false);
                toast.success("Device list updated");
                queryClient.invalidateQueries({ queryKey: ['security_hardware'] });
            }, 1500);
        } catch (err) {
            clearInterval(interval);
            setIsScanningNetwork(false);
            toast.error("Device scan failed");
        }
    };

    const requestPayment = async (method: 'CARD' | 'MOBILE_MONEY') => {
        if (transactionTotal <= 0) {
            toast.error("Scan items first");
            return;
        }

        setPaymentMethod(method);
        setPaymentState('WAITING');

        try {
            await supabase.channel(`fiduciary_mesh_${tenantId}`).send({
                type: 'broadcast',
                event: 'PAYMENT_REQUEST',
                payload: { amount: transactionTotal, method, currency: businessCurrency, timestamp: new Date() }
            });
        } catch (e) {
            setPaymentState('IDLE');
            toast.error("Could not reach the terminal");
            return;
        }

        clearPaymentTimer();
        paymentTimerRef.current = setTimeout(() => {
            setPaymentState('IDLE');
            toast.error("No response from the terminal");
        }, PAYMENT_TIMEOUT_MS);
    };

    const cancelPayment = () => {
        clearPaymentTimer();
        setPaymentState('IDLE');
        setPaymentMethod(null);
    };

    const clearTransaction = () => {
        clearPaymentTimer();
        setTransactionTotal(0);
        setPaymentState('IDLE');
        setPaymentMethod(null);
        setLastScanData(null);
    };

    const printSovereignLabel = async (item: any) => {
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });
            const canvas = document.createElement('canvas');
            bwipjs.toCanvas(canvas, {
                bcid: 'code128', text: item.sku || 'SKU-ITEM',
                scale: 3, height: 10, includetext: true, textsize: 8,
            });

            const barcodeImg = canvas.toDataURL('image/png');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(6);
            doc.text(businessName.toUpperCase(), 25, 4, { align: 'center' });
            doc.setFontSize(8);
            doc.text((item.code || item.sku || "ASSET").substring(0, 22), 25, 8, { align: 'center' });
            doc.addImage(barcodeImg, 'PNG', 5, 10, 40, 8);
            doc.setFontSize(8);
            doc.text(`${businessCurrency} ${(item.price || 0).toLocaleString()}`, 25, 22, { align: 'center' });

            const blob = doc.output('blob');
            window.open(URL.createObjectURL(blob), '_blank');
        } catch (e: any) {
            toast.error("Could not create the label");
        }
    };

    const deviceIcon = (type: string) => {
        if (type === 'CAMERA') return <Video size={16} />;
        if (type === 'PAYMENT_TERMINAL') return <CreditCard size={16} />;
        if (type === 'RECEIPT_PRINTER') return <Printer size={16} />;
        if (type === 'SMART_GATE') return <ShieldCheck size={16} />;
        return <HardDrive size={16} />;
    };

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-16 sm:space-y-6 xl:px-8">
            <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                            isFacilityLocked ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                        )}>
                            <ShieldAlert size={18} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">Devices</h1>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                {businessName ? <span className="truncate">{businessName}</span> : null}
                                <span className="flex items-center gap-1.5">
                                    <span className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        meshStatus === 'CONNECTED' ? "bg-emerald-500" :
                                        meshStatus === 'CONNECTING' ? "bg-amber-500" : "bg-red-500"
                                    )} />
                                    {meshStatus === 'CONNECTED' ? 'Live' : meshStatus === 'CONNECTING' ? 'Connecting' : 'Offline'}
                                </span>
                                {isFacilityLocked ? <span className="font-medium text-red-600">Locked down</span> : null}
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleToggleFacilityLockdown}
                        disabled={isLockingDown}
                        className={cn(
                            "h-10 w-full rounded-lg px-5 text-sm font-medium text-white lg:w-auto",
                            isFacilityLocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                        )}
                    >
                        {isLockingDown ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                            isFacilityLocked ? <Unlock size={15} className="mr-2" /> : <Lock size={15} className="mr-2" />}
                        {isFacilityLocked ? 'Restore access' : 'Lock down'}
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 px-5 py-4 sm:grid-cols-4">
                    <Button
                        variant="outline"
                        onClick={pairBluetoothPrinter}
                        className="h-10 justify-start rounded-lg border-slate-200 px-3 text-xs font-medium"
                    >
                        <Radio size={15} className="mr-2 shrink-0 text-slate-400" />
                        <span className="truncate">Bluetooth</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={pairSerialScanner}
                        className="h-10 justify-start rounded-lg border-slate-200 px-3 text-xs font-medium"
                    >
                        <ScanBarcode size={15} className="mr-2 shrink-0 text-slate-400" />
                        <span className="truncate">Serial scanner</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={connectUSBScannerHardware}
                        className="h-10 justify-start rounded-lg border-slate-200 px-3 text-xs font-medium"
                    >
                        <Usb size={15} className="mr-2 shrink-0 text-slate-400" />
                        <span className="truncate">{scannerDevice ? "USB connected" : "USB scanner"}</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={runAutonomousDiscovery}
                        disabled={isScanningNetwork}
                        className="h-10 justify-start rounded-lg border-slate-200 px-3 text-xs font-medium"
                    >
                        {isScanningNetwork
                            ? <Loader2 size={15} className="mr-2 shrink-0 animate-spin text-slate-400" />
                            : <Network size={15} className="mr-2 shrink-0 text-slate-400" />}
                        <span className="truncate">{isScanningNetwork ? `Scanning ${scanProgress}%` : "Find devices"}</span>
                    </Button>
                </div>

                {isScanningNetwork ? <Progress value={scanProgress} className="h-1 rounded-none" /> : null}
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
                <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none lg:col-span-8">
                    <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-slate-900">Scanner</h2>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                Point the camera at a barcode
                            </p>
                        </div>
                        <Button
                            onClick={isCameraActive ? stopCamera : startCamera}
                            variant="outline"
                            className="h-9 shrink-0 rounded-lg border-slate-200 px-4 text-xs font-medium"
                        >
                            {isCameraActive ? "Stop" : "Start camera"}
                        </Button>
                    </CardHeader>

                    <CardContent className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-900 p-0 sm:aspect-video">
                        <div
                            id="bbu1-camera-view"
                            className={cn("h-full w-full", isCameraActive ? "opacity-100" : "absolute opacity-0")}
                        />

                        {!isCameraActive ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                                <Barcode size={56} strokeWidth={1} className="text-slate-700" />
                                <p className="text-sm text-slate-400">Camera is off</p>
                                <Button
                                    onClick={startCamera}
                                    className="h-10 rounded-lg bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-100"
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    Start camera
                                </Button>
                            </div>
                        ) : null}

                        {isCameraActive && availableCameras.length > 1 ? (
                            <Button
                                onClick={switchCamera}
                                className="absolute right-3 top-3 h-10 w-10 rounded-lg bg-black/50 p-0 text-white backdrop-blur-sm hover:bg-black/70"
                                aria-label="Switch camera"
                            >
                                <SwitchCamera className="h-4 w-4" />
                            </Button>
                        ) : null}

                        {isScanning ? (
                            <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-black/60 py-2 text-xs text-white">
                                <Loader2 size={13} className="animate-spin" />
                                Looking up code
                            </div>
                        ) : null}

                        {lastScanData ? (
                            <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 px-4 py-3 backdrop-blur-sm sm:right-auto sm:max-w-xs">
                                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Last scan</p>
                                <p className="mt-0.5 truncate font-mono text-sm text-slate-900">{lastScanData.code}</p>
                                <p className="text-xs text-slate-500">
                                    {businessCurrency} {lastScanData.price.toLocaleString()} · sent to the till
                                </p>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none lg:col-span-4">
                    <CardHeader className="border-b border-slate-200 px-5 py-4">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <Wallet size={15} className="text-slate-400" />
                            Payment
                        </h2>
                    </CardHeader>
                    <CardContent className="space-y-5 p-5">
                        <div>
                            <p className="text-xs font-medium text-slate-500">Amount due</p>
                            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                                {transactionTotal.toLocaleString()}
                                <span className="ml-1.5 text-sm font-normal text-slate-400">{businessCurrency}</span>
                            </p>
                        </div>

                        {paymentState === 'PAID' ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                                <p className="text-sm font-medium text-emerald-800">Payment received</p>
                                <p className="mt-0.5 text-xs text-emerald-700">
                                    {transactionTotal.toLocaleString()} {businessCurrency}
                                </p>
                            </div>
                        ) : paymentState === 'WAITING' ? (
                            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    <Loader2 size={15} className="animate-spin text-slate-400" />
                                    <p className="text-sm text-slate-700">
                                        {paymentMethod === 'CARD' ? 'Waiting for the card terminal' : 'Waiting for mobile money confirmation'}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={cancelPayment}
                                    className="h-9 w-full rounded-lg border-slate-200 text-xs font-medium"
                                >
                                    <X size={14} className="mr-1.5" />
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Button
                                    disabled={transactionTotal <= 0}
                                    onClick={() => requestPayment('CARD')}
                                    className="h-12 w-full justify-between rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                                >
                                    Card
                                    <CreditCard size={16} />
                                </Button>
                                <Button
                                    disabled={transactionTotal <= 0}
                                    onClick={() => requestPayment('MOBILE_MONEY')}
                                    variant="outline"
                                    className="h-12 w-full justify-between rounded-lg border-slate-200 px-4 text-sm font-medium"
                                >
                                    Mobile money
                                    <Smartphone size={16} />
                                </Button>
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            onClick={clearTransaction}
                            disabled={transactionTotal <= 0 && paymentState === 'IDLE'}
                            className="h-9 w-full rounded-lg text-xs font-medium text-slate-500"
                        >
                            Clear
                        </Button>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none lg:col-span-8">
                    <CardHeader className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">Recent events</h2>
                    </CardHeader>
                    <CardContent className="p-0">
                        {alerts && alerts.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5">
                                        <div className={cn(
                                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                            alert.priority === 'CRITICAL' ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
                                        )}>
                                            <AlertTriangle size={14} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-slate-900">{alert.body}</p>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                {alert.zone ? `${alert.zone} · ` : ''}
                                                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-16 text-center">
                                <ShieldCheck size={28} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-sm text-slate-400">Nothing to report</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-slate-200 shadow-none lg:col-span-4">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <Cpu size={15} className="text-slate-400" />
                            Connected devices
                        </h2>
                        <Badge variant="secondary" className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {devices?.length || 0}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoadingDevices ? (
                            <div className="py-12 text-center">
                                <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                            </div>
                        ) : devices && devices.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {devices.map(device => (
                                    <div key={device.id} className="flex items-center justify-between gap-3 px-5 py-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                                {deviceIcon(device.device_type)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm text-slate-900">{device.device_name}</p>
                                                <p className="truncate text-xs text-slate-400">
                                                    {device.connection_protocol || 'Wireless'}
                                                    {device.zone ? ` · ${device.zone}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "h-2 w-2 shrink-0 rounded-full",
                                            device.status === 'ONLINE' ? "bg-emerald-500" : "bg-red-500"
                                        )} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <Wifi size={24} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-sm text-slate-400">No devices yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

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