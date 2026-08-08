'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreateVendorModal from "@/components/accounting/CreateVendorModal";

export default function VendorRegistryClient({ businessId }: { businessId: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsModalOpen(true)} className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> Add New Vendor
            </Button>
            
            <CreateVendorModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                businessId={businessId} 
            />
        </>
    );
}