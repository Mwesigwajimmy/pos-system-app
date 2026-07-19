// supabase/functions/aura-callback-orchestrator/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY')
const AURA_RECEPTIONIST_ID = Deno.env.get('AURA_RECEPTIONIST_ID')

serve(async (req) => {
  /**
   * --- BBU1 AURA CALLBACK ORCHESTRATOR ---
   * VERSION: v1.0 OMEGA (AUTONOMOUS ALARM CLOCK)
   * JURISDICTION: Global Outbound Telephony
   * Logic: Scans crm_appointments for due callbacks and initiates voice handshake.
   */

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role for bypass RLS
  )

  try {
    // 1. FORENSIC SCAN: Find appointments due for callback NOW
    // We look for: status = 'scheduled', call_back_required = true, and start_time <= NOW
    const { data: pendingCallbacks, error: scanError } = await supabase
      .from('crm_appointments')
      .select(`
        id,
        business_id,
        subject,
        start_time,
        aura_notes,
        contact_id,
        tenants (name, official_phone)
      `)
      .eq('status', 'scheduled')
      .eq('call_back_required', true)
      .lte('start_time', new Date().toISOString())

    if (scanError) throw scanError
    if (!pendingCallbacks || pendingCallbacks.length === 0) {
      return new Response(JSON.stringify({ message: "No active signals for callback." }), { status: 200 })
    }

    const results = []

    // 2. THE HANDSHAKE LOOP: Process each callback
    for (const cb of pendingCallbacks) {
      // Fetch the actual contact phone number deeply
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('full_name, phone')
        .eq('id', cb.contact_id)
        .single()

      if (!contact || !contact.phone) continue

      console.log(`[Aura Pulse] Triggering callback for ${contact.full_name} at ${contact.phone}`)

      // 3. INITIATE VAPI VOICE HANDSHAKE
      const voiceResponse = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          phoneNumber: contact.phone,
          assistantId: AURA_RECEPTIONIST_ID,
          assistantOverrides: {
            variableValues: {
              business_name: cb.tenants?.name,
              client_name: contact.full_name,
              meeting_subject: cb.subject,
              custom_context: `You are calling back ${contact.full_name} as requested for their inquiry about ${cb.subject}. Be professional and warm.`
            }
          }
        })
      })

      const voiceData = await voiceResponse.json()

      // 4. UPDATE THE LEDGER: Mark as callback_initiated to prevent double calling
      await supabase
        .from('crm_appointments')
        .update({ status: 'completed', aura_notes: `Aura initiated outbound call. SID: ${voiceData.id}` })
        .eq('id', cb.id)

      // 5. FORENSIC LOG: Record the attempt in the call ledger
      await supabase.from('crm_call_ledger').insert({
        business_id: cb.business_id,
        direction: 'outbound',
        caller_phone: cb.tenants?.official_phone || 'System',
        receiver_phone: contact.phone,
        status: 'in-progress',
        summary: `Aura triggered automated callback for: ${cb.subject}`
      })

      results.push({ contact: contact.full_name, status: "Handshake Initiated" })
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (err) {
    console.error("[Aura Forensic Error]", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})