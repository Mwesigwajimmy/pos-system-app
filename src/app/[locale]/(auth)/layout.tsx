// src/app/[locale]/(auth)/layout.tsx
import React from 'react';

// This layout is a simple "passthrough" for authentication pages.
// It ensures that no dashboard components (like AppLayout, Sidebar, etc.) are rendered.
// The root layout provides the necessary global contexts.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}