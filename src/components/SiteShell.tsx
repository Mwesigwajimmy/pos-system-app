'use client';

import { usePathname } from 'next/navigation';
import SiteFooter from '@/components/SiteFooter';

// This wraps EVERY route (app/layout.tsx has no way to scope it to just the
// public pages), so it decides for itself when to show the footer.
//
// IMPORTANT: next.config.ts serves the site under a locale prefix (/en, /fr,
// /lg, ...). usePathname() returns the URL the BROWSER sees, so on production
// it is "/en", "/en/features", etc. — NOT "/" or "/features". We therefore
// strip a leading locale segment before matching, otherwise every route looks
// non-public and the footer never renders.
const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'lg', 'nl', 'no', 'nyn', 'pt-BR', 'ru', 'rw', 'sw', 'zh'];

const PUBLIC_ROUTE_PREFIXES = [
  '/about', '/aura-ai', '/blog', '/careers', '/contact', '/courses',
  '/donate', '/download', '/features', '/help-centre', '/industries',
  '/login', '/newsletter', '/pricing', '/signup', '/updates',
];

function stripLocale(pathname: string): string {
  // "/en" -> "/", "/en/features" -> "/features", "/features" -> "/features"
  const segments = pathname.split('/'); // ["", "en", "features"]
  if (segments.length > 1 && SUPPORTED_LOCALES.includes(segments[1])) {
    const rest = '/' + segments.slice(2).join('/');
    return rest === '/' ? '/' : rest.replace(/\/$/, '');
  }
  return pathname;
}

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const rawPath = usePathname() || '/';
  const pathname = stripLocale(rawPath);

  const isPublicRoute =
    pathname === '/' ||
    PUBLIC_ROUTE_PREFIXES.some(
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
