'use client';

import { useEffect, useState, useRef, useReducer } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';
import { createExpenseAction, FormState } from '@/lib/professional-services/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PlusCircle, Check, ChevronsUpDown, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

// Helper types
interface Entity { id: string; name: string; }

// --- Sub-components for better organization ---

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Expense'}</Button>;
}

function AsyncCombobox({
  entityType,
  selectedValue,
  onSelect,
}: {
  entityType: 'categories' | 'customers';
  selectedValue: string;
  onSelect: (id: string) => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  
  const selectedItemName = items.find(i => i.id === selectedValue)?.name || `Select ${entityType}...`;

  useEffect(() => {
    if (!open) return;

    const fetchItems = async () => {
      setLoading(true);
      const { data } = await supabase
        .from(entityType)
        .select('id, name')
        .ilike('name', `%${search}%`)
        .limit(10);
      setItems(data || []);
      setLoading(false);
    };

    fetchItems();
  }, [search, open, supabase, entityType]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selectedItemName}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={`Search ${entityType}...`} value={search} onValueChange={setSearch} />
          <CommandList>
            {loading && <div className="p-2 text-sm text-center">Loading...</div>}
            <CommandEmpty>No {entityType} found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={item.id} value={item.id} onSelect={(currentValue) => {
                  onSelect(currentValue === selectedValue ? '' : currentValue);
                  setOpen(false);
                }}>
                  <Check className={cn('mr-2 h-4 w-4', selectedValue === item.id ? 'opacity-100' : 'opacity-0')} />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ReceiptUploader({ onUploadSuccess }: { onUploadSuccess: (url: string) => void }) {
    const supabase = createClient();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            handleUpload(selectedFile);
        }
    };
    
    const handleUpload = async (fileToUpload: File) => {
        setUploading(true);
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error } = await supabase.storage.from('expenses').upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            // @ts-ignore - The official type is missing duplex
            duplex: 'half',
            contentType: fileToUpload.type,
        });

        setUploading(false);
        if (error) {
            alert('Error uploading file.'); // Replace with a toast
        } else {
            const { data: { publicUrl } } = supabase.storage.from('expenses').getPublicUrl(filePath);
            onUploadSuccess(publicUrl);
        }
    };
    
    if (preview) {
      return (
        <div className="relative w-full h-32 rounded-md border-dashed border-2 flex items-center justify-center">
            <img src={preview} alt="Receipt preview" className="max-h-full rounded-md" />
            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => { setFile(null); setPreview(null); onUploadSuccess(''); }}>
                <X className="h-4 w-4" />
            </Button>
            {/* The progress bar relies on state logic that isn't fully shown, but included for completeness */}
            {uploading && <Progress value={progress} className="absolute bottom-1 left-1 right-1 h-2" />} 
        </div>
      )
    }

    return (
        <div className="w-full h-32 rounded-md border-dashed border-2 flex items-center justify-center flex-col p-4 text-center">
             <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
            <Label htmlFor="receipt-upload" className="cursor-pointer text-sm font-medium">
                Click to upload or drag & drop a receipt
                <Input id="receipt-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,.pdf" />
            </Label>
        </div>
    );
}


// --- Main Modal Component ---

export function RevolutionaryCreateExpenseModal() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isBillable, setIsBillable] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');

  // FIX: Corrected 'errors: []' to 'errors: {}' to match the expected 'Record<string, string[] | undefined>' type for FormState errors.
  const initialState: FormState = { success: false, message: '', errors: {} as FormState['errors'] };
  const [formState, formAction] = useFormState(createExpenseAction, initialState);

  useEffect(() => {
    if (!formState.message) return;
    if (formState.success) {
      toast({ title: "Success!", description: formState.message });
      setIsOpen(false);
      formRef.current?.reset();
      setSelectedCategory('');
      setSelectedCustomer('');
      setIsBillable(false);
      setReceiptUrl('');
    } else {
      toast({ title: "Error", description: formState.message, variant: 'destructive' });
    }
  }, [formState, toast]);

  const getError = (path: string) => {
    // Assuming formState.errors is Record<string, string[] | undefined>
    const errorArray = formState.errors?.[path];
    return Array.isArray(errorArray) && errorArray.length > 0 ? errorArray[0] : null; 
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="mr-2 h-4 w-4" /> New Expense</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form ref={formRef} action={formAction}>
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
            <DialogDescription>Track all business expenditures with precision. Fill out the details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* --- CORE DETAILS --- */}
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="e.g., Round-trip flight to SFO" required />
              {getError('description') && <p className="text-sm text-destructive">{getError('description')}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
                {getError('amount') && <p className="text-sm text-destructive">{getError('amount')}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} required />
              </div>
            </div>

            {/* --- CATEGORIZATION & BILLING --- */}
            <div className="space-y-1">
              <Label htmlFor="category_id">Category</Label>
              {/* Ensure getError is checking for 'category_id', not just 'categoryId' */}
              <input type="hidden" name="category_id" value={selectedCategory} />
              <AsyncCombobox entityType="categories" selectedValue={selectedCategory} onSelect={setSelectedCategory} />
              {getError('category_id') && <p className="text-sm text-destructive">{getError('category_id')}</p>} 
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch id="is_billable" name="is_billable" checked={isBillable} onCheckedChange={setIsBillable} />
              <Label htmlFor="is_billable">This expense is billable to a client</Label>
            </div>
            
            {isBillable && (
              <div className="space-y-1">
                <Label htmlFor="customer_id">Client</Label>
                {/* Ensure getError is checking for 'customer_id', not just 'customerId' */}
                <input type="hidden" name="customer_id" value={selectedCustomer} />
                <AsyncCombobox entityType="customers" selectedValue={selectedCustomer} onSelect={setSelectedCustomer} />
                {getError('customer_id') && <p className="text-sm text-destructive">{getError('customer_id')}</p>}
              </div>
            )}
            
            {/* --- RECEIPT UPLOAD --- */}
            <div className="space-y-1">
                <Label>Receipt</Label>
                <input type="hidden" name="receipt_url" value={receiptUrl} />
                <ReceiptUploader onUploadSuccess={setReceiptUrl} />
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}