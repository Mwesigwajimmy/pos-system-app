'use client';

import React, { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // <--- Added missing import
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComplianceRisk {
  id: string;
  risk: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  entity: string;
  country: string;
  is_open: boolean;
}

export default function ComplianceRiskDashboard() {
  const supabase = createClient();
  const [risks, setRisks] = useState<ComplianceRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRisks = async () => {
        const { data } = await supabase
            .from('compliance_risks')
            .select('*')
            .eq('is_open', true)
            .order('created_at', { ascending: false });
            
        setRisks(data as ComplianceRisk[] || []);
        setLoading(false);
    };
    fetchRisks();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500"/> Risk Monitor
        </CardTitle>
        <CardDescription>Active compliance risks requiring mitigation.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="py-8 flex justify-center">
                <Loader2 className="animate-spin w-6 h-6 text-muted-foreground"/>
            </div>
        ) : (
        <div className="space-y-4">
            {risks.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No active risks. Good job!</p>
            ) : (
            risks.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                        <Badge variant="outline" className={`${
                            r.severity === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' :
                            r.severity === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                            {r.severity}
                        </Badge>
                        <div>
                            <p className="font-medium text-sm">{r.risk}</p>
                            <p className="text-xs text-muted-foreground">{r.entity} • {r.country}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">Mitigate</Button>
                </div>
            ))
            )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}