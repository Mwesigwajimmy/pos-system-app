'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
// 1. IMPORT THE SHARED CUSTOMER TYPE (This is the main fix)
import { Customer } from '@/types/dashboard'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// 2. DELETE the local Customer interface that was here. It's no longer needed.

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  // This now correctly uses the imported Customer type
  onSelectCustomer: (customer: Customer | null) => void; 
}

async function searchCustomers(searchTerm: string): Promise<Customer[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('search_customers', { p_search_text: searchTerm });
    if (error) throw new Error("Could not search for customers.");
    return data || [];
}

export default function CustomerSearchModal({ isOpen, onClose, onSelectCustomer }: CustomerSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customer-search', debouncedSearchTerm],
    queryFn: () => searchCustomers(debouncedSearchTerm),
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Select Customer</DialogTitle><DialogDescription>Search for a customer or continue as a walk-in.</DialogDescription></DialogHeader>
        <Input placeholder="Search by name or phone number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <div className="max-h-60 overflow-y-auto space-y-2">
          {isLoading && <p>Searching...</p>}
          {customers?.map(customer => (
            <div key={customer.id} onClick={() => onSelectCustomer(customer)} className="p-3 border rounded-lg cursor-pointer hover:bg-secondary">
              <p className="font-semibold">{customer.name}</p>
              {/* This now correctly uses the optional phone_number from the shared type */}
              <p className="text-sm text-muted-foreground">{customer.phone_number}</p>
            </div>
          ))}
        </div>
        <Button variant="secondary" onClick={() => onSelectCustomer(null)}>Continue as Walk-in Customer</Button>
      </DialogContent>
    </Dialog>
  );
}