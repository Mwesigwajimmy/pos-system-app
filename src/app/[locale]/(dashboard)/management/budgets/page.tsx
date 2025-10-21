// src/app/(dashboard)/management/budgets/page.tsx

import BudgetManager from "@/components/management/BudgetManager";

export const metadata = {
  title: "Budget Management",
  description: "Create and track departmental or project-based budgets in real-time.",
};

export default function BudgetsPage() {
  return <BudgetManager />;
}