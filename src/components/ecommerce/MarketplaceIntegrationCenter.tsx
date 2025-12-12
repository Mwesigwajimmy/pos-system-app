'use client';

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingBag, 
  RefreshCw, 
  Settings, 
  Globe, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";

// 1. Strict Type Definition
export interface MarketplaceIntegration {
  id: string;
  name: string; // Amazon, Shopify, Jumia, etc.
  connected: boolean;
  region: string;
  productsSynced: number;
  lastSync: string | null;
  entity: string;
  tenantId: string;
}

interface MarketplaceProps {
  integrations: MarketplaceIntegration[];
}

export function MarketplaceIntegrationCenter({ integrations }: MarketplaceProps) {
  
  // Helper: Get status color
  const getStatusColor = (connected: boolean) => 
    connected 
      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" 
      : "bg-zinc-100 text-zinc-800 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <Card className="h-full border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                <Globe className="h-5 w-5 text-primary" />
                Marketplace Integration Center
                </CardTitle>
                <CardDescription>
                Manage real-time connections with external sales channels (Amazon, Shopify, Jumia, eBay).
                </CardDescription>
            </div>
            <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <ul className="space-y-4">
            {integrations.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <ShoppingBag className="h-10 w-10 mb-2 opacity-20" />
                  <p>No marketplace integrations configured for this tenant.</p>
                  <Button variant="link" className="mt-2">Add New Integration</Button>
               </div>
            ) : (
              integrations.map((item) => (
                <li key={item.id} className="flex flex-col gap-4 rounded-lg border p-4 shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between">
                  
                  {/* Left: Icon & Name */}
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-primary/10`}>
                        <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{item.name}</h4>
                            <Badge variant="outline" className="text-xs font-normal">
                                {item.region}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <span className="font-medium text-foreground">{item.entity}</span>
                        </p>
                    </div>
                  </div>

                  {/* Middle: Stats */}
                  <div className="flex flex-1 flex-col sm:items-center sm:flex-row sm:justify-center gap-4 sm:gap-8">
                    <div className="flex flex-col text-sm">
                        <span className="text-muted-foreground text-xs">Products Synced</span>
                        <span className="font-mono font-medium">{item.productsSynced.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col text-sm">
                        <span className="text-muted-foreground text-xs">Last Sync</span>
                        <span className="font-medium">
                            {item.lastSync || "Never Synced"}
                        </span>
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex items-center gap-4 justify-between sm:justify-end min-w-[200px]">
                    <Badge variant="secondary" className={getStatusColor(item.connected)}>
                        {item.connected ? (
                            <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Connected</div>
                        ) : (
                            <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Disconnected</div>
                        )}
                    </Badge>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Configure</span>
                    </Button>
                  </div>

                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}