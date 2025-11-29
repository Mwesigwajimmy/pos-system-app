'use client';

import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Trash2, UploadCloud, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPhotos, deletePhoto } from '@/lib/actions/media';

interface TenantContext { tenantId: string; }

export default function WorkOrderPhotoAttachment({
  workOrderId,
  tenant,
  currentUser,
}: {
  workOrderId: number;
  tenant: TenantContext;
  currentUser: string;
}) {
  const [category, setCategory] = useState('before');
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: photos, isLoading } = useQuery({
    queryKey: ['wo-photos', workOrderId],
    queryFn: () => fetchPhotos(workOrderId, tenant.tenantId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
        const supabase = createClient();
        const path = `${tenant.tenantId}/wo/${workOrderId}/${category}-${Date.now()}`;
        
        // 1. Upload Blob
        const { error: uploadErr } = await supabase.storage.from('work-photos').upload(path, file);
        if (uploadErr) throw uploadErr;

        // 2. Get URL
        const { data: { publicUrl } } = supabase.storage.from('work-photos').getPublicUrl(path);

        // 3. Save DB Record
        const { error: dbErr } = await supabase.from('work_order_photos').insert({
            work_order_id: workOrderId,
            tenant_id: tenant.tenantId,
            url: publicUrl,
            filename: file.name,
            created_by: currentUser,
            category,
        });
        if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      toast.success('Photo uploaded');
      // FIXED: v5 Syntax
      queryClient.invalidateQueries({ queryKey: ['wo-photos', workOrderId] });
      if (fileRef.current) fileRef.current.value = '';
    },
    onError: (e: any) => toast.error(e.message || "Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePhoto(id),
    onSuccess: () => {
        toast.success('Photo deleted');
        queryClient.invalidateQueries({ queryKey: ['wo-photos', workOrderId] });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Job Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6 p-4 bg-muted/40 rounded-lg">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px] bg-background">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="before">Before Work</SelectItem>
                <SelectItem value="after">After Work</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="docs">Paperwork</SelectItem>
            </SelectContent>
          </Select>
          
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              if (e.target.files?.[0]) uploadMutation.mutate(e.target.files[0]);
          }} />
          
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground bg-background"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
             {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
             {uploadMutation.isPending ? "Uploading..." : "Click to Upload Photo"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading && <Loader2 className="animate-spin" />}
          
          {photos?.map((p: any) => (
             <div key={p.id} className="relative group border rounded-lg overflow-hidden aspect-square bg-black/5">
                <img src={p.url} alt={p.category} className="object-cover w-full h-full" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">
                    {p.category.toUpperCase()} - {p.filename}
                </div>
                <button 
                    onClick={() => deleteMutation.mutate(p.id)}
                    className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
             </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}