'use client';

import * as React from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiCredentials, rotateApiKey } from "@/lib/actions/security";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff, Copy, Terminal, ShieldAlert, RefreshCw, Loader2, AlertTriangle } from "lucide-react";

export default function OpenAPIGatewayPanel() {
  const [showKey, setShowKey] = useState(false);
  const [isRotateDialogOpen, setIsRotateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // 1. Real Data Fetching
  const { data, isLoading, isError } = useQuery({
    queryKey: ['api-credentials'],
    queryFn: getApiCredentials
  });

  // 2. Real Key Rotation Logic
  const rotateMutation = useMutation({
    mutationFn: rotateApiKey,
    onSuccess: (newData) => {
      toast.success("API Key rotated successfully. Old keys are now invalid.");
      queryClient.setQueryData(['api-credentials'], newData);
      setIsRotateDialogOpen(false);
    },
    onError: () => toast.error("Failed to rotate key. Please try again.")
  });

  const handleCopy = (text: string, type: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  if (isLoading) {
    return (
        <Card className="h-64 flex items-center justify-center border-t-4 border-t-cyan-600">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
                <p className="text-sm text-muted-foreground">Loading Secure Credentials...</p>
            </div>
        </Card>
    );
  }

  if (isError || !data) {
      return (
          <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 text-red-600 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5"/>
                  Unable to load API Gateway credentials. Check your permissions.
              </CardContent>
          </Card>
      );
  }

  return (
    <Card className="border-t-4 border-t-cyan-600 shadow-sm">
      <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-cyan-600"/> Developer API Gateway
                </CardTitle>
                <CardDescription className="mt-2">
                    Connect external Fintech apps, Mobile Banking, and Regulatory Reporting tools to your SACCO.
                </CardDescription>
            </div>
            <div className="hidden md:block">
                <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700">
                    Live Environment
                </span>
            </div>
          </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* Endpoint Section */}
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Base API Endpoint</label>
            <div className="flex gap-2">
                <code className="flex-1 bg-slate-100 p-3 rounded-md font-mono text-sm text-slate-600 border flex items-center">
                    {data.endpoint}
                </code>
                <Button variant="outline" className="h-full" onClick={() => handleCopy(data.endpoint, "Endpoint")}>
                    <Copy className="w-4 h-4 mr-2"/> Copy
                </Button>
            </div>
        </div>

        {/* API Key Section */}
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Secret API Key</label>
            <div className="relative">
                <Input 
                    value={data.apiKey} 
                    type={showKey ? "text" : "password"} 
                    readOnly 
                    className="font-mono pr-24 h-11 bg-slate-50"
                />
                <div className="absolute right-1 top-1 bottom-1 flex gap-1">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-full px-3 text-slate-500 hover:text-slate-900" 
                        onClick={() => setShowKey(!showKey)}
                    >
                        {showKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-full px-3 text-slate-500 hover:text-slate-900" 
                        onClick={() => handleCopy(data.apiKey, "API Key")}
                    >
                        <Copy className="w-4 h-4"/>
                    </Button>
                </div>
            </div>
        </div>

        {/* Security Warning & Action */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex gap-3 items-start">
                <ShieldAlert className="w-5 h-5 text-amber-600 mt-1 shrink-0"/>
                <div className="text-sm text-amber-900">
                    <p className="font-bold">Security Warning</p>
                    <p className="text-amber-800/80">
                        This key grants <strong>Read/Write</strong> access to financial data. 
                        Do not share it in emails or client-side code.
                    </p>
                </div>
            </div>
            
            <Dialog open={isRotateDialogOpen} onOpenChange={setIsRotateDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="whitespace-nowrap">
                        <RefreshCw className="w-4 h-4 mr-2"/> Rotate Key
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5"/> Revoke & Rotate API Key?
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            This action is <strong>irreversible</strong>. 
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>The current API key will stop working immediately.</li>
                                <li>All connected apps (Mobile App, ATMs) will fail until updated.</li>
                            </ul>
                            Are you sure you want to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRotateDialogOpen(false)}>Cancel</Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => rotateMutation.mutate()}
                            disabled={rotateMutation.isPending}
                        >
                            {rotateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Yes, Rotate Key"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

      </CardContent>
      <CardFooter className="bg-slate-50 text-xs text-muted-foreground border-t p-4">
        Docs: <a href="#" className="underline text-cyan-600 hover:text-cyan-800 ml-1">SACCO API Reference v1.4</a>
      </CardFooter>
    </Card>
  );
}