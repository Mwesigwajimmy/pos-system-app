'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Define props for enterprise multi-tenancy
interface LiveDocProps {
  docId: string;
  userName: string;
  userColor: string;
  wsUrl?: string; // Enterprise URL, e.g., wss://collab.yourdomain.com
}

export function LiveDocComponent({ 
  docId, 
  userName, 
  userColor, 
  wsUrl = "wss://demos.yjs.dev" // Fallback public demo server for immediate "Real" functionality
}: LiveDocProps) {
  
  const [status, setStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');
  
  // 1. Memoize the Yjs Document so it persists across re-renders
  const yDoc = useMemo(() => new Y.Doc(), []);

  // 2. Setup the WebSocket Provider
  const provider = useMemo(() => {
    if (!wsUrl) return null;
    return new WebsocketProvider(wsUrl, docId, yDoc);
  }, [wsUrl, docId, yDoc]);

  // 3. Monitor Connection Status
  useEffect(() => {
    if (!provider) return;
    
    const handleStatus = (event: any) => {
      const state = event.status; // 'connected' or 'disconnected'
      setStatus(state === 'connected' ? 'ONLINE' : 'OFFLINE');
      if (state === 'connected') toast.success("Real-time collaboration active");
      if (state === 'disconnected') toast.error("Disconnected from collaboration server");
    };

    provider.on('status', handleStatus);

    return () => {
      provider.off('status', handleStatus);
      provider.destroy(); // Cleanup connection on unmount
      yDoc.destroy(); // Cleanup doc
    };
  }, [provider, yDoc]);

  // 4. Initialize Tiptap Editor with Collaboration Extensions
  const editor = useEditor({
    extensions: [
      // FIX: Cast configuration to 'any' to resolve TypeScript definition mismatch for 'history'
      StarterKit.configure({
        history: false, // History must be handled by Yjs, not Tiptap's local history
      } as any),
      Collaboration.configure({
        document: yDoc,
      }),
      CollaborationCursor.configure({
        provider: provider as any, // Type assertion for library compatibility
        user: {
          name: userName,
          color: userColor,
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl m-5 focus:outline-none min-h-[400px]',
      },
    },
  }, [yDoc, provider]);

  if (!editor) {
    return (
      <Card className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg">Live Collaborative Document</CardTitle>
        <div className="flex items-center gap-2">
           <span className="text-xs text-muted-foreground">User: {userName}</span>
           <Badge variant={status === "ONLINE" ? "secondary" : "destructive"} className={status === "ONLINE" ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
             <span className={`mr-1.5 h-2 w-2 rounded-full ${status === "ONLINE" ? "bg-green-600 animate-pulse" : "bg-red-600"}`} />
             {status === "ONLINE" ? "Live" : "Offline"}
           </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="border rounded-md bg-white min-h-[500px] p-4 mx-4 mb-4 shadow-inner">
           <EditorContent editor={editor} />
        </div>
      </CardContent>
    </Card>
  );
}