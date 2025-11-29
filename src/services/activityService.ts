import { createClient } from '@/lib/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

// --- Enterprise Data Models (Database Schema) ---

export interface ActivityLog {
  id: string;
  created_at: string;
  tenant_id: string;   // Multi-tenant isolation
  actor_id: string;
  actor_email: string; // Joined from auth/profiles
  action: string;      // e.g., 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'LOGIN'
  entity: string;      // e.g., 'Invoice', 'Payroll', 'Inventory'
  entity_id: string;   // The specific ID of the item acted upon
  details: string | object; // Can be JSON or string description
  country_code: string; // Multi-country support
  ip_address?: string;
  user_agent?: string;
}

export interface Notification {
  id: string;
  created_at: string;
  tenant_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'high' | 'normal' | 'low';
  is_read: boolean;
  link_url?: string;
  metadata?: any; // For custom data (e.g., invoice_id)
}

export interface Task {
  id: string;
  created_at: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'high' | 'medium' | 'low';
  due_date: string;
  assignee_id: string;
  assignee_email?: string;
  entity_type?: string; // e.g., 'invoice'
  entity_id?: string;   // e.g., invoice UUID
  country_code: string;
}

export interface Comment {
  id: string;
  created_at: string;
  thread_id: string; // Links to Invoice ID, Order ID, etc.
  user_id: string;
  user_email: string;
  content: string;
  attachments?: string[]; // Array of URLs
  updated_at?: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_name: string;
  approver_role: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  actioned_by?: string;
  actioned_at?: string;
  tenant_id: string;
  comments?: string;
}

// --- Service Implementation ---

export const activityService = {
  
  // ============================================================================
  // AUDIT LOGS (Activity Timeline)
  // ============================================================================

  /**
   * Fetch Audit Logs for the Timeline
   * Supports filtering by tenant and country context
   */
  async getAuditLogs(tenantId: string, limit = 50) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ActivityLog[];
  },

  /**
   * Fetch specific user activity for security audit or profile view
   */
  async getUserActivity(userId: string, limit = 20) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('actor_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ActivityLog[];
  },

  /**
   * Record a new activity (Use this in your server actions or API routes)
   */
  async logActivity(entry: Omit<ActivityLog, 'id' | 'created_at'>) {
    const supabase = createClient();
    const { error } = await supabase
      .from('activity_logs')
      .insert([entry]);

    if (error) {
      console.error('Failed to write audit log:', error);
      // We usually don't throw here to prevent blocking the main user flow
    }
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  /**
   * Fetch Real-time Notifications for the specific logged-in user
   */
  async getUserNotifications(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data as Notification[];
  },

  async markNotificationRead(notificationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('activity_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
  },

  async markAllRead(userId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('activity_notifications')
      .update({ is_read: true })
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Create a system notification (Triggered by events)
   */
  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) {
    const supabase = createClient();
    const { error } = await supabase
      .from('activity_notifications')
      .insert([{ ...notification, is_read: false }]);

    if (error) throw error;
  },

  // ============================================================================
  // TASKS (Todo / Assignments)
  // ============================================================================

  /**
   * Fetch Tasks for the Table View
   */
  async getTasks(tenantId: string, assigneeId?: string) {
    const supabase = createClient();
    let query = supabase
      .from('activity_tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true });

    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Task[];
  },

  async createTask(task: Omit<Task, 'id' | 'created_at'>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_tasks')
      .insert([task])
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async updateTaskStatus(taskId: string, status: Task['status']) {
    const supabase = createClient();
    const { error } = await supabase
      .from('activity_tasks')
      .update({ status })
      .eq('id', taskId);

    if (error) throw error;
  },

  // ============================================================================
  // COMMENTS (Threads)
  // ============================================================================

  /**
   * Fetch Comments for a specific record (Invoice, Bill, etc.)
   */
  async getComments(threadId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_comments')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Comment[];
  },

  /**
   * Post a new comment to a thread
   */
  async postComment(comment: { thread_id: string; user_id: string; user_email: string; content: string }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_comments')
      .insert(comment)
      .select()
      .single();

    if (error) throw error;
    return data as Comment;
  },

  // ============================================================================
  // WORKFLOWS
  // ============================================================================

  /**
   * Fetch Workflow Status for visualization
   */
  async getWorkflowSteps(workflowId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as WorkflowStep[];
  },

  async approveWorkflowStep(stepId: string, userId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('activity_workflow_steps')
      .update({ 
        status: 'approved', 
        actioned_by: userId,
        actioned_at: new Date().toISOString()
      })
      .eq('id', stepId);

    if (error) throw error;
  }
};