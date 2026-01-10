'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { submitVendorBill } from '@/lib/actions/bills'; // The interconnected backend action
import { toast } from 'sonner';
import { Loader2, Plus, Calendar, Landmark, Globe, MapPin } from 'lucide-react';

// UI Components (Enterprise shadcn/ui pattern)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Enterprise Interface: CreateBillModalProps
 * Includes the critical 'onSuccess' hook to trigger global ledger synchronization.
 */
interface CreateBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    onSuccess?: () => void; // Added to fix the build error and synchronize the system
}

export default function CreateBillModal({ isOpen, onClose, businessId, onSuccess }: CreateBillModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);
    const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
    const supabase = createClient();

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
        defaultValues: {
            billNumber: '',
            vendorId: '',
            billDate: new Date().toISOString().split('T')[0],
            dueDate: '',
            currency: 'USD',
            amount: '',
            expenseAccountId: '',
            locationId: '',
        }
    });

    /**
     * 1. Dynamic Data Fetching
     * Loads Vendors and Expense Accounts scoped strictly to the current tenant (businessId).
     */
    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                // Fetch Vendors for this business
                const { data: v } = await supabase
                    .from('vendors')
                    .select('id, name')
                    .eq('business_id', businessId);

                // Fetch Expense Accounts (Interconnected to General Ledger)
                const { data: a } = await supabase
                    .from('accounting_accounts')
                    .select('id, name, code')
                    .eq('business_id', businessId)
                    .eq('type', 'expense');
                
                if (v) setVendors(v);
                if (a) setExpenseAccounts(a);
            };
            loadData();
        }
    }, [isOpen, businessId]);

    /**
     * 2. Transaction Submission
     * Passes raw data to the Backend Action (submitVendorBill) 
     * which performs the Ledger math and ACID transaction.
     */
    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            const result = await submitVendorBill({ ...data, businessId });
            
            if (result.success) {
                toast.success("Bill Posted & Ledger Updated Successfully");
                reset();
                
                // EXECUTE INTERCONNECT: Refreshes the parent table and aged payables report
                if (onSuccess) onSuccess(); 
                
                onClose();
            } else {
                toast.error(`Posting Failed: ${result.message}`);
            }
        } catch (error) {
            console.error("Critical System Failure:", error);
            toast.error("Critical System Interconnect Error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] border-t-4 border-t-primary shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-primary" />
                        Record Enterprise Vendor Bill
                    </DialogTitle>
                    <DialogDescription>
                        This will generate a legal debt record and post dynamic lines to the General Ledger.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    {/* Multi-Location & Multi-Currency Provisioning */}
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                <Globe className="w-3 h-3" /> Currency
                            </Label>
                            <Select onValueChange={(val) => setValue('currency', val)} defaultValue="USD">
                                <SelectTrigger className="h-8 bg-white">
                                    <SelectValue placeholder="Select Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="KES">KES - Kenya Shilling</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Location
                            </Label>
                            <Select onValueChange={(val) => setValue('locationId', val)}>
                                <SelectTrigger className="h-8 bg-white">
                                    <SelectValue placeholder="Headquarters" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="main">Main Branch</SelectItem>
                                    <SelectItem value="warehouse">Main Warehouse</SelectItem>
                                    <SelectItem value="store_front">Store Front</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Vendor Partner & Reference ID */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Vendor Partner</Label>
                            <Select onValueChange={(val) => setValue('vendorId', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Search Vendors..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.length > 0 ? vendors.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    )) : (
                                        <SelectItem value="none" disabled>No vendors found</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Bill / Invoice #</Label>
                            <Input 
                                {...register('billNumber', { required: true })} 
                                placeholder="INV-2024-001" 
                                className="bg-white"
                            />
                        </div>
                    </div>

                    {/* Expense Mapping & Financial Value (Backend Math Source) */}
                    <div className="grid grid-cols-2 gap-4 border-y py-6 bg-slate-50/50 -mx-6 px-6">
                        <div className="space-y-2">
                            <Label className="font-semibold text-blue-900">Expense Account (GL)</Label>
                            <Select onValueChange={(val) => setValue('expenseAccountId', val)}>
                                <SelectTrigger className="bg-white border-blue-200">
                                    <SelectValue placeholder="Select GL Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {expenseAccounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            <span className="font-mono text-xs text-muted-foreground mr-2">[{a.code}]</span>
                                            {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold text-blue-900">Total Amount (Gross)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">$</span>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    className="pl-7 text-lg font-mono font-bold text-primary border-blue-200 bg-white" 
                                    {...register('amount', { required: true, min: 0.01 })} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Enterprise Compliance Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm">
                                <Calendar className="w-3 h-3 text-muted-foreground" /> Bill Date
                            </Label>
                            <Input type="date" {...register('billDate')} className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm">
                                <Calendar className="w-3 h-3 text-red-500" /> Due Date
                            </Label>
                            <Input type="date" {...register('dueDate', { required: true })} className="bg-white border-red-100" />
                        </div>
                    </div>

                    <DialogFooter className="bg-muted/20 -mx-6 -mb-6 p-6 mt-4">
                        <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" className="px-8 shadow-md" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Posting to Ledger...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Authorize & Post Bill
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}