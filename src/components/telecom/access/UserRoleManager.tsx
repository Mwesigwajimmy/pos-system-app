'use client';

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, UserCog, Check, X } from "lucide-react";

interface User { 
    id: string; 
    name: string; 
    email: string;
    role: 'ADMIN' | 'AGENT' | 'SUPPORT' | 'MANAGER'; 
    location: string; 
    status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'; 
}

async function fetchUsers(tenantId: string) {
  const db = createClient();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');
  
  if (error) throw error; 
  return data as User[];
}

async function updateRole({ userId, role, tenantId }: { userId: string, role: string, tenantId: string }) {
  const db = createClient();
  const { error } = await db
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('tenant_id', tenantId);
  
  if (error) throw new Error(error.message);
}

export function UserRoleManager({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState("");

  const { data, isLoading, isError } = useQuery({ 
      queryKey: ['users', tenantId], 
      queryFn: () => fetchUsers(tenantId) 
  });

  const mutation = useMutation({
      mutationFn: updateRole,
      onSuccess: () => {
          toast.success('User role updated successfully');
          setEditingId(null);
          setSelectedRole("");
          queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      }, 
      onError: (e) => toast.error(e.message || 'Update failed')
  });

  const handleEdit = (user: User) => {
      setEditingId(user.id);
      setSelectedRole(user.role);
  };

  const handleSave = (userId: string) => {
      if (!selectedRole) return;
      mutation.mutate({ userId, role: selectedRole, tenantId });
  };

  return (
    <Card className="h-full border-t-4 border-t-slate-800 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-slate-800"/> Role & Access Management
          </CardTitle>
          <CardDescription>Manage user permissions and operational roles.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                ) : isError ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-red-500">Failed to load users.</TableCell></TableRow>
                ) : !data || data.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No users found.</TableCell></TableRow>
                ) : (
                    data.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-800">{u.name}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                        <TableCell>
                            {editingId === u.id ? (
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger className="h-8 w-[130px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                        <SelectItem value="MANAGER">Manager</SelectItem>
                                        <SelectItem value="AGENT">Agent</SelectItem>
                                        <SelectItem value="SUPPORT">Support</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="outline" className="font-mono text-xs">{u.role}</Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-sm">{u.location || 'Remote'}</TableCell>
                        <TableCell>
                            <Badge variant={u.status === 'ACTIVE' ? 'default' : 'secondary'} className={u.status === 'ACTIVE' ? 'bg-green-600' : ''}>
                                {u.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {editingId === u.id ? (
                                <div className="flex justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleSave(u.id)} disabled={mutation.isPending}>
                                        <Check className="w-4 h-4"/>
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setEditingId(null)}>
                                        <X className="w-4 h-4"/>
                                    </Button>
                                </div>
                            ) : (
                                <Button size="sm" variant="outline" className="h-8" onClick={() => handleEdit(u)}>
                                    Edit Role
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  )
}