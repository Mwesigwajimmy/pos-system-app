'use client';

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription 
} from "@/components/ui/card";
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table";
import { 
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, Tag, Megaphone } from "lucide-react";

// Import Server Actions
import { createPromotion, deletePromotion, PromotionFormValues } from "@/lib/ecommerce/actions/promotions";

// --- TYPES ---
export interface Promotion {
  id: string;
  code: string;
  label: string;
  type: "Discount" | "Shipping" | "BOGO" | "Gift";
  value: string;
  currency?: string;
  region: string;
  active: boolean;
  validFrom: string;
  validTo: string;
  tenantId: string;
}

// Schema needs to match server action for client-side validation
const formSchema = z.object({
    code: z.string().min(3, "Code too short").toUpperCase(),
    label: z.string().min(3, "Label required"),
    type: z.enum(["Discount", "Shipping", "BOGO", "Gift"]),
    value: z.string().min(1, "Value required"),
    region: z.string().min(2, "Region required"),
    currency: z.string().optional(),
    validFrom: z.string(),
    validTo: z.string(),
});

export function PromotionsManager({ initialPromotions }: { initialPromotions: Promotion[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        type: "Discount",
        region: "Global",
        currency: "USD"
    }
  });

  const onSubmit = (data: PromotionFormValues) => {
    startTransition(async () => {
        const result = await createPromotion(data);
        if (result.success) {
            toast({ title: "Success", description: result.message });
            setOpen(false);
            form.reset();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    });
  };

  const handleDelete = (id: string) => {
      startTransition(async () => {
          const result = await deletePromotion(id);
          if (!result.success) {
              toast({ title: "Error", description: result.message, variant: "destructive" });
          } else {
              toast({ title: "Deleted", description: "Promotion removed successfully." });
          }
      });
  };

  return (
    <Card className="h-full border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Promotion & Coupon Manager
                </CardTitle>
                <CardDescription>
                Configure multi-region discounts, shipping offers, and seasonal campaigns.
                </CardDescription>
            </div>
            
            {/* CREATE PROMOTION DIALOG */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" /> Create Promotion
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New Promotion</DialogTitle>
                        <DialogDescription>Create a new discount code or automated offer.</DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Promo Code</Label>
                                <Input placeholder="SUMMER2025" {...form.register("code")} />
                                {form.formState.errors.code && <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select onValueChange={(val: any) => form.setValue("type", val)} defaultValue="Discount">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Discount">Discount</SelectItem>
                                        <SelectItem value="Shipping">Free Shipping</SelectItem>
                                        <SelectItem value="BOGO">Buy One Get One</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Internal Label</Label>
                            <Input placeholder="e.g. Summer Sale Campaign" {...form.register("label")} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Value</Label>
                                <Input placeholder="e.g. 15% or 10.00" {...form.register("value")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Input placeholder="USD" {...form.register("currency")} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Region</Label>
                            <Input placeholder="Global, US, EU, etc." {...form.register("region")} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valid From</Label>
                                <Input type="date" {...form.register("validFrom")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Valid To</Label>
                                <Input type="date" {...form.register("validTo")} />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Promotion
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead>Details</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Validity Period</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPromotions.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        No active promotions found.
                    </TableCell>
                </TableRow>
            ) : (
                initialPromotions.map(p => {
                    const isValid = new Date(p.validTo) > new Date();
                    return (
                        <TableRow key={p.id}>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-bold font-mono text-primary">{p.code}</span>
                                    <span className="text-xs text-muted-foreground">{p.label}</span>
                                </div>
                            </TableCell>
                            <TableCell>{p.type}</TableCell>
                            <TableCell className="font-medium">
                                {p.value} {p.currency && <span className="text-xs text-muted-foreground">{p.currency}</span>}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{p.region}</Badge>
                            </TableCell>
                            <TableCell>
                                {p.active && isValid ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                                ) : (
                                    <Badge variant="secondary">Expired</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(p.validFrom), 'MMM dd')} - {format(new Date(p.validTo), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(p.id)}
                                    disabled={isPending}
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}