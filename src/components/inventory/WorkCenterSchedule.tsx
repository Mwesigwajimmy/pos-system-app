'use client';

import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, X, Clock, User, Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// 1. Define the Data Interface
export interface WorkCenterScheduleEntry {
  id: string;
  workCenter: string;
  session: string;
  product: string;
  scheduledStart: string; // ISO string
  scheduledEnd: string;   // ISO string
  status: "planned" | "running" | "stopped" | "finished" | string;
  machineOperator: string;
  entity: string;
  country: string;
  tenantId: string;
}

// 2. Define Props Interface
interface WorkCenterScheduleProps {
  initialData: WorkCenterScheduleEntry[];
}

export default function WorkCenterSchedule({ initialData }: WorkCenterScheduleProps) {
  const [schedule] = useState<WorkCenterScheduleEntry[]>(initialData || []);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() =>
    schedule.filter(s =>
      s.workCenter.toLowerCase().includes(filter.toLowerCase()) ||
      s.product.toLowerCase().includes(filter.toLowerCase()) ||
      s.machineOperator.toLowerCase().includes(filter.toLowerCase())
    ),
    [schedule, filter]
  );

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return <Badge className="bg-green-600 hover:bg-green-700">Running</Badge>;
      case "stopped":
        return <Badge variant="destructive">Stopped</Badge>;
      case "finished":
        return <Badge variant="secondary">Finished</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Planned</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Work Center Schedule</CardTitle>
        <CardDescription>
          Machine allocation, operator assignments, and runtime status.
        </CardDescription>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter machine, product, or operator..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="pl-8"
          />
          {filter && (
            <X 
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setFilter("")}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Work Center</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No scheduled sessions found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      {item.workCenter}
                    </TableCell>
                    <TableCell>{item.product}</TableCell>
                    <TableCell>{item.session}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {item.machineOperator}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.scheduledStart).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.scheduledEnd).toLocaleString()}
                    </TableCell>
                    <TableCell>{item.entity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}