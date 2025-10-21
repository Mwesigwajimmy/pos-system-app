// src/app/(dashboard)/settings/branding/page.tsx
import type { Metadata } from 'next';
import BrandingManager from '@/components/settings/BrandingManager'; // We will create this
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Custom Branding',
  description: 'Customize the look and feel of your application with your own logo and colors.',
};

export default function BrandingPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground">
                <Link href="/settings" className="hover:underline">Settings</Link>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="font-medium text-foreground" aria-current="page">
                    Branding
                </span>
            </nav>
            <header>
                <h1 className="text-3xl font-bold tracking-tight">
                    Custom Branding
                </h1>
                <p className="text-muted-foreground mt-1">
                    Upload your logo and set a primary color to personalize the application for your team.
                </p>
            </header>
            <BrandingManager />
        </div>
    );
}