"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function LocationManager() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const [name, setName] = useState('');
    const [city, setCity] = useState('');

    // --- FETCH LOCATIONS ---
    const { data: locations, isLoading } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const { data, error } = await supabase.from('locations').select('*').order('name');
            if (error) throw error;
            return data;
        }
    });

    // --- CREATE LOCATION ---
    const mutation = useMutation({
        mutationFn: async (payload: { name: string, city: string }) => {
            // NOTE: tenant_id/business_id are handled by the database trigger
            const { error } = await supabase.from('locations').insert({
                name: payload.name,
                city: payload.city,
                status: 'active',
                is_primary: false
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Location added successfully");
            setName('');
            setCity('');
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleAdd = () => {
        if (!name.trim()) return toast.error("Location name is required");
        mutation.mutate({ name, city });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Location</CardTitle>
                    <CardDescription>Create warehouses, retail stores, or distribution centers.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                        <Label>Location Name</Label>
                        <Input placeholder="e.g. Warehouse B" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>City</Label>
                        <Input placeholder="e.g. Kampala" value={city} onChange={e => setCity(e.target.value)} />
                    </div>
                    <Button onClick={handleAdd} disabled={mutation.isPending} className="flex gap-2">
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create Location
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Existing Locations</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : locations?.map(loc => (
                                <TableRow key={loc.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {loc.is_primary ? <Building2 className="h-4 w-4 text-blue-500" /> : <MapPin className="h-4 w-4 text-slate-400" />}
                                        {loc.name}
                                        {loc.is_primary && <Badge variant="secondary" className="text-[10px] ml-2">Primary</Badge>}
                                    </TableCell>
                                    <TableCell>{loc.city || '-'}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{loc.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}