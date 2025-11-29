'use client';
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Props: task details, linked workbook and doc IDs, business context, etc.
export function AssignmentTaskPanel({
  task,
  workbookId,
  docId,
  type
}: {
  task: {id:string; title:string; assigned_users:string[]; status:string};
  workbookId?: string;
  docId?: string;
  type: "sheet" | "doc";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2">Assigned to: {task.assigned_users.join(", ")}</div>
        <div>Status: <b>{task.status}</b></div>
        <div className="flex gap-2 mt-4">
          {type==="sheet" && workbookId && (
            <Button asChild><a href={`/workbooks/${workbookId}`} target="_blank">Open Workbook</a></Button>
          )}
          {type==="doc" && docId && (
            <Button asChild><a href={`/docs/${docId}`} target="_blank">Open Document</a></Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}