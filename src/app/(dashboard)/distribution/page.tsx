// src/app/(dashboard)/distribution/page.tsx

import DistributionDashboard from "@/components/distribution/DistributionDashboard";

export const metadata = {
  title: "Distribution & Van Sales",
  description: "Manage sales routes, van loading, and route settlements.",
};

export default function DistributionPage() {
    return <DistributionDashboard />;
}