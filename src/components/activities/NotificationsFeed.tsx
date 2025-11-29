"use client";

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Check, Search, Loader2 } from 'lucide-react';
import { activityService, Notification } from '@/services/activityService';
import { createClient } from '@/lib/supabase/client';

export default function NotificationsFeed() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Native Time Ago Helper (Avoids 'date-fns' dependency errors)
  const timeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const elapsed = now.getTime() - past.getTime();

    if (elapsed < msPerMinute) return 'Just now';
    if (elapsed < msPerHour) return Math.round(elapsed / msPerMinute) + 'm ago';
    if (elapsed < msPerDay) return Math.round(elapsed / msPerHour) + 'h ago';
    return Math.round(elapsed / msPerDay) + 'd ago';
  };

  useEffect(() => {
    const supabase = createClient();
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        fetchData(session.user.id);
      } else {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  const fetchData = async (uid: string) => {
    try {
      setLoading(true);
      const data = await activityService.getUserNotifications(uid);
      setNotifications(data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    // Optimistic Update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await activityService.markNotificationRead(id);
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await activityService.markAllRead(userId);
  };

  const filtered = notifications.filter(n => activeTab === 'all' ? true : !n.is_read);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <div className="p-2 rounded-full bg-green-100 text-green-600"><CheckCircle className="w-4 h-4" /></div>;
      case 'warning': return <div className="p-2 rounded-full bg-amber-100 text-amber-600"><AlertTriangle className="w-4 h-4" /></div>;
      case 'error': return <div className="p-2 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-4 h-4" /></div>;
      default: return <div className="p-2 rounded-full bg-blue-100 text-blue-600"><Info className="w-4 h-4" /></div>;
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" /> Notifications
        </h3>
        <button onClick={handleMarkAllRead} className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1">
          <Check className="w-3 h-3" /> Mark all read
        </button>
      </div>

      <div className="flex border-b border-gray-100">
        <button onClick={() => setActiveTab('unread')} className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'unread' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Unread</button>
        <button onClick={() => setActiveTab('all')} className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>All</button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500"/>
            <span className="text-xs text-gray-400">Syncing alerts...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
            <Bell className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-sm">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((n) => (
              <div key={n.id} onClick={() => handleMarkRead(n.id)} className={`group relative p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/20' : ''}`}>
                <div className="flex gap-3">
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                    {n.priority === 'high' && <span className="mt-2 inline-block px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-bold uppercase tracking-wider">High Priority</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}