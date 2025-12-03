'use client';

import React, { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateReorderSettings } from "@/lib/actions/inventory"; // Ensure you have this action

export interface ProductConfig {
  id: string;
  name: string;
  reorder_point: number | null;
  reorder_quantity: number | null;
  preferred_vendor_id: string | null;
}

export interface Vendor {
  id: string;
  name: string;
}

interface ReorderPointManagerProps {
  product: ProductConfig;
  vendors: Vendor[];
}

export function ReorderPointManager({ product, vendors }: ReorderPointManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [reorderPoint, setReorderPoint] = useState<number>(product.reorder_point || 0);
  const [reorderQty, setReorderQty] = useState<number>(product.reorder_quantity || 0);
  const [vendorId, setVendorId] = useState<string>(product.preferred_vendor_id || "");

  const handleSave = () => {
    startTransition(async () => {
      // Calls the real server action
      const result = await updateReorderSettings(product.id, reorderPoint, reorderQty, vendorId);
      if (result.success) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Replenishment Settings
        </CardTitle>
        <CardDescription>Configure alerts and EOQ.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="rop">Reorder Point</Label>
          <Input 
            id="rop" 
            type="number" 
            value={reorderPoint} 
            onChange={(e) => setReorderPoint(Number(e.target.value))}
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="eoq">Reorder Qty</Label>
          <Input 
            id="eoq" 
            type="number" 
            value={reorderQty} 
            onChange={(e) => setReorderQty(Number(e.target.value))}
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label>Preferred Vendor</Label>
          <Select value={vendorId} onValueChange={setVendorId} disabled={isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Preference</SelectItem>
              {vendors.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/50 px-6 py-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}