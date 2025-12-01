'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { activityService, ActivityLog } from '@/services/activityService';
import { 
    Shield, 
    Monitor, 
    Globe, 
    Clock, 
    Loader2, 
    AlertCircle, 
    FileText, 
    LogIn, 
    Trash2, 
    Edit, 
    PlusCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function UserActivityFeedPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

    useEffect(() => {
        const fetchRealData = async () => {
            const supabase = createClient();
            
            try {
                // 1. Get current authenticated user
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) throw new Error("Authentication required");

                setCurrentUserEmail(user.email || '');

                // 2. Call your REAL service
                const data = await activityService.getUserActivity(user.id);
                setLogs(data);

            } catch (err: any) {
                console.error("Activity Fetch Error:", err);
                setError("Failed to load activity stream.");
            } finally {
                setLoading(false);
            }
        };

        fetchRealData();
    }, []);

    // Helper to pick an icon based on action name
    const getActionIcon = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('login')) return <LogIn className="h-4 w-4 text-blue-500" />;
        if (lower.includes('delete')) return <Trash2 className="h-4 w-4 text-red-500" />;
        if (lower.includes('update')) return <Edit className="h-4 w-4 text-orange-500" />;
        if (lower.includes('create')) return <PlusCircle className="h-4 w-4 text-green-500" />;
        return <FileText className="h-4 w-4 text-gray-500" />;
    };

    // Helper to format JSON details safely
    const renderDetails = (details: string | object) => {
        if (!details) return null;
        if (typeof details === 'string') return <span className="text-muted-foreground">{details}</span>;
        
        // If it's an object, render key-value pairs
        return (
            <div className="mt-2 text-xs bg-muted/50 p-2 rounded border font-mono">
                {Object.entries(details).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                        <span className="font-semibold text-foreground/70">{key}:</span>
                        <span className="text-muted-foreground">{String(value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">User Activity Feed</h2>
                    <p className="text-muted-foreground">Real-time audit log of your actions within the system.</p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center gap-4 py-4 border-b bg-muted/20">
                    <div className="p-2 bg-background rounded-full border shadow-sm">
                        <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Audit Trail: {currentUserEmail}</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Secure Connection</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span>Live Updates</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Retrieving secure logs...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-destructive bg-destructive/5 m-4 rounded-lg border border-destructive/20">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                            <p>No activity recorded for this user account yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {logs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-muted/5 transition-colors group">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 p-2 rounded-lg bg-muted border">
                                            {getActionIcon(log.action)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">{log.action}</span>
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                        {log.entity}
                                                    </Badge>
                                                </div>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(log.created_at), 'PPP p')}
                                                </span>
                                            </div>
                                            
                                            <div className="text-sm text-muted-foreground break-words">
                                                {renderDetails(log.details)}
                                            </div>
                                            
                                            <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground/60">
                                                {log.ip_address && (
                                                    <span className="flex items-center gap-1">
                                                        <Monitor className="w-3 h-3" /> IP: {log.ip_address}
                                                    </span>
                                                )}
                                                {log.country_code && (
                                                    <span className="flex items-center gap-1">
                                                        <Globe className="w-3 h-3" /> Loc: {log.country_code}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}