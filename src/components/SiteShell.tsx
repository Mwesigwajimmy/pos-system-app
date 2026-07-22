'use client';

import { usePathname } from 'next/navigation';
import SiteFooter from '@/components/SiteFooter';

// This wraps EVERY route (app/layout.tsx has no way to scope it to just the
// public pages), so it has to decide for itself when to show the footer.
// Rather than trying to list every dashboard route (there are dozens, and
// they're added over time), this lists the small, stable set of public
// marketing routes and only shows the footer for those — anything else
// (dashboard pages now or in the future) gets no footer, with no directory
// moves required.
const PUBLIC_ROUTE_PREFIXES = [
  '/about', '/aura-ai', '/blog', '/careers', '/contact', '/courses',
  '/donate', '/download', '/features', '/help-centre', '/industries',
  '/login', '/newsletter', '/pricing', '/signup', '/updates',
];

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === '/' || PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const hideFooter = !isPublicRoute || pathname === '/signup';
  return (
    <>
      {children}
      {!hideFooter && <SiteFooter />}
    </>
  );
}
