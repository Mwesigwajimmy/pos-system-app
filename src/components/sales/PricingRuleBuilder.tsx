'use client';

import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/use-toast';
import { createOrUpdatePricingRule, RuleFormState } from '@/lib/sales/actions/pricing';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Trash, PlusCircle } from 'lucide-react';
import Link from 'next/link';

// --- Types ---
interface BuilderProps {
  initialData?: any;
  customers: { id: string, name: string }[];
  products: { id: string, name: string }[];
}

function SubmitButton({ isNew }: { isNew: boolean }) {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending} size="lg">{pending ? 'Saving...' : (isNew ? 'Create and Save Rule' : 'Update Rule')}</Button>
}

// --- The Main Builder Component ---
export function PricingRuleBuilder({ initialData, customers, products }: BuilderProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { control, handleSubmit, register, watch, setValue } = useForm({
        defaultValues: initialData || {
            name: '',
            priority: 0,
            is_active: true,
            start_date: null,
            end_date: null,
            conditions: [],
            actions: [],
        },
    });

    const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({ control, name: "conditions" });
    const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({ control, name: "actions" });

    const initialState: RuleFormState = { success: false, message: '' };
    const [formState, formAction] = useFormState(createOrUpdatePricingRule, initialState);

    useEffect(() => {
        if (formState.success) {
            toast({ title: "Success!", description: formState.message });
        } else if (formState.message) {
            toast({ title: "Error", description: formState.message, variant: "destructive" });
        }
    }, [formState, toast]);

    const processSubmit = (data: any) => {
        const formData = new FormData();
        const ruleData = { id: initialData?.id, name: data.name, priority: data.priority, is_active: data.is_active, start_date: data.start_date, end_date: data.end_date };
        formData.append('ruleData', JSON.stringify(ruleData));
        formData.append('conditions', JSON.stringify(data.conditions.map((c: any) => ({...c, quantity_min: Number(c.quantity_min) || null }))));
        formData.append('actions', JSON.stringify(data.actions.map((a: any) => ({...a, value: Number(a.value) }))));
        formAction(formData);
    };
    
    const watchedConditions = watch('conditions');

    return (
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">{initialData ? 'Edit Pricing Rule' : 'Create New Pricing Rule'}</h2>
                    <p className="text-muted-foreground">Define the conditions (IF) and actions (THEN) for this pricing rule.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild><Link href="/sales/pricing-rules">Cancel</Link></Button>
                    <SubmitButton isNew={!initialData} />
                </div>
            </div>

            {/* --- General Rule Details --- */}
            <Card>
                <CardHeader><CardTitle>General Details</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="name">Rule Name</Label>
                        <Input id="name" {...register('name')} placeholder="e.g., VIP Customer Discount" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Input id="priority" type="number" {...register('priority', { valueAsNumber: true })} placeholder="Higher number runs first" />
                    </div>
                    <div className="flex items-center space-x-2">
                         <Controller control={control} name="is_active" render={({ field }) => (
                            <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
                         )} />
                        <Label htmlFor="is_active">Rule is Active</Label>
                    </div>
                </CardContent>
            </Card>

            {/* --- Conditions (IF...) --- */}
            <Card>
                <CardHeader>
                    <CardTitle>Conditions (IF)</CardTitle>
                    <CardDescription>The rule will apply IF all of these conditions are met.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {conditionFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg bg-muted/50">
                            <div className="grid md:grid-cols-3 gap-4 items-end">
                                <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                    <div className="space-y-1">
                                        <Label>Condition Type</Label>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CUSTOMER">Customer is...</SelectItem>
                                                <SelectItem value="PRODUCT">Product is...</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}/>
                                
                                {watchedConditions[index]?.type && (
                                    <Controller control={control} name={`conditions.${index}.target_id`} render={({ field }) => (
                                         <div className="space-y-1">
                                            <Label>{watchedConditions[index].type === 'CUSTOMER' ? 'Select Customer' : 'Select Product'}</Label>
                                            <SearchableCombobox
                                                options={(watchedConditions[index].type === 'CUSTOMER' ? customers : products).map(item => ({ value: item.id, label: item.name }))}
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder={`Select a ${watchedConditions[index].type.toLowerCase()}...`}
                                            />
                                        </div>
                                    )}/>
                                )}
                                <div className="flex items-center gap-2">
                                     <div className="space-y-1 flex-grow">
                                        <Label>Min. Quantity</Label>
                                        <Input type="number" {...register(`conditions.${index}.quantity_min`)} placeholder="e.g., 10" />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(index)}><Trash className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendCondition({ type: 'PRODUCT', target_id: '', quantity_min: null })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Condition
                    </Button>
                </CardContent>
            </Card>

            {/* --- Actions (THEN...) --- */}
             <Card>
                <CardHeader>
                    <CardTitle>Actions (THEN)</CardTitle>
                    <CardDescription>Apply the following price adjustments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {actionFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg bg-muted/50">
                             <div className="grid md:grid-cols-3 gap-4 items-end">
                                 <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                     <div className="space-y-1">
                                        <Label>Action Type</Label>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="FIXED_PRICE">Set Fixed Price</SelectItem>
                                                <SelectItem value="PERCENTAGE_DISCOUNT">Apply Percentage Discount</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                 )}/>
                                 <div className="flex items-center gap-2">
                                     <div className="space-y-1 flex-grow">
                                        <Label>Value</Label>
                                        <Input type="number" step="0.01" {...register(`actions.${index}.value`)} placeholder="e.g., 99.99 or 15" required />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAction(index)}><Trash className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            </div>
                        </div>
                    ))}
                     <Button type="button" variant="outline" onClick={() => appendAction({ type: 'PERCENTAGE_DISCOUNT', value: 0 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Action
                    </Button>
                </CardContent>
            </Card>
        </form>
    );
}