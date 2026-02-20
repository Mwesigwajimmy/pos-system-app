'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { 
  MessageSquare, Send, Phone, Mail, ShieldCheck, 
  User, Bot, Zap, Search, Archive, MoreVertical, CheckCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type Thread = Tables<'communication_threads'> & { customer_name?: string };
type Message = Tables<'communication_messages'>;

export default function UnifiedCommsHub() {
  const supabase = createClient();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load & Real-time Sync
  useEffect(() => {
    const fetchThreads = async () => {
      const { data } = await supabase
        .from('communication_threads')
        .select('*, customers(name)')
        .order('updated_at', { ascending: false });
      if (data) setThreads(data as any);
    };

    fetchThreads();

    // Listen for new messages across all threads
    const channel = supabase
      .channel('unified_comms')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'communication_messages' }, 
      (payload) => {
        const msg = payload.new as Message;
        if (msg.thread_id === activeThreadId) {
          setMessages(prev => [...prev, msg]);
        }
        fetchThreads(); // Refresh thread previews
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeThreadId, supabase]);

  // 2. Fetch messages when thread changes
  useEffect(() => {
    if (!activeThreadId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('communication_messages')
        .select('*')
        .eq('thread_id', activeThreadId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
  }, [activeThreadId, supabase]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeThreadId) return;
    
    // This inserts into the DB, which triggers your 'trg_comm_thread_sync'
    await supabase.from('communication_messages').insert({
      thread_id: activeThreadId,
      direction: 'OUTBOUND',
      body: newMessage,
      sender_name: 'System Admin'
    });

    setNewMessage('');
  };

  return (
    <div className="flex h-[80vh] border rounded-xl bg-white overflow-hidden shadow-2xl">
      {/* Thread Sidebar */}
      <div className="w-80 border-r bg-slate-50/50 flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Fingerprint className="text-primary w-5 h-5" />
            <h2 className="font-bold text-sm uppercase tracking-widest">Sovereign Comms</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search threads..." className="pl-8 bg-slate-50 border-none h-9 text-xs" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {threads.map(thread => (
            <div 
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={cn(
                "p-4 cursor-pointer hover:bg-white transition-all border-b border-transparent",
                activeThreadId === thread.id ? "bg-white border-l-4 border-l-primary shadow-sm" : "opacity-70"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate">{thread.customer_name || 'Anonymous Vendor'}</span>
                <span className="text-[10px] text-slate-400 font-mono">{format(new Date(thread.updated_at!), 'HH:mm')}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{thread.last_message_preview}</p>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline" className="text-[8px] px-1.5 py-0">
                  {thread.channel_type === 'WHATSAPP' ? <Zap size={8} className="mr-1 fill-current" /> : null}
                  {thread.channel_type}
                </Badge>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Message Window */}
      <div className="flex-1 flex flex-col bg-white">
        {activeThreadId ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Thread: {activeThreadId.substring(0,8)}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <Activity size={10} className="animate-pulse" /> ENCRYPTED CHANNEL ACTIVE
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon"><MoreVertical size={18} /></Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6 bg-slate-50/20">
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex flex-col", msg.direction === 'OUTBOUND' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[70%] p-3 rounded-2xl text-sm shadow-sm",
                      msg.direction === 'OUTBOUND' 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white border text-slate-800 rounded-tl-none"
                    )}>
                      {msg.body}
                    </div>
                    <div className="mt-1 flex items-center gap-1 px-1">
                      <span className="text-[9px] text-slate-400 font-mono">
                        {format(new Date(msg.created_at!), 'HH:mm')}
                      </span>
                      {msg.direction === 'OUTBOUND' && <CheckCheck size={10} className="text-blue-500" />}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-white">
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl items-center pr-2">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a secure message..." 
                  className="bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-400"
                />
                <Button size="icon" onClick={handleSendMessage} className="rounded-lg shadow-lg">
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
             <MessageSquare size={64} className="opacity-10 mb-4" />
             <p className="text-sm font-bold uppercase tracking-widest opacity-20">Select a Secure Thread</p>
          </div>
        )}
      </div>
    </div>
  );
}