'use client';

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AuditLogEntry } from "@/types/dashboard";

interface AuditLogDialogProps {
  product: { id: number; name: string } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditLogDialog({ product, isOpen, onClose }: AuditLogDialogProps) {
  // You would fetch audit logs for the product here, e.g.:
  // const { data: logs, isLoading } = useQuery(...);

  // For demo, fake log list:
  const logs: AuditLogEntry[] = product
    ? [
        {
          id: 1,
          user_email: "admin@company.com",
          action: "UPDATE",
          table_name: "products",
          record_id: String(product.id),
          description: `Changed name to "${product.name}"`,
          created_at: "2025-10-19T12:22:00Z",
          old_data: { name: "Old" },
          new_data: { name: product.name },
        },
      ]
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Audit Log for Product: {product?.name}</DialogTitle>
          <DialogDescription>
            Review all changes and actions performed on this product for compliance and traceability.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {logs.length === 0 ? (
            <div className="text-muted-foreground text-sm">No audit logs found.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border-b pb-2">
                <div>
                  <span className="font-bold">{log.user_email}</span> &mdash; <span>{log.action}</span>
                </div>
                <div className="text-xs text-muted-foreground">{log.created_at}</div>
                <div className="text-xs">Desc: {log.description}</div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}