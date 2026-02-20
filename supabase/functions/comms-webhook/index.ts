import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS for UI Handshakes
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const contentType = req.headers.get("content-type") || "";
    let sender = "";
    let body = "";
    let channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP';

    // --- LOGIC A: INBOUND WHATSAPP (Via Twilio or Meta Webhook) ---
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      sender = formData.get("From")?.toString().replace("whatsapp:", "") || "";
      body = formData.get("Body")?.toString() || "";
      channel = 'WHATSAPP';
    } 
    // --- LOGIC B: INBOUND EMAIL (Via Resend or SendGrid Webhook) ---
    else {
      const json = await req.json();
      sender = json.from || json.sender || "";
      body = json.text || json.subject || "";
      channel = 'EMAIL';
    }

    if (!sender || !body) throw new Error("Null Signal: No sender or body detected.");

    /**
     * SOVEREIGN IDENTITY RESOLUTION
     * Find the vendor linked to this contact method across your 11 industries.
     */
    const { data: vendor, error: vErr } = await supabase
      .from('vendors')
      .select('id, tenant_id, name')
      .or(`whatsapp_number.eq.${sender},email.eq.${sender}`)
      .single();

    if (vErr || !vendor) {
      // Log as unclassified telemetry if sender is unknown
      await supabase.from('system_global_telemetry').insert({
        event_category: 'COMMUNICATION',
        event_name: 'UNKNOWN_SENDER_BLOCKED',
        metadata: { sender, channel, raw_body: body }
      });
      return new Response(JSON.stringify({ status: "blocked" }), { status: 200 });
    }

    /**
     * THREAD WIRING
     * Find or create the conversation thread for this specific vendor.
     */
    let { data: thread } = await supabase
      .from('communication_threads')
      .select('id')
      .eq('tenant_id', vendor.tenant_id)
      .eq('channel_type', channel)
      .limit(1)
      .single();

    if (!thread) {
      const { data: newThread } = await supabase
        .from('communication_threads')
        .insert({
          tenant_id: vendor.tenant_id,
          channel_type: channel,
          last_message_preview: body.substring(0, 100)
        })
        .select()
        .single();
      thread = newThread;
    }

    /**
     * INBOUND INJECTION
     * This insert will trigger 'trg_comm_thread_sync' in your SQL,
     * which updates the UI in real-time.
     */
    const { error: msgErr } = await supabase
      .from('communication_messages')
      .insert({
        thread_id: thread.id,
        direction: 'INBOUND',
        sender_name: vendor.name,
        body: body,
        metadata: { raw_sender: sender }
      });

    if (msgErr) throw msgErr;

    // Pulse Telemetry
    await supabase.from('system_global_telemetry').insert({
      event_category: 'AGENTIC_SOURCING',
      event_name: 'INBOUND_REPLY_PROCESSED',
      tenant_id: vendor.tenant_id,
      severity_level: 'INFO'
    });

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})