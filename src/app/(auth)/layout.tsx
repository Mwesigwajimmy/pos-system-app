// src/app/(auth)/layout.tsx
import React from 'react';

// This is a layout component. The 'children' prop will be whatever 
// page is being rendered (e.g., your Login or Signup component).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // This wrapper div provides the consistent styling for all auth pages.
    // It creates a gray background and centers the content both vertically and horizontally.
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {children}
    </div>
  );
}