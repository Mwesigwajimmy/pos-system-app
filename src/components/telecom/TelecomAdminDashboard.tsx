'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, UserPlus, CheckCircle, Hourglass, ClipboardCheck } from 'lucide-react';
import { StartShiftModal } from './StartShiftModal';
import { ReconciliationModal } from './ReconciliationModal';

type Employee = { id: string; full_name: string; };

export function TelecomAdminDashboard({ data, employees, pendingRequests, onStartShift, isStartingShift, onApproveRequest, onReconcile, isReconciling, reconciliationData, onCloseReconciliation }: any) {
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [reconcileAgent, setReconcileAgent] = useState<{ id: string, name: string} | null>(null);

    const handleReconcileClick = (agent: { user_id: string, full_name: string }) => {
        setReconcileAgent({ id: agent.user_id, name: agent.full_name });
    };

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">Admin Telecom Dashboard</h1>
                    <Button onClick={() => setIsShiftModalOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Start Agent Shift</Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Pending Float Requests</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Service</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[120px]"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {pendingRequests.length > 0 ? pendingRequests.map((req: any) => (
                                    <TableRow key={req.id}>
                                        <TableCell>{req.agent_name}</TableCell>
                                        <TableCell>{req.provider_name} {req.service_type}</TableCell>
                                        <TableCell className="text-right font-bold">UGX {req.amount.toLocaleString()}</TableCell>
                                        <TableCell><Button size="sm" onClick={() => onApproveRequest(req.id)}><CheckCircle className="mr-2 h-4 w-4"/> Approve</Button></TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending requests.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Active Agent Shifts</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Shift Started</TableHead><TableHead className="text-right">Issued Float</TableHead><TableHead className="w-[120px]"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data?.active_agents?.length > 0 ? data.active_agents.map((agent: any) => (
                                    <TableRow key={agent.user_id}>
                                        <TableCell>{agent.full_name}</TableCell>
                                        <TableCell>{new Date(agent.last_issued_at).toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-bold">UGX {agent.current_float_balance.toLocaleString()}</TableCell>
                                        <TableCell><Button size="sm" variant="destructive" onClick={() => handleReconcileClick(agent)}><ClipboardCheck className="mr-2 h-4 w-4"/> Reconcile</Button></TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No active shifts.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <StartShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} employees={employees} onStartShift={onStartShift} isPending={isStartingShift} />
            <ReconciliationModal 
                agent={reconcileAgent} 
                isOpen={!!reconcileAgent} 
                onClose={() => setReconcileAgent(null)} 
                onSubmit={onReconcile}
                isPending={isReconciling}
                reportData={reconciliationData}
                onCloseReport={onCloseReconciliation}
            />
        </>
    );
}