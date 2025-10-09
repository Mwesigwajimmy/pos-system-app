// src/app/(dashboard)/sacco/savings-products/page.tsx

import SavingsProductsManager from "@/components/sacco/SavingsProductsManager";

export const metadata = {
  title: "Manage Savings Products",
  description: "Create and manage the different types of savings accounts your SACCO offers.",
};

export default function SavingsProductsPage() {
  return <SavingsProductsManager />;
}