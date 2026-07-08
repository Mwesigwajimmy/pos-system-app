'use client';

import { usePathname } from 'next/navigation';
import SiteFooter from '@/components/Footer';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideFooter = pathname === '/signup';
  return (
    <>
      {children}
      {!hideFooter && <SiteFooter />}
    </>
  );
}
