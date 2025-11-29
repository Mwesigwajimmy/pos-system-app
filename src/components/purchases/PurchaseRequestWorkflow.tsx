'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// UI Components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ShoppingCart, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// --- Types ---
interface TenantContext {
  tenantId: string;
  country: string;
  currency: string;
}

interface ProductOption {
  id: number;
  name: string;
  sku: string;
}

interface StagedItem {
  product_id: number;
  product_name: string;
  quantity: number;
  notes: string;
}

interface PurchaseRequestItem {
  id: number;
  quantity: number;
  products: { name: string } | null;
}

interface PurchaseRequest {
  id: number;
  request_number: string;
  title: string;
  justification: string;
  requester_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_REVIEW';
  approval_comments: string | null;
  created_at: string;
  purchase_request_items: PurchaseRequestItem[];
}

// --- API Logic ---

async function fetchProducts(tenantId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE')
    .order('name');
  
  if (error) throw new Error(error.message);
  return data as ProductOption[];
}

async function fetchRequests(tenantId: string) {
  const supabase = createClient();
  // Join with items and products to get names
  const { data, error } = await supabase
    .from('purchase_requests')
    .select(`
      *,
      purchase_request_items (
        id, quantity,
        products ( name )
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as PurchaseRequest[];
}

async function createPurchaseRequest(input: { 
  title: string; 
  justification: string; 
  items: StagedItem[]; 
  tenant_id: string 
}) {
  const supabase = createClient();
  
  // Use RPC to handle header + items insertion atomically
  const { data, error } = await supabase.rpc('create_full_purchase_request', {
    p_title: input.title,
    p_justification: input.justification,
    p_tenant_id: input.tenant_id,
    p_items: input.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, notes: i.notes }))
  });

  if (error) throw new Error(error.message);
  return data;
}

// --- Main Component ---

export default function PurchaseRequestWorkflow({ tenant }: { tenant: TenantContext }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [justification, setJustification] = useState('');
  
  // Item Staging State
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');

  // Queries
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['active-products', tenant.tenantId],
    queryFn: () => fetchProducts(tenant.tenantId),
    enabled: isDialogOpen // Only fetch when modal opens
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['purchase-requests', tenant.tenantId],
    queryFn: () => fetchRequests(tenant.tenantId),
  });

  // Mutation
  const mutation = useMutation({
    mutationFn: createPurchaseRequest,
    onSuccess: () => {
      toast.success("Purchase request submitted successfully");
      queryClient.invalidateQueries({ queryKey: ['purchase-requests', tenant.tenantId] });
      handleCloseDialog();
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit request"),
  });

  // Handlers
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTitle('');
    setJustification('');
    setStagedItems([]);
    setSelectedProduct('');
    setQuantity(1);
    setNotes('');
  };

  const handleAddItem = () => {
    if (!selectedProduct) return toast.error("Please select a product");
    if (quantity <= 0) return toast.error("Quantity must be greater than 0");

    const productDetails = products?.find(p => p.id.toString() === selectedProduct);
    if (!productDetails) return;

    const newItem: StagedItem = {
      product_id: productDetails.id,
      product_name: productDetails.name,
      quantity,
      notes
    };

    setStagedItems([...stagedItems, newItem]);
    
    // Reset item inputs
    setSelectedProduct('');
    setQuantity(1);
    setNotes('');
  };

  const handleRemoveItem = (index: number) => {
    setStagedItems(stagedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) return toast.error("Request Title is required");
    if (stagedItems.length === 0) return toast.error("Please add at least one item");
    
    mutation.mutate({
      title,
      justification,
      items: stagedItems,
      tenant_id: tenant.tenantId
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-green-600">Approved</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>;
      case 'IN_REVIEW': return <Badge className="bg-blue-600">In Review</Badge>;
      default: return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>;
    }
  };

  return (
    <Card className="h-full border-t-4 border-t-slate-800 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-slate-800"/> Purchase Requisitions
          </CardTitle>
          <CardDescription>Raise and track internal requests for materials or services.</CardDescription>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" /> New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Create Purchase Request</DialogTitle>
              <DialogDescription>Fill in the details below to initiate the approval workflow.</DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Request Title</label>
                  <Input 
                    placeholder="e.g. Q4 Office Supplies" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Justification / Business Case</label>
                  <Textarea 
                    placeholder="Why is this purchase necessary?" 
                    value={justification} 
                    onChange={e => setJustification(e.target.value)} 
                  />
                </div>
              </div>

              <div className="border-t my-2"></div>

              {/* Item Builder */}
              <div className="bg-slate-50 p-3 rounded-lg border space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4"/> Add Items
                </h4>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={productsLoading ? "Loading..." : "Select Product"} />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name} <span className="text-muted-foreground text-xs">({p.sku})</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input 
                      type="number" 
                      min={1} 
                      value={quantity} 
                      onChange={e => setQuantity(Number(e.target.value))} 
                      className="bg-white"
                      placeholder="Qty"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input 
                      placeholder="Notes (optional)" 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      className="bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleAddItem} variant="outline" className="w-full">Add</Button>
                  </div>
                </div>
              </div>

              {/* Staged Items List */}
              <div className="border rounded-md max-h-[200px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagedItems.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-16">No items added yet.</TableCell></TableRow>
                    ) : (
                      stagedItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{item.notes || '-'}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleRemoveItem(idx)}>
                              <Trash2 className="h-3 w-3"/>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={mutation.isPending}>
                {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...</> : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>PR Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestsLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
              ) : !requests || requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-8 w-8 text-slate-300 mb-2"/>
                      No purchase requests found.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs font-medium">{req.request_number || `#${req.id}`}</TableCell>
                    <TableCell className="font-medium text-slate-800">{req.title}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {req.requester_name || 'System'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {req.purchase_request_items?.map(it => `${it.quantity}x ${it.products?.name}`).join(', ')}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {format(new Date(req.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}