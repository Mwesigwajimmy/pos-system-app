'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Barcode, Loader2, Printer, History, CheckCircle2,
  Activity, ArrowDownToLine, Camera, XCircle,
  SwitchCamera
} from 'lucide-react';
import { toast } from 'sonner';
import { DeepAudioEngine } from '@/lib/hardware/DeepAudioEngine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import ProductManagementConsole from '@/components/inventory/AddProductDialog';

interface ScannedSessionItem {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sku: string;
  price: number;
  qtyAdded: number;
  timestamp: Date;
  location_id: string;
  tenant_id: string;
}

interface BusinessProfile {
  name: string;
  currency: string;
  location_name: string;
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

export default function ScannerWorkbench({ businessId, categories = [] }: { businessId: string; categories?: any[] }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [sessionLog, setSessionLog] = useState<ScannedSessionItem[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);

  const [availableCameras, setAvailableCameras] = useState<CameraDeviceOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const [scanBridgeData, setScanBridgeData] = useState<ScanBridgePacket | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, currency')
        .eq('business_id', businessId)
        .maybeSingle();

      if (profile) {
        setBusiness({
          name: profile.business_name || "Business",
          currency: profile.currency || 'UGX',
          location_name: "Main location"
        });
      }
    };
    fetchBusinessProfile();
  }, [businessId]);

  const scanConfig = {
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
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    const html5QrCode = new Html5Qrcode("scanner-viewport");
    scannerRef.current = html5QrCode;

    const onScanSuccess = (decodedText: string) => {
      html5QrCode.pause();
      processScan(decodedText);
    };

    try {
      // Discover physical cameras and prefer the rear/back camera on phones and tablets
      const devices = await Html5Qrcode.getCameras();

      if (devices && devices.length > 0) {
        const formattedDevices = devices.map(d => ({
          id: d.id,
          label: d.label || `Camera ${d.id.substring(0, 5)}`
        }));
        setAvailableCameras(formattedDevices);

        let targetCameraId = selectedCameraId;
        if (!targetCameraId) {
          const backCamera = devices.find(d => {
            const lbl = d.label.toLowerCase();
            return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('main');
          });
          targetCameraId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(targetCameraId);
        }

        try {
          await html5QrCode.start(targetCameraId, scanConfig, onScanSuccess, () => {});
          return;
        } catch (e) {
          console.warn("Camera start with device id failed, trying facingMode fallback", e);
        }
      }

      try {
        await html5QrCode.start({ facingMode: "environment" }, scanConfig, onScanSuccess, () => {});
        return;
      } catch (e) {
        console.warn("Environment-facing camera failed, trying default camera", e);
      }

      await html5QrCode.start({ facingMode: "user" }, scanConfig, onScanSuccess, () => {});

    } catch (err: any) {
      console.error("Camera error:", err);
      const errString = err?.message || err?.toString() || '';

      if (errString.includes('Permission') || errString.includes('denied') || errString.includes('NotAllowedError')) {
        toast.error("Camera access blocked", {
          description: "Allow camera access from the browser's address bar to continue."
        });
      } else {
        toast.error("Camera unavailable", {
          description: "Make sure no other app is using the camera and try again."
        });
      }
      setIsCameraActive(false);
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) {
      toast.info("Only one camera detected on this device.");
      return;
    }

    const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    setSelectedCameraId(nextCamera.id);

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) { console.error("Could not release camera", e); }
    }

    setIsCameraActive(true);
    const html5QrCode = new Html5Qrcode("scanner-viewport");
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        nextCamera.id,
        scanConfig,
        (decodedText) => {
          html5QrCode.pause();
          processScan(decodedText);
        },
        () => {}
      );
      toast.success(`Switched to ${nextCamera.label}`);
    } catch (e) {
      toast.error("Could not switch camera");
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) { console.error("Could not release camera", e); }
    }
    setIsCameraActive(false);
  };

  const handleCloseBridgeModal = () => {
    setScanBridgeData(null);

    // Resume the camera stream so the next item can be scanned immediately
    if (scannerRef.current && scannerRef.current.isPaused()) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        console.warn("Could not resume camera:", e);
      }
    }
  };

  // Supports physical plug-in barcode scanners, which behave like a fast keyboard
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const now = Date.now();
      if (now - lastKeyTime > 50) buffer = '';

      if (e.key === 'Enter') {
        if (buffer.length > 2) processScan(buffer);
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
      lastKeyTime = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scannerRef.current) stopCamera();
    };
  }, [businessId]);

  const printProductLabel = async (item: ScannedSessionItem) => {
    const promise = async () => {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });

      const canvas = document.createElement('canvas');
      bwipjs.toCanvas(canvas, {
        bcid: 'code128', text: item.sku,
        scale: 3, height: 10, includetext: true, textsize: 8,
      });

      const barcodeImg = canvas.toDataURL('image/png');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.text((business?.name || "Business").toUpperCase(), 25, 4, { align: 'center' });
      doc.setFontSize(9);
      doc.text(item.product_name.toUpperCase().substring(0, 22), 25, 8, { align: 'center' });
      doc.setFontSize(7);
      doc.text(item.variant_name.toUpperCase(), 25, 11, { align: 'center' });
      doc.addImage(barcodeImg, 'PNG', 5, 12, 40, 8);
      doc.setLineWidth(0.1);
      doc.line(5, 21, 45, 21);
      doc.setFontSize(10);
      doc.text(`${business?.currency} ${item.price.toLocaleString()}`, 25, 24, { align: 'center' });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    };

    toast.promise(promise(), {
      loading: 'Generating label...',
      success: 'Label ready',
      error: 'Could not generate label'
    });
  };

  const processScan = async (code: string) => {
    setIsScanning(true);

    const { data: result, error } = await supabase.rpc('fn_sovereign_barcode_handshake', {
      p_barcode: code,
      p_business_id: businessId
    });

    if (error || !result) {
      try { DeepAudioEngine.playError(); } catch (e) {}
      toast.error("Lookup failed", { description: `Could not find a match for ${code}.` });
      setIsScanning(false);

      if (scannerRef.current && scannerRef.current.isPaused()) {
        setTimeout(() => { scannerRef.current?.resume(); }, 2000);
      }
      return;
    }

    if (result.status === 'LOCAL_FOUND') {
      const item = result.data;
      const qtyToInject = Number(item.units_per_pack) || 1;

      const { error: rpcError } = await supabase.rpc('process_enterprise_inbound_scan', {
        p_variant_id: item.variant_id,
        p_location_id: item.location_id,
        p_business_id: businessId,
        p_tenant_id: item.tenant_id,
        p_qty_to_add: qtyToInject,
        p_cost: item.cost_price
      });

      if (rpcError) {
        try { DeepAudioEngine.playError(); } catch (e) {}
        toast.error("Could not update stock");
      } else {
        try { DeepAudioEngine.playSuccess(); } catch (e) {}
        const logEntry: ScannedSessionItem = {
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_name: item.variant_name,
          sku: item.sku,
          price: item.cost_price,
          qtyAdded: qtyToInject,
          timestamp: new Date(),
          location_id: item.location_id,
          tenant_id: item.tenant_id
        };
        setSessionLog(prev => [logEntry, ...prev]);
        toast.success(`Added ${qtyToInject} × ${item.product_name}`);
      }

      if (scannerRef.current && scannerRef.current.isPaused()) {
        setTimeout(() => { scannerRef.current?.resume(); }, 2500);
      }
    }
    else if (result.status === 'GLOBAL_FOUND') {
      try { DeepAudioEngine.playSuccess(); } catch (e) {}
      setScanBridgeData({
        barcode: code,
        name: result.data.product_name || '',
        price: Number(result.data.suggested_price) || 0,
        costPrice: Number(result.data.suggested_cost) || 0,
        isGlobal: true
      });
    }
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 h-[calc(100vh-180px)]">

      {/* Camera panel */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <Card className="flex-1 border border-slate-200 bg-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden rounded-lg">

          <div id="scanner-viewport" className={cn(
            "w-full h-full rounded-md overflow-hidden transition-opacity duration-500",
            isCameraActive ? "opacity-100" : "opacity-0 absolute"
          )} />

          {!isCameraActive && (
            <div>
              <Barcode size={72} strokeWidth={1.25} className={isScanning ? "animate-pulse text-blue-400" : "text-slate-600"} />
              <div className="mt-6 space-y-1.5">
                <h2 className="text-base font-semibold text-white">Camera off</h2>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  Start the camera to scan barcodes and add stock automatically.
                </p>
              </div>
            </div>
          )}

          {isScanning && !isCameraActive && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-400 h-6 w-6" />
            </div>
          )}

          <div className="absolute bottom-5 flex items-center gap-2">
            <Button
              onClick={isCameraActive ? stopCamera : startCamera}
              className={cn(
                "h-10 px-5 rounded-md text-sm font-medium",
                isCameraActive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-white text-slate-900 hover:bg-slate-100"
              )}
            >
              {isCameraActive ? <><XCircle className="mr-2 h-4 w-4" /> Stop camera</> : <><Camera className="mr-2 h-4 w-4" /> Start camera</>}
            </Button>

            {isCameraActive && availableCameras.length > 1 && (
              <Button
                onClick={switchCamera}
                variant="secondary"
                size="icon"
                title="Switch camera"
                className="h-10 w-10 rounded-md bg-white/10 hover:bg-white/20 text-white"
              >
                <SwitchCamera className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 mb-1">Units scanned this session</p>
            <h3 className="text-2xl font-semibold text-slate-900">{sessionLog.reduce((a, b) => a + b.qtyAdded, 0)}</h3>
          </div>
          <div className="bg-slate-100 p-3 rounded-md">
            <Activity className="h-5 w-5 text-slate-600" />
          </div>
        </Card>
      </div>

      {/* Scan history */}
      <div className="lg:col-span-7 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Recent scans</h3>
          </div>
          <span className="text-xs text-slate-400">{business?.name}</span>
        </div>

        <ScrollArea className="flex-1 bg-white rounded-lg border border-slate-200 p-4">
          {sessionLog.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-24 space-y-3">
              <ArrowDownToLine size={40} strokeWidth={1.25} />
              <p className="text-sm text-slate-400">No scans yet this session</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessionLog.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-md border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 bg-emerald-50 rounded-md flex items-center justify-center text-emerald-600 border border-emerald-100">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm">{log.product_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono">{log.sku}</span>
                        <span>·</span>
                        <span>{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-lg font-semibold text-slate-900">+{log.qtyAdded}</span>
                      <p className="text-xs text-slate-400">added</p>
                    </div>
                    <Button
                      onClick={() => printProductLabel(log)}
                      variant="outline"
                      size="icon"
                      title="Print label"
                      className="h-9 w-9 rounded-md border-slate-200 text-slate-500 hover:text-slate-900"
                    >
                      <Printer size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
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