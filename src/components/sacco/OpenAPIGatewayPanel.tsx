'use client';

import * as React from "react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, Terminal, ShieldAlert } from "lucide-react";

export function OpenAPIGatewayPanel({ apiKey, baseApiUrl }: { apiKey: string, baseApiUrl: string }) {
  const [showKey, setShowKey] = useState(false);
  
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  return (
    <Card className="border-t-4 border-t-cyan-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-600"/> Developer API Gateway
          </CardTitle>
          <CardDescription>Integrate external fintech apps, mobile banking, and regulatory reporting tools.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Endpoint Section */}
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Base Endpoint</label>
            <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 p-2 rounded-md font-mono text-sm text-slate-600 truncate border">
                    {baseApiUrl}
                </div>
                <Button variant="outline" size="icon" onClick={() => handleCopy(baseApiUrl, "Endpoint")}>
                    <Copy className="w-4 h-4"/>
                </Button>
            </div>
        </div>

        {/* API Key Section */}
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Secret API Key</label>
            <div className="relative">
                <Input 
                    value={apiKey} 
                    type={showKey ? "text" : "password"} 
                    readOnly 
                    className="font-mono pr-20 bg-slate-50"
                />
                <div className="absolute right-1 top-1 flex gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => setShowKey(!showKey)}
                    >
                        {showKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleCopy(apiKey, "API Key")}
                    >
                        <Copy className="w-4 h-4"/>
                    </Button>
                </div>
            </div>
        </div>

        {/* Security Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0"/>
            <div className="text-sm text-amber-800">
                <p className="font-bold">Security Warning</p>
                <p>Do not share this key publicly or commit it to version control. This key grants read/write access to financial data. Rotate immediately if compromised.</p>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}