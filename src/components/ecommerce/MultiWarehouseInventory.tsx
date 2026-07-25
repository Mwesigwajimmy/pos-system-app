'use client';

/**
 * --- BBU1 SOVEREIGN MULTI-WAREHOUSE INVENTORY ENGINE ---
 * VERSION: v11.0 OMEGA (INTER-FACILITY STOCK TRANSFER & MULTI-NODE WELD)
 * JURISDICTION: Unified Multi-Tenant Cloud / Enterprise Logistics
 */

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { 
  Search, X, Building2, Package, AlertTriangle, 
  CheckCircle2, ArrowRightLeft, ArrowUpRight, 
  Loader2, Download, Printer, RefreshCw, Layers, 
  Boxes, ShieldCheck, MapPin, Globe, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

// 1. STRICT INTERFACE DEFINITION
export interface WarehouseStock {
  id: string;
  warehouseName: string;
  region: string;
  countryCode: string;
  sku: string;
  productName: string;
  totalQuantity: number; // Physical count
  reservedQuantity: number; // Allocated to open orders
  availableQuantity: number; // Sellable count
  reorderPoint: number;
  tenantId: string;
  variantId?: number;
  locationId?: string;
  costPrice?: number;
}

interface InventoryProps {
  initialStock?: WarehouseStock[];
}

export function MultiWarehouseInventory({ initialStock: propStock }: InventoryProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');

  // STOCK TRANSFER MODAL STATE
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    variant_id: '',
    source_location_id: '',
    destination_location_id: '',
    quantity: 1,
    notes: 'Inter-warehouse re-allocation'
  });

  // 1. DATA: Identity Context & Currency
  const { data: profile } = useQuery({
    queryKey: ['active_profile_multi_warehouse'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency, business_id').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';
  const activeBusinessId = profile?.business_id;

  // 2. DATA: Active Physical Location Nodes
  const { data: locations } = useQuery({
    queryKey: ['business_locations_multi_wh', activeBusinessId],
    enabled: !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, is_primary')
        .eq('business_id', activeBusinessId);
      if (error) return [];
      return data || [];
    }
  });

  // 3. DATA: Live Multi-Warehouse Stock Query
  const { data: liveStockData, isLoading } = useQuery({
    queryKey: ['live_multi_warehouse_stock', activeBusinessId],
    enabled: !propStock && !!activeBusinessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_levels')
        .select(`
          id, location_id, variant_id, quantity, quantity_on_hand, quantity_reserved,
          locations ( id, name ),
          product_variants ( id, name, sku, price, cost_price, low_stock_threshold, products ( name, country_code ) )
        `)
        .eq('business_id', activeBusinessId);

      if (error) throw error;

      return (data || []).map((sl: any) => {
        const physical = Number(sl.quantity || 0);
        const reserved = Number(sl.quantity_reserved || 0);
        const available = Number(sl.quantity_on_hand ?? (physical - reserved));
        const prodName = `${sl.product_variants?.products?.name || ''} ${sl.product_variants?.name === 'Standard' ? '' : `(${sl.product_variants?.name})`}`.trim() || 'Inventory Item';

        return {
          id: sl.id,
          warehouseName: sl.locations?.name || 'Main Warehouse',
          region: 'Primary Zone',
          countryCode: sl.product_variants?.products?.country_code || 'UG',
          sku: sl.product_variants?.sku || 'N/A',
          productName: prodName,
          totalQuantity: physical,
          reservedQuantity: reserved,
          availableQuantity: available,
          reorderPoint: Number(sl.product_variants?.low_stock_threshold || 5),
          tenantId: activeBusinessId,
          variantId: sl.variant_id,
          locationId: sl.location_id,
          costPrice: Number(sl.product_variants?.cost_price || sl.product_variants?.price || 0)
        } as WarehouseStock;
      });
    }
  });

  const activeStock = useMemo(() => {
    return propStock || liveStockData || [];
  }, [propStock, liveStockData]);

  // CLIENT-SIDE FILTERING & SORTING
  const filteredData = useMemo(() => {
    if (!activeStock) return [];
    
    return activeStock.filter(item => {
      const lowerFilter = filter.toLowerCase();
      const matchesText = 
        !filter ||
        item.productName.toLowerCase().includes(lowerFilter) ||
        item.sku.toLowerCase().includes(lowerFilter) ||
        item.warehouseName.toLowerCase().includes(lowerFilter) ||
        item.region.toLowerCase().includes(lowerFilter);

      const matchesLocation = selectedLocationFilter === 'ALL' || item.locationId === selectedLocationFilter;

      return matchesText && matchesLocation;
    });
  }, [activeStock, filter, selectedLocationFilter]);

  // COMPUTED WAREHOUSE METRICS
  const warehouseKPIs = useMemo(() => {
    if (!filteredData) return { totalValuation: 0, reservedCount: 0, lowStockCount: 0 };
    
    const totalValuation = filteredData.reduce((acc, curr) => acc + (curr.totalQuantity * (curr.costPrice || 0)), 0);
    const reservedCount = filteredData.reduce((acc, curr) => acc + curr.reservedQuantity, 0);
    const lowStockCount = filteredData.filter(curr => curr.availableQuantity <= curr.reorderPoint).length;

    return { totalValuation, reservedCount, lowStockCount };
  }, [filteredData]);

  // MUTATION: Execute Inter-Warehouse Stock Transfer
  const transferStockMutation = useMutation({
    mutationFn: async () => {
      if (!transferForm.variant_id || !transferForm.source_location_id || !transferForm.destination_location_id) {
        throw new Error("Source location, target location, and product variant are required.");
      }
      if (transferForm.source_location_id === transferForm.destination_location_id) {
        throw new Error("Source and destination warehouses cannot be identical.");
      }
      if (transferForm.quantity <= 0) throw new Error("Transfer quantity must be greater than zero.");

      // 1. Deduct from Source Location
      const { error: deductErr } = await supabase
        .from('stock_levels')
        .update({
          quantity: GREATEST_SAFE(0, -transferForm.quantity),
          updated_at: new Date().toISOString()
        })
        .eq('variant_id', transferForm.variant_id)
        .eq('location_id', transferForm.source_location_id);

      // 2. Add to Destination Location
      const { error: addErr } = await supabase
        .from('stock_levels')
        .upsert([{
          business_id: activeBusinessId,
          tenant_id: activeBusinessId,
          location_id: transferForm.destination_location_id,
          variant_id: transferForm.variant_id,
          quantity: transferForm.quantity,
          quantity_on_hand: transferForm.quantity,
          updated_at: new Date().toISOString()
        }], { onConflict: 'variant_id, location_id' });

      if (deductErr || addErr) throw deductErr || addErr;

      // 3. Log Stock Movement
      await supabase.from('stock_movements').insert([
        { business_id: activeBusinessId, location_id: transferForm.source_location_id, variant_id: transferForm.variant_id, movement_type: 'TRANSFER_OUT', quantity: transferForm.quantity },
        { business_id: activeBusinessId, location_id: transferForm.destination_location_id, variant_id: transferForm.variant_id, movement_type: 'TRANSFER_IN', quantity: transferForm.quantity }
      ]);
    },
    onSuccess: () => {
      toast.success("Inter-Warehouse Stock Transfer Sealed!");
      setIsTransferOpen(false);
      queryClient.invalidateQueries({ queryKey: ['live_multi_warehouse_stock'] });
    },
    onError: (err: any) => toast.error(`Stock Transfer Failed: ${err.message}`)
  });

  function GREATEST_SAFE(min: number, val: number) {
    return val;
  }

  // EXPORT MULTI-WAREHOUSE AUDIT PDF
  const exportWarehousePdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text((profile?.business_name || "BBU1 MULTI-WAREHOUSE").toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("EXECUTIVE MULTI-BRANCH INVENTORY VALUATION AUDIT", 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()} | Currency: ${businessCurrency}`, 14, 33);
    doc.line(14, 36, 196, 36);

    autoTable(doc, {
      startY: 40,
      head: [['Product Designation', 'SKU', 'Warehouse Location', 'Physical Stock', 'Reserved', 'Sellable']],
      body: filteredData.map(item => [
        item.productName,
        item.sku,
        item.warehouseName,
        item.totalQuantity.toLocaleString(),
        item.reservedQuantity.toLocaleString(),
        item.availableQuantity.toLocaleString()
      ]),
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Multi_Warehouse_Audit_${Date.now()}.pdf`);
    toast.success("Multi-Warehouse Audit PDF Downloaded!");
  };

  // STATUS LOGIC HELPER
  const getStockStatus = (available: number, reorderPoint: number) => {
    if (available <= 0) return { label: 'Out of Stock', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: AlertTriangle };
    if (available <= reorderPoint) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle };
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* 1. MULTI-WAREHOUSE KPI METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Multi-Node Physical Valuation</span>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">{businessCurrency} {warehouseKPIs.totalValuation.toLocaleString()}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Sum Across All Active Locations</p>
        </Card>

        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Allocated Order Stock</span>
          <h3 className="text-3xl font-black text-amber-600 mt-2">{warehouseKPIs.reservedCount.toLocaleString()}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Reserved for Active Orders</p>
        </Card>

        <Card className="border border-slate-200 rounded-3xl p-6 bg-white shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Low Stock Alerts</span>
          <h3 className="text-3xl font-black text-rose-600 mt-2">{warehouseKPIs.lowStockCount}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Items At or Below Reorder Threshold</p>
        </Card>
      </div>

      {/* 2. MAIN WAREHOUSE INVENTORY CARD */}
      <Card className="h-full border border-slate-200 rounded-[2.5rem] shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                  <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 uppercase tracking-tight">
                      <Building2 className="h-6 w-6 text-blue-600" />
                      Multi-Warehouse Physical Inventory
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-500">
                    Real-time multi-branch physical vs. sellable stock levels across all facilities.
                  </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => setIsTransferOpen(true)} className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg">
                  <ArrowRightLeft size={16} className="mr-2" /> Stock Transfer
                </Button>
                <Button onClick={exportWarehousePdf} variant="outline" className="h-11 px-5 border-slate-200 font-bold text-xs rounded-xl">
                  <Printer size={16} className="mr-2 text-slate-600" /> Export PDF
                </Button>
              </div>
          </div>

          {/* SEARCH & LOCATION FILTER BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 items-center">
            <div className="sm:col-span-2 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search SKU, Product Name, or Location..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-10 h-11 bg-white border-slate-200 rounded-xl font-bold text-xs"
                />
                {filter && (
                    <X 
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-900" 
                        onClick={() => setFilter("")}
                    />
                )}
            </div>

            <Select value={selectedLocationFilter} onValueChange={setSelectedLocationFilter}>
              <SelectTrigger className="h-11 rounded-xl bg-white font-bold text-xs border-slate-200">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-bold text-xs">All Facilities & Nodes</SelectItem>
                {locations?.map(loc => (
                  <SelectItem key={loc.id} value={loc.id} className="font-bold text-xs">{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px] w-full">
              <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                    <TableRow className="h-12">
                      <TableHead className="pl-8 font-bold text-[10px] uppercase text-slate-500">Product Details</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-500">Warehouse Node</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Physical Stock</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Reserved</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase text-slate-500">Sellable</TableHead>
                      <TableHead className="text-center font-bold text-[10px] uppercase text-slate-500 pr-8">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2 text-blue-600"/> Synchronizing Multi-Warehouse Stock...</TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                              <div className="flex flex-col items-center justify-center">
                                  <Package className="h-8 w-8 mb-2 opacity-20" />
                                  <p className="text-xs font-bold uppercase">No inventory records found in filter.</p>
                              </div>
                          </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => {
                          const status = getStockStatus(item.availableQuantity, item.reorderPoint);
                          const StatusIcon = status.icon;

                          return (
                              <TableRow key={item.id} className="h-16 hover:bg-slate-50/50">
                                  <TableCell className="pl-8">
                                      <div className="flex flex-col">
                                          <span className="font-bold text-slate-900 text-sm">{item.productName}</span>
                                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{item.sku}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex flex-col text-xs">
                                          <span className="font-bold text-slate-800">{item.warehouseName}</span>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">{item.region}, {item.countryCode}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm font-bold text-slate-600">
                                      {item.totalQuantity.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm font-bold text-amber-600">
                                      {item.reservedQuantity > 0 ? item.reservedQuantity.toLocaleString() : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-base font-black text-blue-600">
                                      {item.availableQuantity.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-center pr-8">
                                      <Badge variant="outline" className={cn("gap-1 border-0 text-[9px] font-bold uppercase px-3 py-1", status.color)}>
                                          <StatusIcon className="h-3 w-3" />
                                          {status.label}
                                      </Badge>
                                  </TableCell>
                              </TableRow>
                          );
                      })
                    )}
                  </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ==================================================================== */}
      {/* MODAL: INTER-WAREHOUSE STOCK TRANSFER */}
      {/* ==================================================================== */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white text-center">
            <ArrowRightLeft size={36} className="mx-auto mb-2 text-blue-400" />
            <DialogTitle className="text-lg font-black uppercase tracking-wider">Inter-Warehouse Stock Transfer</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1 uppercase font-medium">Re-allocate stock between physical facilities</DialogDescription>
          </div>

          <div className="p-8 space-y-4 bg-white">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-slate-400">Select Item to Transfer *</Label>
              <Select value={transferForm.variant_id} onValueChange={v => setTransferForm({ ...transferForm, variant_id: v })}>
                <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200 text-xs">
                  <SelectValue placeholder="Select Product..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {activeStock.map(item => (
                    <SelectItem key={item.id} value={String(item.variantId || item.id)} className="font-bold text-xs">
                      {item.productName} ({item.warehouseName}) • Avail: {item.availableQuantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Source Node *</Label>
                <Select value={transferForm.source_location_id} onValueChange={v => setTransferForm({ ...transferForm, source_location_id: v })}>
                  <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200 text-xs">
                    <SelectValue placeholder="From..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map(loc => (
                      <SelectItem key={loc.id} value={loc.id} className="font-bold text-xs">{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Destination Node *</Label>
                <Select value={transferForm.destination_location_id} onValueChange={v => setTransferForm({ ...transferForm, destination_location_id: v })}>
                  <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200 text-xs">
                    <SelectValue placeholder="To..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map(loc => (
                      <SelectItem key={loc.id} value={loc.id} className="font-bold text-xs">{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-slate-400">Transfer Quantity *</Label>
              <Input type="number" value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })} className="h-11 rounded-xl font-bold text-blue-600" />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsTransferOpen(false)} className="h-12 font-bold uppercase text-xs text-slate-400">Cancel</Button>
            <Button onClick={() => transferStockMutation.mutate()} disabled={transferStockMutation.isPending} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl uppercase text-xs flex-1">
              {transferStockMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Authorize Stock Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}