import { redirect } from 'next/navigation';

/**
 * This is the root page for the /finance route.
 * It has no UI of its own. Its only purpose is to immediately
 * redirect the user to the first and most relevant sub-page
 * within the finance section, which is /finance/tax-management.
 * This prevents users from ever seeing a 404 error when they
 * navigate to the base /finance URL.
 */
export default function FinanceRootPage() {
  // Use the redirect function from Next.js to perform a server-side redirect.
  redirect('/finance/tax-management');
}