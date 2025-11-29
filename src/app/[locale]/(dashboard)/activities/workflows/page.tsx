'use client';

import React from 'react';
import WorkflowActivityLog from '@/components/activities/WorkflowActivityLog';

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Status</h1>
        <p className="text-gray-500">
            Real-time tracking of approval chains for Invoice #2025-UG-17.
        </p>
      </div>

      {/* 
        FIXED: Passed the required 'workflowId' prop.
        This resolves the "Property 'workflowId' is missing" error.
      */}
      <WorkflowActivityLog workflowId="wf-invoice-approval-001" />
      
    </div>
  );
}