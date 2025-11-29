'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface OrgNode {
  id: string;
  name: string;
  title: string;
  reports?: OrgNode[];
  entity: string;
  country: string;
}

const ORG_DATA: OrgNode = {
  id: "0",
  name: "Joyce M.",
  title: "CEO",
  entity: "Main Comp Ltd.",
  country: "UG",
  reports: [
    {
      id: "d1",
      name: "Sam L.",
      title: "COO",
      entity: "Main Comp Ltd.",
      country: "UG",
      reports: [
        {
          id: "fin1",
          name: "Maya Okoth",
          title: "Finance Manager",
          entity: "Main Comp Ltd.",
          country: "UG"
        },
        {
          id: "dist1",
          name: "Robert A.",
          title: "Head of Distribution",
          entity: "Main Comp Ltd.",
          country: "UG"
        }
      ]
    },
    {
      id: "d2",
      name: "Lara G.",
      title: "Head of HR",
      entity: "Main Comp Ltd.",
      country: "UG",
      reports: [
        {
          id: "p1",
          name: "Amos E.",
          title: "Payroll Officer",
          entity: "Main Comp Ltd.",
          country: "UG"
        }
      ]
    },
    {
      id: "d3",
      name: "Tim M.",
      title: "GM AU",
      entity: "Global Branch AU",
      country: "AU"
    }
  ]
};

function renderNode(node: OrgNode, level=0) {
  return (
    <li key={node.id} className={`ml-${level*4}`}>
      <div className="border p-2 mb-2 rounded bg-white">
        <span className="font-bold">{node.name}</span>{" "}
        <span className="text-xs text-muted-foreground">— {node.title} ({node.entity}, {node.country})</span>
      </div>
      {node.reports && (
        <ul className={`pl-4 border-l ml-2`}>
          {node.reports.map(n => renderNode(n, level+1))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Chart</CardTitle>
        <CardDescription>
          Visual org structure—divisions, departments, teams across companies/entities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul>{renderNode(ORG_DATA)}</ul>
      </CardContent>
    </Card>
  );
}