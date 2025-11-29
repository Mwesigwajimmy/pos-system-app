'use client';

import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Loader2, PenTool, CheckCircle } from 'lucide-react';
import { saveSignature } from '@/lib/actions/media';

interface TenantContext { tenantId: string; }

export default function WorkOrderSignatureCapture({
  workOrderId,
  actor,
  tenant,
}: {
  workOrderId: number;
  actor: 'technician' | 'customer';
  tenant: TenantContext;
}) {
  const [isEmpty, setIsEmpty] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Canvas Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setIsEmpty(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Get position
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).nativeEvent.offsetY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).nativeEvent.offsetY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    setIsEmpty(true);
  };

  const mutation = useMutation({
    mutationFn: async () => {
        if (!canvasRef.current) return;
        
        // 1. Convert Canvas to Blob
        const blob = await new Promise<Blob | null>(resolve => canvasRef.current!.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("Failed to generate signature");

        // 2. Upload to Storage
        const supabase = createClient();
        const path = `${tenant.tenantId}/wo/${workOrderId}/sig-${actor}-${Date.now()}.png`;
        const { error: uploadErr } = await supabase.storage.from('signatures').upload(path, blob);
        if (uploadErr) throw uploadErr;
        
        const { data: { publicUrl } } = supabase.storage.from('signatures').getPublicUrl(path);

        // 3. Save via Server Action
        await saveSignature(workOrderId, actor, publicUrl, tenant.tenantId);
    },
    onSuccess: () => {
        toast.success('Signature captured successfully');
        clearCanvas();
    },
    onError: (e: Error) => toast.error(e.message || "Capture failed")
  });

  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" /> Sign-off ({actor === 'customer' ? 'Customer' : 'Technician'})
        </CardTitle>
        <CardDescription>Please sign below to confirm work completion.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border bg-white rounded-lg overflow-hidden touch-none relative">
            <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full h-[200px] cursor-crosshair block"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/30 text-2xl font-bold uppercase select-none">
                    Sign Here
                </div>
            )}
        </div>
        
        <div className="flex gap-4 mt-4 justify-end">
            <Button variant="outline" onClick={clearCanvas} disabled={isEmpty || mutation.isPending}>Clear</Button>
            <Button onClick={() => mutation.mutate()} disabled={isEmpty || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Submit Signature
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}