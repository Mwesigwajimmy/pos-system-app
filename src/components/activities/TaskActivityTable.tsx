"use client";

import React, { useEffect, useState } from 'react';
import { activityService, Task } from '@/services/activityService';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Clock, AlertCircle, MoreHorizontal, Globe } from 'lucide-react';

export default function TaskActivityTable() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.app_metadata?.tenant_id; // Replace with your Tenant Hook if available
      
      if (tenantId) {
        try {
            const data = await activityService.getTasks(tenantId);
            setTasks(data);
        } catch(e) { console.error(e); }
      }
      setLoading(false);
    };
    load();
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'done': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'blocked': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-800">Pending Tasks</h3>
        <span className="text-xs text-gray-500">{tasks.length} active</span>
      </div>
      
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs tracking-wider border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Task & Entity</th>
              <th className="px-6 py-3">Country</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Syncing tasks...</td></tr>
            ) : tasks.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No pending tasks found.</td></tr>
            ) : (
                tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(task.status)} capitalize`}>
                        {task.status.replace('_', ' ')}
                    </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{task.entity_type} • {task.priority} Priority</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Globe className="w-3 h-3 text-gray-400" />
                            <span className="font-mono text-xs">{task.country_code}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">
                        {new Date(task.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}