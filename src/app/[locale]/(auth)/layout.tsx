// src/app/(auth)/layout.tsx
import React from 'react';

// This layout is specifically for authentication pages (login, signup, etc.)
// It should be minimal and NOT include components like AppLayout, Sidebar, Header,
// or the CopilotToggleButton, as those depend on an authenticated user with a business profile.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Authentication pages usually have a very simple layout centered on the screen.
  // The global providers (BusinessProvider, GlobalCopilotProvider) are still available
  // from the root layout, but AppLayout and CopilotToggleButton should NOT be rendered here.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {children}
    </div>
  );
}