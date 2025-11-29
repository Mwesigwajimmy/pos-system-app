'use client';

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, ShoppingBag } from "lucide-react";

interface MarketplaceIntegration {
  id: string;
  name: string;
  connected: boolean;
  region: string;
  productsSynced: number;
  lastSync: string;
  entity: string;
  tenantId: string;
}

export default function MarketplaceIntegrationCenter() {
  const [integrations, setIntegrations] = useState<MarketplaceIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIntegrations([
        {
          id: "mp-001",
          name: "Amazon",
          connected: true,
          region: "EU/US",
          productsSynced: 220,
          lastSync: "2025-11-17 09:12",
          entity: "Main Comp Ltd.",
          tenantId: "tenant-001"
        },
        {
          id: "mp-002",
          name: "Jumia",
          connected: false,
          region: "UG/KE",
          productsSynced: 0,
          lastSync: "",
          entity: "Main Comp Ltd.",
          tenantId: "tenant-001"
        },
        {
          id: "mp-003",
          name: "Shopify",
          connected: true,
          region: "AU/NZ",
          productsSynced: 101,
          lastSync: "2025-11-11 15:57",
          entity: "Global Branch AU",
          tenantId: "tenant-002"
        }
      ]);
      setLoading(false);
    }, 350);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace Integration Center</CardTitle>
        <CardDescription>
          Manage and monitor real-time integrations with Amazon, Shopify, Jumia, eBay, and more—per region/entity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>
        : (
          <ul>
            {integrations.length === 0
              ? <li className="py-10 text-center text-muted-foreground">No marketplace integrations configured.</li>
              : integrations.map(i => (
                <li key={i.id} className="flex gap-3 py-2 px-2 border-b items-center">
                  <ShoppingBag className="w-6 h-6 mr-2"/>
                  <span className="font-bold">{i.name} ({i.region})</span>
                  <span className={`ml-3 px-2 rounded-full text-xs font-semibold ${
                    i.connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {i.connected ? "Connected" : "Disconnected"}
                  </span>
                  <span className="ml-6 text-xs text-muted-foreground">{i.entity}</span>
                  <span className="ml-6 text-sm">Products: {i.productsSynced}</span>
                  <span className="ml-auto">
                    {i.connected && i.lastSync &&
                      <span className="text-xs text-green-700">Last Sync: {i.lastSync}</span>
                    }
                  </span>
                </li>
              ))
            }
          </ul>
        )}
      </CardContent>
    </Card>
  );
}