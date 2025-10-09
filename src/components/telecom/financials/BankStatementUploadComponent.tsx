'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useUserProfile } from '@/hooks/useUserProfile';

export function BankStatementUploadComponent() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const { data: userProfile } = useUserProfile();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const { mutate: uploadStatement, isPending } = useMutation({
    mutationFn: async (fileToUpload: File) => {
      if (!userProfile?.business_id || !userProfile.id) {
        throw new Error("User profile and business ID not found. Cannot upload.");
      }

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `bank-statements/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('business-documents')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('bank_statement_uploads')
        .insert({
          file_name: fileToUpload.name,
          file_path: data.path,
          business_id: userProfile.business_id,
          uploaded_by_user_id: userProfile.id,
        });
      
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Statement uploaded successfully!');
      setFile(null);
      
      // =========================================================================================
      // THE DEFINITIVE FIX IS HERE:
      // This is the real, professional implementation. It tells TanStack Query to
      // immediately re-fetch any data related to 'uploadedStatements'. This will make
      // any list of uploaded files on the page refresh instantly with the new data.
      // =========================================================================================
      queryClient.invalidateQueries({ queryKey: ['uploadedStatements'] });
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`);
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const handleUpload = () => {
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }
    setUploading(true);
    uploadStatement(file);
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Bank Statement Upload</CardTitle>
            <CardDescription>
                Upload your bank statement (CSV format recommended) to begin reconciliation.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Input id="bank-statement" type="file" onChange={handleFileChange} accept=".csv, application/pdf, .xlsx" />
            <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {uploading ? 'Uploading...' : 'Upload Statement'}
            </Button>
        </CardContent>
    </Card>
  );
}