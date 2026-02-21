'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast"; // Keeping your existing toast library
import { format } from "date-fns";

// --- Types ---
interface ComplianceRow {
  id: string;
  entity_type: string;
  entity_id: string;
  country: string;
  currency: string;
  location: string;
  kyc_status: string;
  aml_status: string;
  sanctions: string;
  flagged: boolean;
  flagged_at?: string;
  flagged_by?: string;
  notes?: string;
  remediation_status?: string;
  last_reviewed_at?: string;
  attachments?: { url: string; name: string }[];
}

// --- API Functions ---
async function fetchComplianceMatrix(tenantId: string, refType?: string, refId?: string) {
  const db = createClient();
  
  // FIXED: Changed 'tenant_id' to 'business_id' to match your actual database schema
  let q = db.from("compliance_matrix").select("*").eq("business_id", tenantId);
  
  if (refType) q = q.eq("entity_type", refType);
  if (refId) q = q.eq("entity_id", refId);
  
  const { data, error } = await q.order("flagged_at", { ascending: false });
  if (error) throw error;
  return data as ComplianceRow[];
}

async function addRemediationNote({
  rowId,
  note,
  user,
  tenantId
}: {
  rowId: string;
  note: string;
  user: string;
  tenantId: string;
}) {
  const db = createClient();
  
  // FIXED: Changed 'tenant_id' to 'business_id' to match your actual database schema
  const { error } = await db.from("compliance_matrix").update({
    notes: note,
    remediation_status: "REMEDIATION",
    last_reviewed_at: new Date().toISOString(),
    flagged_by: user
  }).eq("id", rowId).eq("business_id", tenantId);
  
  if (error) throw error;
}

// --- Component ---
export function ComplianceDrilldown({
  tenantId,
  filterEntityType,
  filterEntityId,
  user
}: {
  tenantId: string;
  filterEntityType?: string;
  filterEntityId?: string;
  user: string;
}) {
  const queryClient = useQueryClient();
  
  // Unique key for caching
  const queryKey = ["compliance-drilldown", tenantId, filterEntityType, filterEntityId];

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchComplianceMatrix(tenantId, filterEntityType, filterEntityId)
  });

  const [showNotes, setShowNotes] = React.useState<{ [id: string]: boolean }>({});
  const [notes, setNotes] = React.useState<{ [id: string]: string }>({});

  const mutation = useMutation({
    mutationFn: (rowId: string) =>
      addRemediationNote({ rowId, note: notes[rowId], user, tenantId }),
    onSuccess: () => {
      toast.success("Remediation noted successfully");
      setNotes({});
      setShowNotes({});
      // FIX: TanStack Query v5 syntax requires an object wrapper
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
    onError: (e) => toast.error(e.message || "Remediation failed")
  });

  if (isError) {
    return <div className="p-4 text-red-500">Failed to load compliance data.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Compliance Drilldown {filterEntityType && <span className="text-muted-foreground font-normal">/ {filterEntityType} {filterEntityId && `(#${filterEntityId})`}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>AML</TableHead>
              <TableHead>Sanctions</TableHead>
              <TableHead>Flagged</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[300px]">Remediation Notes</TableHead>
              <TableHead>Docs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin"/> Loading compliance matrix...
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                        No compliance records found for this criteria.
                    </TableCell>
                </TableRow>
            ) : (
              data?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.entity_type} <span className="text-xs text-muted-foreground">#{r.entity_id.substring(0,8)}...</span>
                  </TableCell>
                  <TableCell className={r.kyc_status === "OK" ? "text-green-600 font-medium" : "text-red-600 font-bold"}>{r.kyc_status}</TableCell>
                  <TableCell className={r.aml_status === "OK" ? "text-green-600 font-medium" : "text-red-600 font-bold"}>{r.aml_status}</TableCell>
                  <TableCell className={r.sanctions === "CLEAR" ? "text-green-600 font-medium" : "text-red-600 font-bold"}>{r.sanctions}</TableCell>
                  <TableCell>{r.flagged ? <span className="text-red-600 font-bold">YES</span> : "No"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.flagged_at ? format(new Date(r.flagged_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>{r.country} <span className="text-xs">({r.location})</span></TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full border ${r.remediation_status === 'REMEDIATION' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200'}`}>
                        {r.remediation_status || 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {showNotes[r.id] ? (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          value={notes[r.id] ?? ""}
                          onChange={e => setNotes({ ...notes, [r.id]: e.target.value })}
                          placeholder="Enter remediation or review note..."
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => mutation.mutate(r.id)}
                            disabled={!notes[r.id] || mutation.isPending}
                          >
                            {mutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowNotes({ ...showNotes, [r.id]: false })}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-2 group">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.notes || "No notes."}</p>
                        <Button size="sm" variant="outline" className="h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setShowNotes({ ...showNotes, [r.id]: true })}>
                          Edit
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.attachments?.map((a, idx) => (
                        <a key={idx} href={a.url} className="text-xs text-blue-600 hover:underline block" target="_blank" rel="noopener noreferrer">
                            {a.name}
                        </a>
                    ))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}