'use client';

import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';

// --- UI Components (Ensure these exist in your project) ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

// --- Icons ---
import { Trash, PlusCircle, Save, ArrowLeft, AlertCircle } from 'lucide-react';

// --- Server Action ---
import { createOrUpdatePricingRule, RuleFormState } from '@/app/actions/pricing';

// --- Types ---
interface Condition {
    type: 'CUSTOMER' | 'PRODUCT';
    target_id: string;
    quantity_min: number | null;
}

interface Action {
    type: 'FIXED_PRICE' | 'PERCENTAGE_DISCOUNT';
    value: number;
}

interface PricingRuleFormData {
    name: string;
    priority: number;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    conditions: Condition[];
    actions: Action[];
}

interface BuilderProps {
    initialData?: any; // The raw data from Supabase
    customers: { id: string; name: string }[];
    products: { id: string; name: string }[];
}

// --- Submit Button Component (Handles Pending State) ---
function SubmitButton({ isNew }: { isNew: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="min-w-[150px]">
            {pending ? (
                <>Saving...</>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" />
                    {isNew ? 'Create Rule' : 'Update Rule'}
                </>
            )}
        </Button>
    );
}

// --- Main Component ---
export function PricingRuleBuilder({ initialData, customers, products }: BuilderProps) {
    const router = useRouter();
    const { toast } = useToast();

    // Setup React Hook Form
    const { control, handleSubmit, register, watch, formState: { errors } } = useForm<PricingRuleFormData>({
        defaultValues: {
            name: initialData?.name || '',
            priority: initialData?.priority || 0,
            is_active: initialData?.is_active ?? true,
            // Format dates to YYYY-MM-DD for HTML input
            start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : null,
            end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : null,
            conditions: initialData?.conditions?.map((c: any) => ({
                type: c.type,
                target_id: c.target_id?.toString() || '',
                quantity_min: c.quantity_min || 0
            })) || [],
            actions: initialData?.actions?.map((a: any) => ({
                type: a.type,
                value: a.value
            })) || [],
        },
    });

    // Manage dynamic lists (Conditions & Actions)
    const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({ control, name: "conditions" });
    const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({ control, name: "actions" });

    // Handle Server Action Response
    const initialState: RuleFormState = { success: false, message: '' };
    const [state, formAction] = useFormState(createOrUpdatePricingRule, initialState);

    // Watch for success/error to show toasts
    useEffect(() => {
        if (state.success) {
            toast({ title: "Success", description: state.message });
            router.push('/sales/pricing-rules');
            router.refresh();
        } else if (state.message) {
            toast({ title: "Error", description: state.message, variant: "destructive" });
        }
    }, [state, toast, router]);

    // Prepare data for Server Action
    const processSubmit = (data: PricingRuleFormData) => {
        const formData = new FormData();
        
        // 1. Base Rule Data
        const rulePayload = {
            id: initialData?.id, // If ID exists, it's an update
            name: data.name,
            priority: data.priority,
            is_active: data.is_active,
            start_date: data.start_date || null,
            end_date: data.end_date || null,
        };
        formData.append('ruleData', JSON.stringify(rulePayload));

        // 2. Conditions (Convert types safely)
        const conditionsPayload = data.conditions.map(c => ({
            type: c.type,
            target_id: c.target_id,
            quantity_min: Number(c.quantity_min)
        }));
        formData.append('conditions', JSON.stringify(conditionsPayload));

        // 3. Actions (Convert types safely)
        const actionsPayload = data.actions.map(a => ({
            type: a.type,
            value: Number(a.value)
        }));
        formData.append('actions', JSON.stringify(actionsPayload));

        // Trigger Server Action
        formAction(formData);
    };

    const watchedConditions = watch('conditions');

    return (
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-8 pb-10">
            {/* --- Header --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        {initialData ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
                    </h2>
                    <p className="text-muted-foreground">
                        Configure dynamic pricing logic for your sales.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/sales/pricing-rules">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                        </Link>
                    </Button>
                    <SubmitButton isNew={!initialData} />
                </div>
            </div>

            <Separator />

            {/* --- General Information --- */}
            <Card>
                <CardHeader>
                    <CardTitle>General Information</CardTitle>
                    <CardDescription>Basic settings for this rule.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    
                    {/* Name */}
                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="name">Rule Name <span className="text-red-500">*</span></Label>
                        <Input id="name" {...register('name', { required: true })} placeholder="e.g. VIP Wholesale Discount" />
                        {errors.name && <span className="text-xs text-red-500">Name is required</span>}
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Input id="priority" type="number" {...register('priority', { valueAsNumber: true })} placeholder="0" />
                        <p className="text-[0.8rem] text-muted-foreground">Higher numbers run first.</p>
                    </div>

                    {/* Dates */}
                    <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input id="start_date" type="date" {...register('start_date')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="end_date">End Date</Label>
                        <Input id="end_date" type="date" {...register('end_date')} />
                    </div>

                    {/* Active Switch */}
                    <div className="flex items-center space-x-2 pt-8">
                         <Controller control={control} name="is_active" render={({ field }) => (
                            <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
                         )} />
                        <Label htmlFor="is_active">Rule is Active</Label>
                    </div>
                </CardContent>
            </Card>

            {/* --- Conditions Section --- */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Conditions (IF)</CardTitle>
                        <CardDescription>The rule applies if ALL these conditions are met.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendCondition({ type: 'PRODUCT', target_id: '', quantity_min: 1 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Condition
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {conditionFields.length === 0 && (
                        <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/50 text-muted-foreground text-sm">
                            <AlertCircle className="mr-2 h-4 w-4" /> No conditions set. This rule will apply to EVERYTHING.
                        </div>
                    )}
                    
                    {conditionFields.map((field, index) => (
                        <div key={field.id} className="grid gap-4 md:grid-cols-12 p-4 border rounded-lg items-end bg-card shadow-sm">
                            
                            {/* Condition Type */}
                            <div className="md:col-span-3 space-y-2">
                                <Label>Type</Label>
                                <Controller control={control} name={`conditions.${index}.type`} render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CUSTOMER">Customer is...</SelectItem>
                                            <SelectItem value="PRODUCT">Product is...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}/>
                            </div>

                            {/* Target Selection */}
                            <div className="md:col-span-5 space-y-2">
                                <Label>
                                    {watchedConditions[index]?.type === 'CUSTOMER' ? 'Select Customer' : 'Select Product'}
                                </Label>
                                <Controller control={control} name={`conditions.${index}.target_id`} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(watchedConditions[index]?.type === 'CUSTOMER' ? customers : products).map(item => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}/>
                            </div>

                            {/* Min Quantity */}
                            <div className="md:col-span-3 space-y-2">
                                <Label>Min Qty</Label>
                                <Input type="number" {...register(`conditions.${index}.quantity_min`)} placeholder="1" />
                            </div>

                            {/* Remove Button */}
                            <div className="md:col-span-1 flex justify-end">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(index)}>
                                    <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* --- Actions Section --- */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Actions (THEN)</CardTitle>
                        <CardDescription>What price change should happen?</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendAction({ type: 'PERCENTAGE_DISCOUNT', value: 0 })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Action
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {actionFields.length === 0 && (
                        <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg bg-red-50 text-red-600 text-sm">
                            <AlertCircle className="mr-2 h-4 w-4" /> Warning: No actions defined. This rule will do nothing.
                        </div>
                    )}

                    {actionFields.map((field, index) => (
                        <div key={field.id} className="grid gap-4 md:grid-cols-12 p-4 border rounded-lg items-end bg-card shadow-sm">
                            
                            {/* Action Type */}
                            <div className="md:col-span-6 space-y-2">
                                <Label>Action Type</Label>
                                <Controller control={control} name={`actions.${index}.type`} render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FIXED_PRICE">Set Fixed Price ($)</SelectItem>
                                            <SelectItem value="PERCENTAGE_DISCOUNT">Apply Discount (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}/>
                            </div>

                            {/* Value */}
                            <div className="md:col-span-5 space-y-2">
                                <Label>Value</Label>
                                <Input type="number" step="0.01" {...register(`actions.${index}.value`)} placeholder="0.00" />
                            </div>

                            {/* Remove Button */}
                            <div className="md:col-span-1 flex justify-end">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAction(index)}>
                                    <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </form>
    );
}