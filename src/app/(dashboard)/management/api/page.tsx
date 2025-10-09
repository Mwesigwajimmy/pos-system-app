// src/app/(dashboard)/management/api/page.tsx

import ApiSettingsManager from "@/components/management/ApiSettingsManager";

export const metadata = {
  title: "API & Integrations",
  description: "Manage API keys to connect external services to your UG-BizSuite account.",
};

export default function ApiSettingsPage() {
  return <ApiSettingsManager />;
}