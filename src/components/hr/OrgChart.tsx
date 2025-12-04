'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export interface OrgNode {
  id: string;
  name: string;
  title: string;
  reports?: OrgNode[];
  entity: string;
  country: string;
}

interface OrgChartProps {
    data: OrgNode | null;
}

function renderNode(node: OrgNode, level=0) {
  return (
    <li key={node.id} className={`ml-${level > 0 ? 4 : 0} mt-2`}>
      <div className="border p-2 mb-2 rounded bg-white shadow-sm inline-block min-w-[200px]">
        <div className="font-bold">{node.name}</div>
        <div className="text-xs text-muted-foreground">{node.title}</div>
        <div className="text-[10px] text-gray-500">{node.entity}, {node.country}</div>
      </div>
      {node.reports && node.reports.length > 0 && (
        <ul className={`pl-4 border-l-2 border-gray-200 ml-4`}>
          {node.reports.map(n => renderNode(n, level+1))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChart({ data }: OrgChartProps) {
  return (
    <Card className="min-h-[500px]">
      <CardHeader>
        <CardTitle>Organization Chart</CardTitle>
        <CardDescription>
          Visual org structure.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-auto">
        {data ? <ul>{renderNode(data)}</ul> : <p className="text-muted-foreground">No organizational data found or no CEO defined.</p>}
      </CardContent>
    </Card>
  );
}