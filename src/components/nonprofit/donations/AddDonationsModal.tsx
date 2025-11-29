'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Loader2, DollarSign, CreditCard } from 'lucide-react';

// --- Validation Schema ---
const donationSchema = z.object({
  donorId: z.string().min(1, "Please select a donor"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  currency: z.string().default("USD"),
  method: z.enum(["CARD", "CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CHECK"]),
  campaignId: z.string().optional(),
  notes: z.string().optional(),
});

type DonationFormValues = z.infer<typeof donationSchema>;

// --- Helper: Fetch Donors for Select ---
async function getDonors(tenantId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('donors')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name');
  return data || [];
}

async function getCampaigns(tenantId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('communication_campaigns')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('status', 'Scheduled'); 
  return data || [];
}

export function AddDonationModal({ 
  open, 
  onClose, 
  tenantId, 
  currentUser, 
  onComplete 
}: { 
  open: boolean; 
  onClose: () => void; 
  tenantId: string; 
  currentUser: string; 
  onComplete: () => void; 
}) {
  const [donors, setDonors] = React.useState<{id: string, name: string}[]>([]);
  const [campaigns, setCampaigns] = React.useState<{id: string, name: string}[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      const loadData = async () => {
        try {
          const [d, c] = await Promise.all([getDonors(tenantId), getCampaigns(tenantId)]);
          setDonors(d);
          setCampaigns(c);
        } catch (error) {
          console.error("Failed to load form data", error);
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [open, tenantId]);

  const form = useForm({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: 0,
      currency: 'USD',
      method: 'CARD',
      notes: '',
      donorId: '',
      campaignId: 'none' 
    }
  });

  const onSubmit = async (data: DonationFormValues) => {
    setIsSaving(true);
    try {
      const db = createClient();
      const { error } = await db.from("donations").insert([{
        donor_id: data.donorId, 
        amount: data.amount, 
        currency: data.currency, 
        method: data.method, 
        campaign_id: data.campaignId === 'none' ? null : data.campaignId,
        date: new Date().toISOString(),
        notes: data.notes, 
        created_by: currentUser, 
        tenant_id: tenantId
      }]);

      if (error) throw error;

      toast.success("Donation recorded successfully!");
      form.reset();
      onComplete();
      onClose();
    } catch (e: any) { 
      toast.error(e.message || "Failed to record donation"); 
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Record Donation
          </DialogTitle>
          <DialogDescription>
            Log a new financial contribution from a donor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Donor Select */}
            <FormField
              control={form.control}
              name="donorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Donor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value as string} disabled={isLoadingData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingData ? "Loading..." : "Select Donor"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {donors.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        {/* FIX: Explicit cast to number for value */}
                        <Input 
                          type="number" 
                          className="pl-8" 
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          value={field.value as number}
                          name={field.name}
                          ref={field.ref}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="UGX">UGX (USh)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                        <SelectItem value="CHECK">Check</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value as string} disabled={isLoadingData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {campaigns.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    {/* FIX: Explicit cast to string for value */}
                    <Textarea 
                        placeholder="Reference number, remarks, etc." 
                        className="min-h-[80px]" 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        value={field.value as string}
                        name={field.name}
                        ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving || isLoadingData}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Add Donation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}