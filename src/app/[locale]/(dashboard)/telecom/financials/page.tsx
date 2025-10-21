'use client';

import { FloatRequestComponent } from '@/components/telecom/financials/FloatRequestComponent';
import { RequestApprovalComponent } from '@/components/telecom/financials/RequestApprovalComponent';
import { PettyCashManagementComponent } from '@/components/telecom/financials/PettyCashManagementComponent';
import { BankStatementUploadComponent } from '@/components/telecom/financials/BankStatementUploadComponent';
import { ShiftReconciliationComponent } from '@/components/telecom/financials/ShiftReconciliationComponent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FinancialsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Financial Controls</h1>
        <p className="text-muted-foreground">Manage float, reconcile shifts, and track all financial movements.</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Components for general financial tasks */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Petty Cash Management</CardTitle>
            </CardHeader>
            <CardContent>
              <PettyCashManagementComponent />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bank Statement Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <BankStatementUploadComponent />
            </CardContent>
          </Card>
        </div>

        {/* Components for agent-specific tasks */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Shift Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
              <ShiftReconciliationComponent />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Request Float</CardTitle>
            </CardHeader>
            <CardContent>
              <FloatRequestComponent />
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Pending Float Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestApprovalComponent />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}