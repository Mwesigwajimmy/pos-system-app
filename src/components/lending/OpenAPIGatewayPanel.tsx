'use client';

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { Copy, Eye, EyeOff, Globe, Server } from "lucide-react";

export function OpenAPIGatewayPanel({ apiKey, baseApiUrl }: { apiKey: string, baseApiUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const fullUrl = `${baseApiUrl}/v1/lending?api_key=${apiKey}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("API Endpoint copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            <CardTitle>Open Banking Gateway</CardTitle>
        </div>
        <CardDescription>
            Secure REST API endpoints for Mobile App, Core Banking, and Regulator integration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Primary Endpoint</label>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
            </div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        value={visible ? fullUrl : fullUrl.replace(/api_key=[^&]+/, 'api_key=****************')} 
                        readOnly 
                        className="pl-9 font-mono text-xs bg-slate-50" 
                    />
                </div>
                <Button variant="outline" size="icon" onClick={() => setVisible(!visible)}>
                    {visible ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </Button>
                <Button onClick={handleCopy} className="w-24">
                    {copied ? "Copied" : <><Copy className="mr-2 h-4 w-4"/> Copy</>}
                </Button>
            </div>
        </div>

        <div className="rounded-md bg-slate-100 p-4 text-xs text-slate-600 space-y-1">
          <p><strong>Supported Standards:</strong> ISO 20022, Open Banking UK</p>
          <p><strong>Rate Limit:</strong> 10,000 requests / hour</p>
          <p><strong>Authentication:</strong> Bearer Token or API Key in Query Param</p>
        </div>

      </CardContent>
    </Card>
  );
}