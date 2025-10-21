// src/app/(dashboard)/marketplace/error.tsx
'use client'; 

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto py-20 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Could Not Load Marketplace</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error.message}</p>
        <Button onClick={() => reset()}>
            Try again
        </Button>
    </div>
  );
}