'use client';

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Palette, Globe, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Import Server Action & Type
import { updateStoreSettings, StoreSettingsFormValues } from "@/lib/ecommerce/actions/settings";

// Re-define schema for client validation to match server
const formSchema = z.object({
    storeName: z.string().min(3, "Store name required"),
    themeColor: z.string().regex(/^#/, "Must be hex"),
    currency: z.string().length(3, "Must be 3 chars"),
    seoTitle: z.string().max(60, "Too long"),
    seoDesc: z.string().max(160, "Too long"),
});

interface SettingsProps {
    initialData: StoreSettingsFormValues;
}

export function StorefrontSettings({ initialData }: SettingsProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
  });

  const onSubmit = (data: StoreSettingsFormValues) => {
    startTransition(async () => {
        const result = await updateStoreSettings(data);
        
        if (result.success) {
            toast({ title: "Settings Saved", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6">
            
            {/* 1. BRANDING & APPEARANCE */}
            <Card className="border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        <CardTitle>Branding & Appearance</CardTitle>
                    </div>
                    <CardDescription>
                        Customize how your store looks to your customers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="storeName">Store Name</Label>
                            <Input id="storeName" {...form.register("storeName")} />
                            {form.formState.errors.storeName && (
                                <p className="text-xs text-red-500">{form.formState.errors.storeName.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Currency Code (ISO)</Label>
                            <Input id="currency" {...form.register("currency")} className="uppercase" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="themeColor">Brand Theme Color</Label>
                        <div className="flex gap-3 items-center">
                            <div className="relative h-10 w-20 overflow-hidden rounded-md border shadow-sm">
                                <input
                                    type="color"
                                    id="themeColor"
                                    className="absolute -top-2 -left-2 h-16 w-24 cursor-pointer p-0 border-0"
                                    {...form.register("themeColor")}
                                />
                            </div>
                            <Input 
                                {...form.register("themeColor")} 
                                className="w-32 font-mono uppercase" 
                                placeholder="#000000"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">This color will be used for buttons, links, and highlights.</p>
                    </div>
                </CardContent>
            </Card>

            {/* 2. SEO & METADATA */}
            <Card className="border-zinc-200 dark:border-zinc-800">
                 <CardHeader>
                    <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        <CardTitle>SEO & Metadata</CardTitle>
                    </div>
                    <CardDescription>
                        Optimize your store for search engines (Google, Bing).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="seoTitle">Meta Title</Label>
                        <Input id="seoTitle" {...form.register("seoTitle")} />
                        <p className="text-xs text-muted-foreground text-right">
                            {form.watch("seoTitle")?.length || 0} / 60 characters
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="seoDesc">Meta Description</Label>
                        <Textarea 
                            id="seoDesc" 
                            {...form.register("seoDesc")} 
                            className="resize-none h-24"
                        />
                         <p className="text-xs text-muted-foreground text-right">
                            {form.watch("seoDesc")?.length || 0} / 160 characters
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-t flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isPending ? "Saving Changes..." : "Save Settings"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </form>
  );
}