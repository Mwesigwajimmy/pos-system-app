import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS for your React Frontend
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, payload } = await req.json()
    const timestamp = new Date().toISOString()

    switch (action) {
      // =========================================================================
      // 1. SCAM & ANOMALY DETECTION (Automated Sentinel)
      // =========================================================================
      case 'detect_fraud': {
        const { tenant_id, activity_count, reason } = payload;
        
        // Critical Threshold: If more than 100 sensitive actions occur in 1 minute
        if (activity_count > 100) {
          // Log to Global Telemetry
          await supabase.from('system_global_telemetry').insert({
            event_category: 'SECURITY',
            event_name: 'CRITICAL_SUSPICION_LOCK',
            severity_level: 'CRITICAL',
            tenant_id,
            metadata: { reason: `Autonomous Trigger: ${reason}`, count: activity_count }
          });

          // ACTION: Auto-Suspend for Architect Review
          await supabase.from('tenants')
            .update({ status: 'suspended_suspicious' })
            .eq('id', tenant_id);
            
          return new Response(JSON.stringify({ status: 'INTERVENED', tenant_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        break;
      }

      // =========================================================================
      // 2. BILLING & PAYMENT LOCKING (Financial Enforcement)
      // =========================================================================
      case 'check_billing': {
        // Logic: Find tenants who are 1 day past due and haven't paid
        const { data: overdueTenants } = await supabase
          .from('tenants')
          .select('id, name, next_payment_date')
          .lt('next_payment_date', timestamp)
          .not('status', 'eq', 'locked_payment');

        for (const tenant of overdueTenants || []) {
          // 1. Lock visibility (RLS will kick in via the status change)
          await supabase.from('tenants')
            .update({ status: 'locked_payment' })
            .eq('id', tenant.id);

          // 2. Log the event
          await supabase.from('system_global_telemetry').insert({
            event_category: 'PAYMENT',
            event_name: 'ACCOUNT_LOCKED_OVERDUE',
            severity_level: 'WARN',
            tenant_id: tenant.id
          });

          // 3. Send direct UI notification
          await supabase.from('system_broadcasts').insert({
            target_tenant_id: tenant.id,
            title: 'Action Required: Payment Overdue',
            content: 'Your access has been restricted due to an outstanding balance. Please settle your account to restore services.',
            category: 'BILLING'
          });
        }
        return new Response(JSON.stringify({ locked_count: overdueTenants?.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // =========================================================================
      // 3. BILATERAL COMMUNICATION (Messaging & Support)
      // =========================================================================
      case 'dispatch_message': {
        const { target_tenant_id, title, content, is_urgent } = payload;
        
        const { data, error } = await supabase.from('system_broadcasts').insert({
          target_tenant_id, // NULL means Global update
          title,
          content,
          category: is_urgent ? 'SECURITY' : 'UPDATE'
        });

        if (error) throw error;
        break;
      }

      case 'resolve_ticket': {
        const { ticket_id, architect_reply } = payload;
        
        await supabase.from('system_support_tickets')
          .update({ 
            architect_reply, 
            status: 'RESOLVED',
            updated_at: timestamp 
          })
          .eq('id', ticket_id);
          
        break;
      }

      // =========================================================================
      // 4. MANUAL OVERRIDE (Architect Command)
      // =========================================================================
      case 'set_tenant_status': {
        const { tenant_id, new_status, reason } = payload;
        
        await supabase.from('tenants')
          .update({ status: new_status })
          .eq('id', tenant_id);

        await supabase.from('system_global_telemetry').insert({
          event_category: 'SECURITY',
          event_name: `MANUAL_OVERRIDE_${new_status.toUpperCase()}`,
          tenant_id,
          metadata: { reason, admin_id: 'ROOT' }
        });
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown Action' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, timestamp }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})