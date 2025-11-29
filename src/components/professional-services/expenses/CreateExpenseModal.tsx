'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';
import { createExpenseAction } from '@/lib/professional-services/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PlusCircle, Check, ChevronsUpDown, UploadCloud, X, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

// --- Shared Types ---
// Ensure this matches your Server Action's return type in @/lib/professional-services/actions
interface FormState {
    success: boolean;
    message: string;
    errors?: Record<string, string[] | undefined>;
}

interface Entity { 
    id: string; 
    name: string; 
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-slate-900 text-white hover:bg-slate-800">
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Expense'}
        </Button>
    );
}

// --- Async Combobox for Dynamic Searching ---
function AsyncCombobox({
    entityType,
    selectedValue,
    onSelect,
    placeholder
}: {
    entityType: 'expense_categories' | 'customers'; // Real table names
    selectedValue: string;
    onSelect: (id: string) => void;
    placeholder: string;
}) {
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(false);
  
    // Fetch initial list or filter
    useEffect(() => {
        if (!open) return;
        const fetchItems = async () => {
            setLoading(true);
            const { data } = await supabase
                .from(entityType)
                .select('id, name')
                .ilike('name', `%${search}%`)
                .eq('status', 'ACTIVE') // Assumption: only show active records
                .limit(10);
            setItems(data || []);
            setLoading(false);
        };
        fetchItems();
    }, [open, search, entityType, supabase]);

    const selectedName = items.find(i => i.id === selectedValue)?.name;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {selectedName || selectedValue ? (items.find(i=>i.id===selectedValue)?.name || "Selected") : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command shouldFilter={false}>
                    <CommandInput placeholder={`Search ${placeholder}...`} value={search} onValueChange={setSearch} />
                    <CommandList>
                        {loading && <div className="p-2 text-sm text-muted-foreground text-center">Loading...</div>}
                        {!loading && items.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem key={item.id} value={item.id} onSelect={() => { onSelect(item.id); setOpen(false); }}>
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

// --- Robust Receipt Uploader ---
function ReceiptUploader({ onUploadSuccess }: { onUploadSuccess: (url: string) => void }) {
    const supabase = createClient();
    const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [preview, setPreview] = useState<string | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("File is too large (Max 5MB)");
            return;
        }

        // Preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setStatus('UPLOADING');

        try {
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const filePath = `receipts/${fileName}`;

            const { error } = await supabase.storage.from('expenses').upload(filePath, file);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('expenses').getPublicUrl(filePath);
            onUploadSuccess(publicUrl);
            setStatus('SUCCESS');
        } catch (error) {
            console.error(error);
            setStatus('ERROR');
        }
    };

    const clearFile = () => {
        setPreview(null);
        setStatus('IDLE');
        onUploadSuccess('');
    };

    if (preview) {
        return (
            <div className="relative w-full h-32 rounded-lg border flex items-center justify-center bg-slate-50 overflow-hidden group">
                {preview.endsWith('.pdf') ? (
                     <div className="flex flex-col items-center text-red-600"><FileText className="h-8 w-8"/><span className="text-xs mt-1">PDF Attached</span></div>
                ) : (
                    <img src={preview} alt="Preview" className="h-full object-contain" />
                )}
                
                {status === 'UPLOADING' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                )}
                
                <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={clearFile}
                >
                    <X className="h-3 w-3" />
                </Button>

                {status === 'SUCCESS' && (
                    <div className="absolute bottom-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center">
                        <Check className="w-3 h-3 mr-1"/> Uploaded
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full h-32 rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative">
            <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleUpload} 
                accept="image/png,image/jpeg,application/pdf"
            />
            <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">Upload Receipt</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG or PDF (Max 5MB)</p>
        </div>
    );
}

// --- Main Modal ---
export function RevolutionaryCreateExpenseModal() {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    
    // Form State
    const [categoryId, setCategoryId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [isBillable, setIsBillable] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState('');

    const initialState: FormState = { success: false, message: '', errors: {} };
    const [formState, formAction] = useFormState(createExpenseAction, initialState);

    useEffect(() => {
        if (formState.message) {
            if (formState.success) {
                toast({ 
                    title: "Expense Recorded", 
                    description: formState.message,
                    className: "bg-green-50 border-green-200"
                });
                setIsOpen(false);
                formRef.current?.reset();
                setCategoryId('');
                setCustomerId('');
                setIsBillable(false);
                setReceiptUrl('');
            } else {
                toast({ 
                    title: "Submission Failed", 
                    description: formState.message, 
                    variant: 'destructive' 
                });
            }
        }
    }, [formState, toast]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="shadow-sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form ref={formRef} action={formAction}>
                    <DialogHeader>
                        <DialogTitle>New Expense Entry</DialogTitle>
                        <DialogDescription>Record a new business expense for approval and reimbursement.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-6 py-4">
                        
                        {/* Left Column: Details */}
                        <div className="col-span-2 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input id="description" name="description" placeholder="e.g. Client Lunch at Bistro" required />
                                {formState.errors?.description && <p className="text-xs text-red-500">{formState.errors.description[0]}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-sm text-slate-500">$</span>
                                <Input id="amount" name="amount" type="number" step="0.01" className="pl-7" placeholder="0.00" required />
                            </div>
                            {formState.errors?.amount && <p className="text-xs text-red-500">{formState.errors.amount[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label>Category</Label>
                            <input type="hidden" name="category_id" value={categoryId} />
                            <AsyncCombobox 
                                entityType="expense_categories" 
                                selectedValue={categoryId} 
                                onSelect={setCategoryId}
                                placeholder="Select category"
                            />
                            {formState.errors?.category_id && <p className="text-xs text-red-500">{formState.errors.category_id[0]}</p>}
                        </div>

                        {/* Billable Toggle */}
                        <div className="col-span-2 flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_billable" className="text-base">Billable Expense</Label>
                                <p className="text-xs text-muted-foreground">Is this expense rechargeable to a client?</p>
                            </div>
                            <Switch id="is_billable" name="is_billable" checked={isBillable} onCheckedChange={setIsBillable} />
                        </div>

                        {isBillable && (
                            <div className="col-span-2 space-y-2 animate-in slide-in-from-top-2">
                                <Label>Client</Label>
                                <input type="hidden" name="customer_id" value={customerId} />
                                <AsyncCombobox 
                                    entityType="customers" 
                                    selectedValue={customerId} 
                                    onSelect={setCustomerId}
                                    placeholder="Select client"
                                />
                            </div>
                        )}

                        {/* Receipt Upload */}
                        <div className="col-span-2 space-y-2">
                            <Label>Receipt Attachment</Label>
                            <input type="hidden" name="receipt_url" value={receiptUrl} />
                            <ReceiptUploader onUploadSuccess={setReceiptUrl} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}