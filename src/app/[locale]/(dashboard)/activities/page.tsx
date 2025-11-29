'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ActivitiesDashboardPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activities & Audit Dashboard</h1>
        <p className="text-muted-foreground">Monitor, search, and analyze all activities—users, workflows, tasks and more.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>All actions—user/system/integrations—for compliance and troubleshooting.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="./activities/timeline">View Timeline</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Workflow Logs</CardTitle>
            <CardDescription>Track approvals and automated process chains globally.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="./activities/workflows">Open Workflow Log</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Task Activities</CardTitle>
            <CardDescription>All assignments, due-dates and task completions by department/users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="./activities/tasks">See Tasks</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}