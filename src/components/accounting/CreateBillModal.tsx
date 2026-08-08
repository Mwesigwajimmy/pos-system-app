'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { submitVendorBill } from '@/lib/actions/bills'; 
import { toast } from 'sonner';
import { Loader2, Plus, Calendar, Landmark, Globe, MapPin, Hash } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    onSuccess?: () => void;
}

export default function CreateBillModal({ isOpen, onClose, businessId, onSuccess }: CreateBillModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]); // FIXED: Changed from vendors to suppliers
    const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]); // NEW: For invoice fetching
    
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

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                // 1. Fetch from SUPPLIERS (This matches your Supplier Registry screenshot)
                const { data: s } = await supabase
                    .from('suppliers')
                    .select('id, name')
                    .eq('business_id', businessId)
                    .eq('status', 'active');

                // 2. Fetch Expense Accounts
                const { data: a } = await supabase
                    .from('accounting_accounts')
                    .select('id, name, code')
                    .eq('business_id', businessId)
                    .ilike('type', 'expense')
                    .eq('is_active', true);

                // 3. Fetch Locations
                const { data: l } = await supabase
                    .from('locations')
                    .select('id, name')
                    .eq('business_id', businessId)
                    .eq('status', 'active');

                // 4. Fetch UNPAID INVOICES (Deep Interconnect)
                // We fetch invoices where status is NOT paid, including the supplier name
                const { data: inv } = await supabase
                    .from('invoices')
                    .select(`
                        id, 
                        invoice_number, 
                        total_amount,
                        status,
                        suppliers (name)
                    `)
                    .eq('business_id', businessId)
                    .neq('status', 'paid');
                
                if (s) setSuppliers(s);
                if (a) setExpenseAccounts(a || []);
                if (l) setLocations(l || []);
                if (inv) setUnpaidInvoices(inv);
            };
            loadData();
        }
    }, [isOpen, businessId]);

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            const result = await submitVendorBill({ ...data, businessId });
            if (result.success) {
                toast.success("Bill Posted Successfully");
                reset();
                if (onSuccess) onSuccess(); 
                onClose();
            } else {
                toast.error(`Posting Failed: ${result.message}`);
            }
        } catch (error) {
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
                        Generate debt record and post to General Ledger.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
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
                                    <SelectItem value="UGX">UGX - Uganda Shilling</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
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
                                    <SelectValue placeholder="Select Location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Vendor / Supplier Partner</Label>
                            <Select onValueChange={(val) => setValue('vendorId', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Search Suppliers..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Bill / Invoice #</Label>
                            {/* DEEP FIX: Changed Input to Select for Automatic Fetching */}
                            <Select onValueChange={(val) => {
                                setValue('billNumber', val);
                                // Optional: Auto-fill amount if found
                                const selected = unpaidInvoices.find(i => i.invoice_number === val);
                                if (selected) setValue('amount', selected.total_amount.toString());
                            }}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select Pending Invoice" />
                                </SelectTrigger>
                                <SelectContent>
                                    {unpaidInvoices.map(inv => (
                                        <SelectItem key={inv.id} value={inv.invoice_number}>
                                            <span className="font-bold">{inv.invoice_number}</span> 
                                            <span className="text-muted-foreground ml-2">({inv.suppliers?.name})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
                                    Posting...
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