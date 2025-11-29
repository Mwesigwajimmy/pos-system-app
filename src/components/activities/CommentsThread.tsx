"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, MoreVertical, Paperclip } from "lucide-react";
import { activityService, Comment } from '@/services/activityService';
import { createClient } from '@/lib/supabase/client';

// Defined props interface to fix the Type Error
interface Props {
  threadId: string; 
}

export default function CommentsThread({ threadId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null); // Storing auth user locally
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Initialize Supabase client
  const supabase = createClient();

  // 1. Auth & Initial Data Load
  useEffect(() => {
    const init = async () => {
      // Get User Session directly (No custom hook needed)
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (threadId) {
        const data = await activityService.getComments(threadId);
        setComments(data);
      }
    };
    init();

    // 2. Real-time Subscription
    const channel = supabase
      .channel(`activity_comments:${threadId}`)
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'activity_comments', // Ensure this matches your DB table name
          filter: `thread_id=eq.${threadId}` 
        }, 
        (payload) => {
          setComments(prev => [...prev, payload.new as Comment]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId, supabase]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      // Optimistic Update
      const optimisticComment: Comment = {
        id: Math.random().toString(),
        created_at: new Date().toISOString(),
        thread_id: threadId,
        user_id: user.id,
        user_email: user.email || 'Unknown',
        content: message
      };
      
      setComments(prev => [...prev, optimisticComment]);
      setMessage('');

      // Actual Save
      await activityService.postComment({
        thread_id: threadId,
        user_id: user.id,
        user_email: user.email || 'Unknown',
        content: optimisticComment.content
      });
    } catch (err) {
      console.error("Failed to send", err);
      // Optional: Add toast error here
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
        <div>
            <h3 className="font-bold text-gray-800 text-sm">Discussion</h3>
            <p className="text-xs text-gray-500">Live collaboration</p>
        </div>
        <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {comments.length === 0 && <div className="text-center text-xs text-gray-400 mt-10">No comments yet. Start the conversation!</div>}
        {comments.map((c) => {
          const isMe = c.user_id === user?.id;
          return (
            <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {(c.user_email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                <p>{c.content}</p>
                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-gray-200 bg-white">
        <form onSubmit={handleSend} className="flex items-center gap-2">
           <button type="button" className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><Paperclip className="w-4 h-4"/></button>
           <input 
             className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
             placeholder="Type message..."
             value={message}
             onChange={e => setMessage(e.target.value)}
           />
           <button type="submit" disabled={!message.trim()} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
             <Send className="w-4 h-4" />
           </button>
        </form>
      </div>
    </div>
  );
}