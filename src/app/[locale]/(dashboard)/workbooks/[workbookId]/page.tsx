'use client';

import React, { memo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComp, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, AlertTriangle, ArrowLeft, Pencil, Trash2, Users, Clock, FileText, Download, Share2, History, MessageCircle, PlusCircle, ExternalLink } from 'lucide-react';
import { LiveSheetComponent } from '@/components/core/LiveSheetComponent';

// --- 1. Type Definitions ---
interface Collaborator { id: string; name: string; email: string; role: string; }
interface WorkbookDetails {
    id: string;
    name: string;
    owner: { id: string; name: string; email: string };
    created_at: string;
    updated_at: string;
    collaborators: Collaborator[];
    description?: string;
    is_active: boolean;
    sheet_count: number;
    last_activity: string;
    version: number;
}
interface WorkbookComment {
    id: string;
    author: { id: string; name: string; email: string };
    content: string;
    created_at: string;
}
interface WorkbookVersion {
    id: string;
    version: number;
    created_at: string;
    author: { id: string; name: string };
    note?: string;
}
interface WorkbookActivity {
    id: string;
    type: string;
    message: string;
    created_at: string;
    user: { id: string; name: string };
}

// --- 2. Supabase API Queries ---
const supabase = createClient();

async function fetchWorkbookDetails(workbookId: string): Promise<WorkbookDetails> {
    const { data, error } = await supabase.rpc('get_full_workbook_details', { p_workbook_id: workbookId }).single();
    if (error) {
        if (error.code === 'PGRST116') {
            throw new Error('Workbook not found or you do not have permission to view it.');
        }
        throw new Error(error.message);
    }
    if (!data || typeof data !== "object" || !("id" in data) || !("name" in data)) {
    throw new Error('Workbook not found.');
}
return data as WorkbookDetails;
}

async function fetchComments(workbookId: string): Promise<WorkbookComment[]> {
    const { data, error } = await supabase.rpc('get_workbook_comments', { p_workbook_id: workbookId });
    if (error) throw new Error(error.message);
    return data ?? [];
}
async function fetchVersions(workbookId: string): Promise<WorkbookVersion[]> {
    const { data, error } = await supabase.rpc('get_workbook_versions', { p_workbook_id: workbookId });
    if (error) throw new Error(error.message);
    return data ?? [];
}
async function fetchActivity(workbookId: string): Promise<WorkbookActivity[]> {
    const { data, error } = await supabase.rpc('get_workbook_activity', { p_workbook_id: workbookId });
    if (error) throw new Error(error.message);
    return data ?? [];
}
async function inviteCollaborator(workbookId: string, email: string) {
    const { error } = await supabase.rpc('invite_collaborator', { p_workbook_id: workbookId, p_email: email });
    if (error) throw new Error(error.message);
}
async function removeCollaborator(workbookId: string, collaboratorId: string) {
    const { error } = await supabase.rpc('remove_collaborator', { p_workbook_id: workbookId, p_collaborator_id: collaboratorId });
    if (error) throw new Error(error.message);
}
async function postComment(workbookId: string, content: string) {
    const { error } = await supabase.rpc('post_workbook_comment', { p_workbook_id: workbookId, p_content: content });
    if (error) throw new Error(error.message);
}
async function restoreVersion(workbookId: string, versionId: string) {
    const { error } = await supabase.rpc('restore_workbook_version', { p_workbook_id: workbookId, p_version_id: versionId });
    if (error) throw new Error(error.message);
}
async function exportWorkbook(workbookId: string): Promise<string> {
    // Returns a URL to download
    const { data, error } = await supabase.rpc('export_workbook', { p_workbook_id: workbookId });
    if (error) throw new Error(error.message);
    return data?.url ?? '#';
}

// --- 3. UI Sub-components ---
const WorkbookBreadcrumb = memo(({ workbookName }: { workbookName: string }) => (
    <nav aria-label="breadcrumb" className="flex items-center text-sm text-muted-foreground">
        <Link href="/workbooks" className="hover:underline">Workbooks</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground truncate" aria-current="page">
            {workbookName}
        </span>
    </nav>
)); WorkbookBreadcrumb.displayName = 'WorkbookBreadcrumb';

const WorkbookLoadingSkeleton = memo(() => (
    <div className="space-y-6 animate-pulse">
        <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[60vh] w-full" />
            </CardContent>
        </Card>
    </div>
)); WorkbookLoadingSkeleton.displayName = 'WorkbookLoadingSkeleton';

const WorkbookErrorState = memo(({ error }: { error: Error }) => (
    <div className="flex flex-col items-center justify-center text-center py-20">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Could Not Load Workbook</h1>
        <p className="text-muted-foreground mt-2 max-w-md">{error.message}</p>
        <Button asChild className="mt-6">
            <Link href="/workbooks"><ArrowLeft className="mr-2 h-4 w-4" />Return to Workbooks</Link>
        </Button>
    </div>
)); WorkbookErrorState.displayName = 'WorkbookErrorState';

