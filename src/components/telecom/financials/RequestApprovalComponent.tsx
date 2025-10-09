'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PendingRequest {
  id: number;
  amount: number;
  requested_at: string;
  notes: string;
  user_full_name: string;
  service_description: string;
}

export function RequestApprovalComponent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: requests, isLoading, isError } = useQuery<PendingRequest[]>({
    queryKey: ['pendingFloatRequests'],
    queryFn: async () => {
      // We need a view or a more complex query to get user name and service description.
      // For now, let's create a view in Supabase SQL editor:
      /*
      CREATE OR REPLACE VIEW public.pending_float_requests_view AS
      SELECT
        tfr.id,
        tfr.amount,
        tfr.requested_at,
        tfr.notes,
        p.full_name as user_full_name,
        tsb.service_description
      FROM public.telecom_float_requests tfr
      JOIN public.profiles p ON tfr.user_id = p.id
      JOIN public.telecom_service_balances tsb ON tfr.service_balance_id = tsb.id
      WHERE tfr.status = 'pending';
      */
      const { data, error } = await supabase.from('pending_float_requests_view').select('*');
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const mutation = useMutation({
    mutationFn: async ({ action, requestId, reason }: { action: 'approve' | 'reject'; requestId: number; reason?: string }) => {
      const rpcName = action === 'approve' ? 'approve_telecom_float_request' : 'reject_telecom_float_request';
      const params = action === 'approve' ? { p_request_id: requestId } : { p_request_id: requestId, p_reason: reason! };
      const { error } = await supabase.rpc(rpcName, params);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(`Request ${vars.action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['pendingFloatRequests'] });
    },
    onError: (error: Error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });

  if (isLoading) return <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (isError) return <p className="text-destructive text-center">Failed to load requests.</p>;
  if (!requests || requests.length === 0) return <p className="text-muted-foreground text-center">No pending requests.</p>;

  return (
    <div className="space-y-4">
      {requests.map(req => (
        <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center">
          <div>
            <div className="font-bold">
              {req.user_full_name} - <span className="text-primary">UGX {req.amount.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">{req.service_description}</p>
            <p className="text-sm mt-1 italic">"{req.notes}"</p>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" className="text-green-500" onClick={() => mutation.mutate({ action: 'approve', requestId: req.id })} disabled={mutation.isPending}><Check className="h-4 w-4" /></Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="icon" variant="destructive" disabled={mutation.isPending}><X className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to reject this request?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Please provide a reason for rejecting this request. This cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <textarea id="rejection-reason" placeholder="Reason for rejection..." className="w-full p-2 border rounded" />
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement).value;
                        if (!reason) { toast.error("A reason is required to reject."); return; }
                        mutation.mutate({ action: 'reject', requestId: req.id, reason });
                    }}>
                        Confirm Rejection
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}