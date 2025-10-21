// src/app/(dashboard)/sacco/collections/page.tsx
// FINAL & DEFINITIVE VERSION

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// --- TYPE DEFINITIONS (UPDATED) ---
interface SaccoGroup {
    id: string; // Changed from bigint
    group_name: string;
    contribution_amount: number;
}
interface GroupMember {
    member_id: string; // Changed from bigint
    member_name: string;
}
interface CollectionEntry {
    member_id: string; // Changed from bigint
    is_present: boolean;
    contribution: number;
    fine: number;
}

// --- ASYNC FUNCTIONS (UPDATED) ---
async function fetchSaccoGroups(): Promise<SaccoGroup[]> {
    const supabase = createClient();
    // This now calls the corrected function that returns text IDs
    const { data, error } = await supabase.rpc('fetch_sacco_groups');
    if (error) throw new Error('Failed to fetch groups: ' + error.message);
    return data;
}

async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> { // Accepts string
    const supabase = createClient();
    // This now calls the corrected function that returns text IDs
    const { data, error } = await supabase.rpc('fetch_group_members', { p_group_id: groupId });
    if (error) throw new Error('Failed to fetch group members: ' + error.message);
    return data;
}

async function submitGroupCollections(collectionData: {
    groupId: string; // Changed from bigint
    meetingDate: string;
    entries: CollectionEntry[];
}) {
    const supabase = createClient();
    const { error } = await supabase.rpc('process_group_collections', {
        p_group_id: collectionData.groupId,
        p_meeting_date: collectionData.meetingDate,
        p_collections: collectionData.entries.map(e => ({
            member_id: e.member_id, // This is already a string
            is_present: e.is_present,
            contribution_amount: e.contribution,
            fine_amount: e.fine
        }))
    });
    if (error) throw new Error('Failed to submit collections: ' + error.message);
}

const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-US').format(value)}`;

// --- MAIN COMPONENT (UPDATED) ---
export default function GroupCollectionsPage() {
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null); // Changed from bigint
    const [collectionEntries, setCollectionEntries] = useState<Map<string, CollectionEntry>>(new Map()); // Key is now string
    const queryClient = useQueryClient();

    const { data: groups, isLoading: isLoadingGroups } = useQuery({
        queryKey: ['saccoGroups'],
        queryFn: fetchSaccoGroups
    });

    const { data: members, isLoading: isLoadingMembers } = useQuery({
        queryKey: ['groupMembers', selectedGroupId],
        queryFn: () => fetchGroupMembers(selectedGroupId!),
        enabled: !!selectedGroupId,
    });

    useEffect(() => {
        if (members && groups) {
            const initialEntries = new Map<string, CollectionEntry>();
            const standardContribution = groups.find(g => g.id === selectedGroupId)?.contribution_amount || 0;
            members.forEach(member => {
                initialEntries.set(member.member_id, {
                    member_id: member.member_id,
                    is_present: false,
                    contribution: standardContribution,
                    fine: 0,
                });
            });
            setCollectionEntries(initialEntries);
        }
    }, [members, groups, selectedGroupId]);

    const collectionMutation = useMutation({
        mutationFn: submitGroupCollections,
        onSuccess: () => {
            toast.success("Group collections submitted successfully!");
            queryClient.invalidateQueries({ queryKey: ['saccoDashboardKPIs'] });
            setSelectedGroupId(null);
            setCollectionEntries(new Map());
        },
        onError: (err: any) => toast.error(err.message),
    });

    const updateEntry = (memberId: string, field: keyof CollectionEntry, value: any) => { // Accepts string
        setCollectionEntries(prev => {
            const newEntries = new Map(prev);
            const entry = newEntries.get(memberId);
            if (entry) {
                if (field === 'is_present' && !value) {
                    newEntries.set(memberId, { ...entry, is_present: false, contribution: 0, fine: 0 });
                } else {
                    newEntries.set(memberId, { ...entry, [field]: value });
                }
            }
            return newEntries;
        });
    };
    
    const handleMarkAll = () => {
        setCollectionEntries(prev => {
            const newEntries = new Map(prev);
            const standardContribution = groups?.find(g => g.id === selectedGroupId)?.contribution_amount || 0;
            newEntries.forEach((entry, memberId) => {
                newEntries.set(memberId, {
                    ...entry,
                    is_present: true,
                    contribution: standardContribution,
                    fine: 0
                });
            });
            return newEntries;
        });
    };

    const handleSubmit = () => {
        if (!selectedGroupId) return;
        const entriesArray = Array.from(collectionEntries.values());
        collectionMutation.mutate({
            groupId: selectedGroupId,
            meetingDate: format(new Date(), 'yyyy-MM-dd'),
            entries: entriesArray,
        });
    };

    const selectedGroup = useMemo(() => groups?.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
    const totalCollected = useMemo(() => {
        return Array.from(collectionEntries.values()).reduce((acc, entry) => acc + entry.contribution + entry.fine, 0);
    }, [collectionEntries]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">Group Collections</h1>
            <p className="text-muted-foreground">Select a group to start a new collection session for today's meeting.</p>
            
            {!selectedGroupId && (
                <Card className="max-w-lg mx-auto">
                    <CardHeader>
                        <CardTitle>Start a Collection Session</CardTitle>
                        <CardDescription>Select the group that is holding a meeting right now.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingGroups ? <p>Loading groups...</p> : (
                            <Select onValueChange={(value) => setSelectedGroupId(value)}>
                                <SelectTrigger><SelectValue placeholder="Select a group..." /></SelectTrigger>
                                <SelectContent>
                                    {groups?.map(group => <SelectItem key={group.id} value={group.id}>{group.group_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </CardContent>
                </Card>
            )}

            {selectedGroupId && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Collection for: {selectedGroup?.group_name}</CardTitle>
                                <CardDescription>
                                    Meeting Date: {format(new Date(), "PPP")}. Standard contribution is {formatCurrency(selectedGroup?.contribution_amount || 0)}.
                                </CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => setSelectedGroupId(null)}>Change Group</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingMembers ? <p>Loading members...</p> : (
                            <div className="space-y-4">
                                <div className="flex justify-end"><Button onClick={handleMarkAll} variant="secondary">Mark All as Present & Paid</Button></div>
                                <Table>
                                    <TableHeader><TableRow><TableHead className="w-[50px]">Present</TableHead><TableHead>Member Name</TableHead><TableHead className="w-[180px]">Contribution</TableHead><TableHead className="w-[180px]">Fines</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {members?.map(member => {
                                            const entry = collectionEntries.get(member.member_id);
                                            return (
                                                <TableRow key={member.member_id} className={entry?.is_present ? '' : 'opacity-50'}>
                                                    <TableCell><Checkbox checked={entry?.is_present} onCheckedChange={(checked) => updateEntry(member.member_id, 'is_present', checked)}/></TableCell>
                                                    <TableCell className="font-medium">{member.member_name}</TableCell>
                                                    <TableCell><Input type="number" value={entry?.contribution ?? 0} onChange={(e) => updateEntry(member.member_id, 'contribution', Number(e.target.value))} disabled={!entry?.is_present}/></TableCell>
                                                    <TableCell><Input type="number" value={entry?.fine ?? 0} onChange={(e) => updateEntry(member.member_id, 'fine', Number(e.target.value))} disabled={!entry?.is_present}/></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between items-center bg-muted/50 py-4 px-6">
                        <div className="text-lg font-bold">Total Collected Today: <span className="text-primary">{formatCurrency(totalCollected)}</span></div>
                        <Button size="lg" onClick={handleSubmit} disabled={collectionMutation.isPending}>{collectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Collections</Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}