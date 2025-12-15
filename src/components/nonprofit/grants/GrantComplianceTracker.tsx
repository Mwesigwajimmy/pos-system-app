'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CheckSquare, Square, ClipboardCheck, Loader2 } from "lucide-react";

// --- Types ---
interface ComplianceItem { 
  id: string; 
  grant_id: string; 
  // Joined grant data
  grants?: { 
    title: string 
  };
  due_date: string; 
  type: 'REPORT' | 'MILESTONE' | 'FINANCIAL'; 
  description: string; 
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE'; 
}

interface ComplianceTrackerProps {
  tenant: {
    tenantId: string;
  };
}

// --- Data Fetching ---
async function fetchCompliance(tenantId: string) {
  const db = createClient();
  
  // Fetch pending compliance items joined with grant titles
  const { data, error } = await db
    .from('grant_compliance')
    .select(`
      *,
      grants (title)
    `)
    .eq('tenant_id', tenantId)
    .neq('status', 'COMPLETED') // Only show active items for the dashboard
    .order('due_date', { ascending: true })
    .limit(10);
  
  if (error) {
      console.error("Error fetching compliance:", error);
      throw error;
  }
  return data as unknown as ComplianceItem[];
}

async function toggleComplianceStatus({ id, status }: { id: string, status: string }) {
  const db = createClient();
  const { error } = await db.from('grant_compliance').update({ status }).eq('id', id);
  if (error) throw error;
}

// --- Component ---
export default function GrantComplianceTracker({ tenant }: ComplianceTrackerProps) {
  const { tenantId } = tenant;
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({ 
    queryKey: ['grant-compliance', tenantId], 
    queryFn: () => fetchCompliance(tenantId) 
  });

  const mutation = useMutation({
    mutationFn: toggleComplianceStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant-compliance', tenantId] });
      toast.success("Task marked as complete");
    },
    onError: () => toast.error("Failed to update status")
  });

  const handleToggle = (item: ComplianceItem) => {
    // Logic: If in this list, it's not completed. So we mark as completed.
    mutation.mutate({ id: item.id, status: 'COMPLETED' });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="w-5 h-5 text-blue-600"/> 
          Upcoming Deadlines
        </CardTitle>
        <CardDescription>Pending reports and milestones.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground"/>
                    </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-sm">
                        No pending compliance tasks.
                    </TableCell>
                </TableRow>
              ) : (
                data.map((c) => {
                  const isOverdue = new Date(c.due_date) < new Date();
                  return (
                    <TableRow key={c.id} className={isOverdue ? "bg-red-50/50" : ""}>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggle(c)} 
                          disabled={mutation.isPending}
                          className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
                        >
                          <Square className="w-4 h-4 text-slate-400"/>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm truncate max-w-[180px]" title={c.description}>
                            {c.description}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                             {c.type} • {c.grants?.title || "Unknown Grant"}
                        </div>
                      </TableCell>
                      <TableCell className={`text-xs whitespace-nowrap ${isOverdue ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
                        {format(new Date(c.due_date), "MMM d")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}