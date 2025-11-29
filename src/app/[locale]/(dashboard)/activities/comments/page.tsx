'use client';

import React from 'react';
import CommentsThread from '@/components/activities/CommentsThread';

export default function ThreadCommentsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Invoice Discussion
        </h1>
        <p className="text-muted-foreground">
            Activity log for Invoice #2025-UG-17
        </p>
      </div>

      {/* 
         FIXED: 
         1. Passed 'threadId' instead of 'threadRef'.
         2. Removed 'currentUser' (Component handles auth now).
      */}
      <CommentsThread threadId="invoice-2025-UG-17" />
    </div>
  );
}