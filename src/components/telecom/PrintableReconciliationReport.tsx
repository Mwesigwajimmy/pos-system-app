'use client';
import React from 'react';

export const PrintableReconciliationReport = React.forwardRef(({ reportData }: any, ref: any) => {
    const varianceClass = reportData.status === 'Surplus' ? 'text-green-600' : reportData.status === 'Shortage' ? 'text-destructive' : '';
    const ReportRow = ({ label, value }: { label: string, value: any }) => (
        <div className="flex justify-between py-2 border-b"><span className="text-sm text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
    );
    return (
        <div ref={ref} className="p-4 font-sans text-sm">
            <div className="text-center mb-4">
                <h1 className="font-bold text-lg">Agent Shift Reconciliation</h1>
                <p className="text-xs text-muted-foreground">{new Date(reportData.shift_end_time).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
                <ReportRow label="Agent Name" value={reportData.agent_name} />
                <ReportRow label="Starting Float" value={`UGX ${reportData.starting_float.toLocaleString()}`} />
                <ReportRow label="Total Sales Value" value={`UGX ${reportData.total_sales_value.toLocaleString()}`} />
                <ReportRow label="Agent Operational Expenses" value={`- UGX ${reportData.total_agent_expenses.toLocaleString()}`} />
                <ReportRow label="Total Commission Earned" value={`UGX ${reportData.total_commissions_earned.toLocaleString()}`} />
                <div className="!mt-4 pt-2 border-t">
                    <ReportRow label="Expected Cash on Hand" value={`UGX ${reportData.expected_cash_on_hand.toLocaleString()}`} />
                </div>
                <ReportRow label="Actual Cash Counted" value={`UGX ${reportData.actual_cash_counted.toLocaleString()}`} />
                 <div className="!mt-4 pt-2 border-t font-bold text-base">
                    <div className={`flex justify-between py-2 ${varianceClass}`}>
                        <span>Variance ({reportData.status})</span>
                        <span>UGX {reportData.variance.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});
PrintableReconciliationReport.displayName = 'PrintableReconciliationReport';