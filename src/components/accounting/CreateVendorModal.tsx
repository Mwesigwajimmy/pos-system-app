'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { registerVendor } from '@/lib/actions/bills';
import { toast } from 'sonner';
import { Loader2, UserPlus, Mail, Phone, MapPin, User, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateVendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
}

export default function CreateVendorModal({ isOpen, onClose, businessId }: CreateVendorModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        const result = await registerVendor({ ...data, businessId });
        if (result.success) {
            toast.success("Vendor Registered Successfully");
            reset();
            onClose();
        } else {
            toast.error(`Registry Failed: ${result.message}`);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" /> Register New Enterprise Vendor
                    </DialogTitle>
                    <DialogDescription>Add a new partner to the UUID-secured vendor registry.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Vendor / Company Name</Label>
                        <Input {...register('name', { required: true })} placeholder="Global Supplies Ltd" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><User className="w-3 h-3"/> Contact Person</Label>
                            <Input {...register('contact_person')} placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Mail className="w-3 h-3"/> Email</Label>
                            <Input type="email" {...register('email')} placeholder="vendor@example.com" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Phone className="w-3 h-3"/> Phone Number</Label>
                        <Input {...register('phone')} placeholder="+256..." />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><MapPin className="w-3 h-3"/> Physical Address</Label>
                        <Input {...register('address')} placeholder="Plot 10, Kampala" />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                            Register Vendor
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}