// src/app/(dashboard)/marketplace/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

function AppCardSkeleton() {
    return (
        <div className="flex flex-col space-y-3 rounded-xl border p-6">
            <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="w-full space-y-2">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
            </div>
            <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="pt-4">
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}

export default function MarketplaceLoading() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header Skeleton */}
            <header>
                <Skeleton className="h-9 w-1/3" />
                <Skeleton className="h-5 w-2/3 mt-2" />
            </header>
            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AppCardSkeleton />
                <AppCardSkeleton />
                <AppCardSkeleton />
                <AppCardSkeleton />
                <AppCardSkeleton />
                <AppCardSkeleton />
            </div>
        </div>
    );
}