// --- Info Panel: Audit, Collaborators, Actions, Metadata ---
const WorkbookInfoPanel = memo(({ workbook, onExport, exporting }: { workbook: WorkbookDetails, onExport: () => void, exporting: boolean }) => (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex flex-col gap-1">
            <div className="flex gap-2 items-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Sheets:</span>
                <span>{workbook.sheet_count}</span>
            </div>
            <div className="flex gap-2 items-center text-xs text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last activity: {workbook.last_activity ? formatTimestamp(workbook.last_activity) : "N/A"}
            </div>
            <div className="flex gap-2 items-center text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                Collaborators: {workbook.collaborators?.length ?? 0}
            </div>
            <div className="flex gap-2 items-center text-xs text-muted-foreground">
                <span>Owner: <span className="font-medium">{workbook.owner?.name ?? "N/A"}</span></span>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link href={`/workbooks/${workbook.id}/edit`}><Pencil className="h-4 w-4 mr-2" />Edit Workbook</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
                <Link href={`/workbooks/${workbook.id}/audit`}><Clock className="h-4 w-4 mr-2" />View Audit Log</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
                <Link href={`/workbooks/${workbook.id}/versions`}><History className="h-4 w-4 mr-2" />Version History</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={onExport} disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />{exporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button variant="outline" size="sm" asChild>
                <Link href={`/workbooks/${workbook.id}/share`}><Share2 className="h-4 w-4 mr-2" />Share</Link>
            </Button>
            <Button variant="destructive" size="sm" asChild>
                <Link href={`/workbooks/${workbook.id}/delete`}><Trash2 className="h-4 w-4 mr-2" />Delete</Link>
            </Button>
        </div>
    </div>
)); WorkbookInfoPanel.displayName = 'WorkbookInfoPanel';

function formatTimestamp(dateString: string) {
    try { return new Date(dateString).toLocaleString(); } catch { return dateString; }
}

// --- Collaborators Management ---
const CollaboratorsPanel = memo(({ workbookId, collaborators, refetch }: { workbookId: string, collaborators: Collaborator[], refetch: () => void }) => {
    const queryClient = useQueryClient();
    const [email, setEmail] = useState('');
    const [adding, setAdding] = useState(false);

    const inviteMutation = useMutation({
        mutationFn: (email: string) => inviteCollaborator(workbookId, email),
        onSuccess: () => { setEmail(''); refetch(); },
    });

    const removeMutation = useMutation({
        mutationFn: (collaboratorId: string) => removeCollaborator(workbookId, collaboratorId),
        onSuccess: () => { refetch(); },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle><Users className="h-5 w-5 inline-block mr-2" />Collaborators</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <Input
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Invite by email..."
                        disabled={inviteMutation.isPending}
                    />
                    <Button
                        size="sm"
                        onClick={() => inviteMutation.mutate(email)}
                        disabled={inviteMutation.isPending || !email}
                    >{inviteMutation.isPending ? 'Inviting...' : <><PlusCircle className="h-4 w-4 mr-1" />Invite</>}</Button>
                </div>
                {collaborators.length > 0 ? (
                    <ul className="space-y-2">
                        {collaborators.map(col => (
                            <li key={col.id} className="flex gap-2 items-center">
                                <span className="font-medium">{col.name}</span>
                                <span className="text-xs text-muted-foreground">{col.email}</span>
                                <span className="text-xs badge">{col.role}</span>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeMutation.mutate(col.id)}
                                    disabled={removeMutation.isPending}
                                >Remove</Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-muted-foreground text-sm">No collaborators assigned.</div>
                )}
            </CardContent>
        </Card>
    );
}); CollaboratorsPanel.displayName = 'CollaboratorsPanel';

// --- Comments/Discussion Panel ---
const CommentsPanel = memo(({ workbookId }: { workbookId: string }) => {
    const queryClient = useQueryClient();
    const { data: comments, isLoading, refetch } = useQuery({ 
        queryKey: ['workbookComments', workbookId], 
        queryFn: () => fetchComments(workbookId) 
    });
    const [comment, setComment] = useState('');
    const postMutation = useMutation({
        mutationFn: (content: string) => postComment(workbookId, content),
        onSuccess: () => { setComment(''); refetch(); },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle><MessageCircle className="h-5 w-5 inline-block mr-2" />Comments</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex gap-2">
                    <Textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Add a comment..."
                        disabled={postMutation.isPending}
                    />
                    <Button
                        size="sm"
                        onClick={() => postMutation.mutate(comment)}
                        disabled={postMutation.isPending || !comment}
                    >{postMutation.isPending ? 'Posting...' : 'Post'}</Button>
                </div>
                {isLoading ? <Skeleton className="h-12 w-full" /> : (
                    comments && comments.length > 0 ? (
                        <ul className="space-y-2">
                            {comments.map(cmt => (
                                <li key={cmt.id} className="border-b pb-2">
                                    <div className="font-medium">{cmt.author.name} <span className="text-xs text-muted-foreground">{cmt.created_at && formatTimestamp(cmt.created_at)}</span></div>
                                    <div className="text-sm">{cmt.content}</div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-muted-foreground text-sm">No comments yet.</div>
                    )
                )}
            </CardContent>
        </Card>
    );
}); CommentsPanel.displayName = 'CommentsPanel';

// --- Version History Panel ---
const VersionHistoryPanel = memo(({ workbookId }: { workbookId: string }) => {
    const queryClient = useQueryClient();
    const { data: versions, isLoading, refetch } = useQuery({ 
        queryKey: ['workbookVersions', workbookId], 
        queryFn: () => fetchVersions(workbookId) 
    });
    const restoreMutation = useMutation({
        mutationFn: (versionId: string) => restoreVersion(workbookId, versionId),
        onSuccess: () => { refetch(); },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle><History className="h-5 w-5 inline-block mr-2" />Version History</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-12 w-full" /> : (
                    versions && versions.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Note</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {versions.map(ver => (
                                    <TableRow key={ver.id}>
                                        <TableCell>{ver.version}</TableCell>
                                        <TableCell>{ver.created_at && formatTimestamp(ver.created_at)}</TableCell>
                                        <TableCell>{ver.author?.name}</TableCell>
                                        <TableCell>{ver.note ?? ''}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => restoreMutation.mutate(ver.id)}
                                                disabled={restoreMutation.isPending}
                                            >Restore</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-muted-foreground text-sm">No version history.</div>
                    )
                )}
            </CardContent>
        </Card>
    );
}); VersionHistoryPanel.displayName = 'VersionHistoryPanel';

// --- Activity Timeline ---
const ActivityPanel = memo(({ workbookId }: { workbookId: string }) => {
    const { data: activity, isLoading } = useQuery({ 
        queryKey: ['workbookActivity', workbookId], 
        queryFn: () => fetchActivity(workbookId) 
    });
    return (
        <Card>
            <CardHeader>
                <CardTitle><Clock className="h-5 w-5 inline-block mr-2" />Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-12 w-full" /> : (
                    activity && activity.length > 0 ? (
                        <ol className="list-disc ml-4 space-y-2">
                            {activity.map(act => (
                                <li key={act.id}>
                                    <span className="font-semibold">{act.user.name}</span> &mdash; {act.message}
                                    <span className="text-xs text-muted-foreground ml-2">{formatTimestamp(act.created_at)}</span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <div className="text-muted-foreground text-sm">No activity yet.</div>
                    )
                )}
            </CardContent>
        </Card>
    );
}); ActivityPanel.displayName = 'ActivityPanel';

// --- Main Page Component ---
export default function WorkbookPage({ params }: { params: { workbookId: string } }) {
    const queryClient = useQueryClient();
    const [exporting, setExporting] = useState(false);

    const { data: workbook, isLoading, isError, error, refetch } = useQuery({ 
        queryKey: ['workbookDetails', params.workbookId], 
        queryFn: () => fetchWorkbookDetails(params.workbookId) 
    });

    const handleExport = async () => {
        setExporting(true);
        try {
            const url = await exportWorkbook(params.workbookId);
            window.open(url, '_blank');
        } catch (err) { /* handle error if needed */ }
        setExporting(false);
    };

    if (isLoading) return <WorkbookLoadingSkeleton />;
    if (isError || !workbook) return <WorkbookErrorState error={error ?? new Error('Unknown error')} />;

    return (
        <div className="space-y-6">
            <WorkbookBreadcrumb workbookName={workbook.name} />
            <WorkbookInfoPanel workbook={workbook} onExport={handleExport} exporting={exporting} />
            <Card>
                <CardHeader>
                    <CardTitle>{workbook.name}</CardTitle>
                    <CardDescription>
                        {workbook.description ?? "This is a real-time, collaborative spreadsheet. Changes are saved and synced instantly across all users."}
                        <div className="mt-2 text-xs text-muted-foreground">
                            Created: {formatTimestamp(workbook.created_at)} | Updated: {formatTimestamp(workbook.updated_at)} | Status: {workbook.is_active ? "Active" : "Archived"}
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LiveSheetComponent workbookId={params.workbookId} />
                </CardContent>
            </Card>
            {/* Enterprise Panels */}
            <CollaboratorsPanel workbookId={workbook.id} collaborators={workbook.collaborators} refetch={refetch} />
            <CommentsPanel workbookId={workbook.id} />
            <VersionHistoryPanel workbookId={workbook.id} />
            <ActivityPanel workbookId={workbook.id} />
        </div>
    );
}