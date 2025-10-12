// src/app/(dashboard)/telecom/operator/page.tsx

// Import the new interactive component we just created
import OperatorDashboard from '@/components/telecom/OperatorDashboard';

// This is now a clean Server Component whose only job is to render our interactive Client Component.
export default function OperatorPage() {
  return <OperatorDashboard />;
}