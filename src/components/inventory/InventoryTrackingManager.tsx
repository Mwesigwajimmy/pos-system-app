'use client';

import React, { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { ScanBarcode, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { updateTrackingMethod } from "@/lib/actions/inventory";

// 1. Strict Type Definition matching DB
export type TrackingMethod = 'SERIAL' | 'LOT' | 'NONE';

interface InventoryTrackingManagerProps {
  productId: string;
  currentMethod: TrackingMethod;
}

export function InventoryTrackingManager({ productId, currentMethod }: InventoryTrackingManagerProps) {
  const [method, setMethod] = useState<TrackingMethod>(currentMethod);
  const [isPending, startTransition] = useTransition();

  // Handle Save
  const handleSave = () => {
    if (method === currentMethod) return;

    startTransition(async () => {
      const result = await updateTrackingMethod(productId, method);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanBarcode className="h-5 w-5 text-primary" />
          Inventory Tracking Method
        </CardTitle>
        <CardDescription>
          Define how this product is tracked in the warehouse.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {method !== currentMethod && (
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md flex items-start gap-2 text-sm border border-yellow-200 mb-4">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <p>
              Changing tracking methods may affect existing stock records. 
              Ensure all current stock is reconciled before saving.
            </p>
          </div>
        )}

        <RadioGroup 
          value={method} 
          onValueChange={(val) => setMethod(val as TrackingMethod)}
          disabled={isPending}
          className="grid gap-4 md:grid-cols-3"
        >
          {/* Option 1: None */}
          <div>
            <RadioGroupItem value="NONE" id="none" className="peer sr-only" />
            <Label
              htmlFor="none"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer h-full"
            >
              <span className="text-lg font-bold mb-2">Basic</span>
              <span className="text-xs text-center text-muted-foreground">
                Track generic quantity only (e.g., "50 units").
              </span>
            </Label>
          </div>

          {/* Option 2: Serial */}
          <div>
            <RadioGroupItem value="SERIAL" id="serial" className="peer sr-only" />
            <Label
              htmlFor="serial"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer h-full"
            >
              <span className="text-lg font-bold mb-2">Serial #</span>
              <span className="text-xs text-center text-muted-foreground">
                Unique ID for every single unit (e.g., Electronics).
              </span>
            </Label>
          </div>

          {/* Option 3: Lot */}
          <div>
            <RadioGroupItem value="LOT" id="lot" className="peer sr-only" />
            <Label
              htmlFor="lot"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer h-full"
            >
              <span className="text-lg font-bold mb-2">Batch / Lot</span>
              <span className="text-xs text-center text-muted-foreground">
                Track groups by expiry or production batch (e.g., Food/Meds).
              </span>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
      <CardFooter className="border-t bg-muted/40 px-6 py-4 flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isPending || method === currentMethod}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Updating..." : "Update Method"}
        </Button>
      </CardFooter>
    </Card>
  );
}