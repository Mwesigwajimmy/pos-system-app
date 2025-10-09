// src/app/(dashboard)/sacco/groups/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, UserPlus, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// --- Type Definitions ---
interface SaccoGroup { id: bigint; group_name: string; contribution_amount: number; }
interface SaccoMember { id: bigint; name: string; }
// Corrected: Both `sacco_members` and `customers` are arrays
interface GroupMember { member_id: bigint; sacco_members: { customers: { name: string }[] }[] }

// --- Async Functions ---
async function fetchGroups() {
    const supabase = createClient();
    const { data, error } = await supabase.from('sacco_groups').select('*');
    if (error) throw error;
    return data;
}
async function fetchGroupMembers(groupId: bigint) {
    const supabase = createClient();
    const { data, error } = await supabase.from('sacco_group_members').select('member_id, sacco_members(customers(name))').eq('group_id', groupId);
    if (error) throw error;
    return data;
}
async function fetchAllMembers(): Promise<SaccoMember[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('sacco_members').select('id, customers(name)');
    if (error) throw error;
    return data.map((m: any) => ({ id: m.id, name: m.customers.name }));
}
async function createGroup(vars: { name: string; amount: number }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('create_sacco_group', { p_group_name: vars.name, p_contribution_amount: vars.amount });
    if (error) throw error;
}
async function addMember(vars: { groupId: bigint; memberId: bigint }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('add_member_to_group', { p_group_id: vars.groupId, p_member_id: vars.memberId });
    if (error) throw error;
}
async function removeMember(vars: { groupId: bigint; memberId: bigint }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('remove_member_from_group', { p_group_id: vars.groupId, p_member_id: vars.memberId });
    if (error) throw error;
}

export default function GroupManagementPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<SaccoGroup | null>(null);
    const queryClient = useQueryClient();

    const { data: groups, isLoading: isLoadingGroups } = useQuery({ queryKey: ['saccoGroups'], queryFn: fetchGroups });
    const { data: allMembers } = useQuery({ queryKey: ['allSaccoMembers'], queryFn: fetchAllMembers });
    const { data: groupMembers, isLoading: isLoadingMembers } = useQuery({
        queryKey: ['groupMembers', selectedGroup?.id],
        queryFn: () => fetchGroupMembers(selectedGroup!.id),
        enabled: !!selectedGroup,
    });

    const handleMutationSuccess = (message: string) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['saccoGroups'] });
        queryClient.invalidateQueries({ queryKey: ['groupMembers', selectedGroup?.id] });
        setIsCreateOpen(false);
        setIsAddMemberOpen(false);
    };
    const handleMutationError = (error: any) => toast.error(`Operation failed: ${error.message}`);

    const createMutation = useMutation({ mutationFn: createGroup, onSuccess: () => handleMutationSuccess("Group created!"), onError: handleMutationError });
    const addMemberMutation = useMutation({ mutationFn: addMember, onSuccess: () => handleMutationSuccess("Member added!"), onError: handleMutationError });
    const removeMemberMutation = useMutation({ mutationFn: removeMember, onSuccess: () => handleMutationSuccess("Member removed!"), onError: handleMutationError });
    
    const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createMutation.mutate({ name: formData.get('name') as string, amount: Number(formData.get('amount')) });
    };
    
    const handleAddMemberSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        addMemberMutation.mutate({ groupId: selectedGroup!.id, memberId: BigInt(formData.get('member') as string) });
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Group Management</h1>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/>New Group</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create New Member Group</DialogTitle></DialogHeader>
                        <form id="createGroupForm" onSubmit={handleCreateSubmit} className="space-y-4 py-4">
                            <Label>Group Name</Label><Input name="name" required />
                            <Label>Standard Contribution Amount (UGX)</Label><Input name="amount" type="number" required />
                        </form>
                        <DialogFooter><Button form="createGroupForm" type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Group"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Accordion type="single" collapsible className="w-full">
                {isLoadingGroups && <p>Loading groups...</p>}
                {groups?.map(group => (
                    <AccordionItem value={group.id.toString()} key={group.id.toString()}>
                        <AccordionTrigger onClick={() => setSelectedGroup(group)} className="text-lg font-medium">{group.group_name}</AccordionTrigger>
                        <AccordionContent>
                            <Card className="border-none shadow-none">
                                <CardContent className="pt-4 space-y-4">
                                    {isLoadingMembers && <p>Loading members...</p>}
                                    {groupMembers?.map(gm => (
                                        <div key={gm.member_id.toString()} className="flex justify-between items-center">
                                            {/* Corrected: Access the first element of both nested arrays */}
                                            <span>{gm.sacco_members[0]?.customers[0]?.name}</span>
                                            <Button variant="ghost" size="sm" onClick={() => removeMemberMutation.mutate({ groupId: group.id, memberId: gm.member_id })}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        </div>
                                    ))}
                                    {groupMembers?.length === 0 && <p className="text-muted-foreground">No members in this group yet.</p>}
                                </CardContent>
                                <CardFooter>
                                    <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                                        <DialogTrigger asChild><Button variant="outline" onClick={() => setSelectedGroup(group)}><UserPlus className="mr-2 h-4 w-4"/>Add Member</Button></DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Add Member to {selectedGroup?.group_name}</DialogTitle></DialogHeader>
                                            <form id="addMemberForm" onSubmit={handleAddMemberSubmit} className="space-y-4 py-4">
                                                <Select name="member" required>
                                                    <SelectTrigger><SelectValue placeholder="Select a member to add..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {allMembers?.map(m => <SelectItem key={m.id.toString()} value={m.id.toString()}>{m.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </form>
                                            <DialogFooter><Button form="addMemberForm" type="submit" disabled={addMemberMutation.isPending}>{addMemberMutation.isPending ? "Adding..." : "Add Member"}</Button></DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardFooter>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}