'use client';

import React from 'react';
import NotificationsFeed from '@/components/activities/NotificationsFeed';

export default function ActivitiesNotificationsPage() {
  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
         <h1 className="text-2xl font-bold text-gray-900">Activity Center</h1>
         <p className="text-gray-500 text-sm">Stay updated with system alerts.</p>
      </div>

      {/* 
         FIXED: Removed 'currentUser' prop. 
         The component now safely fetches the user session itself.
      */}
      <NotificationsFeed />
    </div>
  );
}