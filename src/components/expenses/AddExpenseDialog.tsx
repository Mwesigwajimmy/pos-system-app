'use client';
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ExpenseCategory { id: number; name: string; }

async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('accounts').select('id, name').eq('type', 'EXPENSE').order('name');
    if (error) throw new Error("Could not fetch expense categories.");
    return data || [];
}

async function addExpense(expenseData: any) {
    const supabase = createClient();
    const { error } = await supabase.rpc('record_expense', expenseData);
    if (error) throw error;
}

export default function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const queryClient = useQueryClient();
  const { data: categories, isLoading: isLoadingCategories } = useQuery({ queryKey: ['expenseCategories'], queryFn: fetchExpenseCategories });

  const mutation = useMutation({
    mutationFn: addExpense,
    onSuccess: () => {
      toast.success("Expense recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setOpen(false);
    },
    onError: (error) => toast.error(`Failed to record expense: ${error.message}`),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
        p_description: formData.get('description') as string,
        p_amount: Number(formData.get('amount')),
        p_category_id: Number(formData.get('category_id')),
        p_expense_date: format(date!, 'yyyy-MM-dd'),
        p_receipt_url: null, // We can add file uploads later
    };
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add New Expense</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Record New Expense</DialogTitle><DialogDescription>Add a new business expense to your financial records.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} id="add-expense-form" className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="description" className="text-right">Description</Label><Input id="description" name="description" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="amount" className="text-right">Amount</Label><Input id="amount" name="amount" type="number" step="any" className="col-span-3" required /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="category_id" className="text-right">Category</Label><Select name="category_id" required><SelectTrigger className="col-span-3"><SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select a category"} /></SelectTrigger><SelectContent>{categories?.map(cat => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className="col-span-3 justify-start text-left font-normal">{date ? format(date, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent></Popover></div>
        </form>
        <DialogFooter><Button type="submit" form="add-expense-form" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Expense"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}