'use client';

import React, { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Image as ImageIcon, Trash2, Download, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchRegulatoryDocs, uploadRegulatoryDoc, deleteRegulatoryDoc } from '@/lib/actions/compliance'; // Import the new actions

interface TenantContext { 
  tenantId: string; 
  country: string; 
}

export default function RegulatoryComplianceManager({ 
  workOrderId, 
  tenant 
}: { 
  workOrderId: number; 
  tenant: TenantContext 
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for form
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // 1. Fetch Data
  const { data: docs, isLoading, isError } = useQuery({
    queryKey: ['regul-docs', workOrderId, tenant.tenantId],
    queryFn: () => fetchRegulatoryDocs(workOrderId, tenant.tenantId),
  });

  // 2. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadRegulatoryDoc(formData),
    onSuccess: () => {
      toast.success('Document uploaded successfully');
      setTitle('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      // FIXED: Correct v5 syntax
      queryClient.invalidateQueries({ queryKey: ['regul-docs', workOrderId, tenant.tenantId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Upload failed'),
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, url }: { id: number, url: string }) => deleteRegulatoryDoc(id, url),
    onSuccess: () => {
      toast.success('Document removed');
      queryClient.invalidateQueries({ queryKey: ['regul-docs', workOrderId, tenant.tenantId] });
    },
    onError: (e: Error) => toast.error('Failed to delete document'),
  });

  const handleUpload = () => {
    if (!file || !title) {
      toast.error("Please provide a title and select a file.");
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('workOrderId', workOrderId.toString());
    formData.append('tenantId', tenant.tenantId);
    
    uploadMutation.mutate(formData);
  };

  const getIcon = (type: string) => {
    if (['jpg', 'jpeg', 'png', 'webp'].includes(type.toLowerCase())) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (['pdf'].includes(type.toLowerCase())) return <FileText className="h-4 w-4 text-red-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
           Regulatory & Compliance
           <Badge variant="outline" className="ml-2 font-normal">
             {docs?.length || 0} Files
           </Badge>
        </CardTitle>
        <CardDescription>
          Upload required safety permits, risk assessments, and compliance certificates.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/30 p-4 rounded-lg border border-dashed">
          <div className="grid w-full gap-1.5">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Document Title
            </label>
            <Input 
              placeholder="e.g. Hot Work Permit #123" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="bg-background"
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <label className="text-sm font-medium leading-none">
              Attachment (PDF/Image)
            </label>
            <Input 
              ref={fileInputRef}
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-background cursor-pointer"
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={uploadMutation.isPending}
            className="min-w-[120px]"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UploadCloud className="h-4 w-4 mr-2" />
            )}
            Upload
          </Button>
        </div>

        {/* Documents List */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Type</TableHead>
                <TableHead>Document Name</TableHead>
                <TableHead>Date Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              
              {!isLoading && docs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <AlertCircle className="h-5 w-5 opacity-50" />
                      <span>No documents uploaded yet.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {docs?.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{getIcon(doc.file_type || 'file')}</TableCell>
                  <TableCell className="font-medium">
                    <a 
                      href={doc.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {doc.title}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate({ id: doc.id, url: doc.file_url })}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}