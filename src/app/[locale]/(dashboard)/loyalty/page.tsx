import LoyaltySettingsManager from "@/components/settings/LoyaltySettingsManager";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Loyalty Program Settings",
  description: "Configure and manage your customer loyalty and rewards program.",
};

export default function LoyaltyPage() {
    return (
        <div className="space-y-6">
            {/* This page simply renders our main client component */}
            <LoyaltySettingsManager />
        </div>
    );
}