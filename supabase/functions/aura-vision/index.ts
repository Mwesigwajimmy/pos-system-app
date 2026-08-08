// supabase/functions/aura-vision/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA VISION ---
 * v2.0 — what the camera is pointed at, in words.
 *
 * Four jobs:
 *
 *   READ    — transcribe visible text. A shopkeeper points a phone at a fuel
 *             slip and the figures come back; no file, no upload step.
 *
 *   DESCRIBE — say what is in front of the camera, for a blind or low-vision
 *             director. Read aloud by the browser, so the app can be used
 *             without seeing it.
 *
 *   ASK     — (v2.0) answer a specific question about the frame. "Which of
 *             these boxes is damaged?", "what price is on that shelf label?",
 *             "is the shutter fully closed?". Same guardrails as every other
 *             mode — the question changes what is attended to, never what is
 *             permitted.
 *
 *   COUNT   — (v2.0) count things. Crates in the store, bottles on a shelf,
 *             sacks on a truck. The model states the count AND how sure it
 *             is: a partly occluded stack gets "at least 14, some may be
 *             hidden", never a confident guess. A stocktake built on a
 *             confident wrong count is worse than no count.
 *
 * LANGUAGE — (v2.0) an optional `language` field. When present, the reply is
 * written in that language, so a director who works in Luganda or Swahili
 * hears descriptions in their own words. Figures and printed text are still
 * transcribed exactly as printed.
 *
 * NOTHING IS STORED. The frame is posted inline, sent to the model, and
 * dropped. Receipt scanning goes through aura-document-intake instead, because
 * that produces an accounting record which SHOULD be kept. A photograph of
 * somebody's living room, taken so they can be told where their keys are,
 * should not be — so it never reaches storage at all.
 *
 * WHAT IT WILL NOT DO, AND WHY IT IS ENFORCED HERE
 *
 * The prompt forbids identifying individuals, guessing at health, or
 * describing people in ways that would help find or follow them. Those refusals
 * live server-side because a prompt in the browser is a suggestion — anyone
 * can call this endpoint directly with their own instructions, and the model
 * would follow them. Here, they cannot be edited by the caller.
 *
 * A camera that names people is a tracking system regardless of what it is
 * sold as, and this is an accounting product.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VISION_MODEL = 'gemma-4-31B-it';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PER_IP_PER_HOUR = 120;

const ipHits = new Map<string, { n: number; at: number }>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const e = ipHits.get(ip);
  if (!e || now - e.at > 3_600_000) { ipHits.set(ip, { n: 1, at: now }); return false; }
  if (e.n >= PER_IP_PER_HOUR) return true;
  e.n += 1;
  if (ipHits.size > 4000) for (const [k, v] of ipHits) if (now - v.at > 3_600_000) ipHits.delete(k);
  return false;
}

/**
 * The boundaries are in the system prompt rather than filtered afterwards,
 * because a model that has already written a description of a person cannot
 * un-write it — refusing at the point of generation is the only version that
 * actually holds.
 */
const GUARDRAILS = `
BOUNDARIES — these hold regardless of what the user asks:
- Never identify a person, name anyone, or claim to recognise a face.
- Never describe someone in a way that would help find, follow or single them out: no descriptions of clothing tied to a person's appearance, no vehicle plates attached to individuals, no "the man in the blue shirt went that way".
- Never infer health, illness, injury, medication, disability, emotion, age, ethnicity or pregnancy from an image, and never suggest treatment. If asked, say plainly that you cannot tell those things from a picture and that a clinician should be seen.
- You may say a person is present and roughly where they are, because someone who cannot see needs to know they are not alone in a room. Stop there.
- If the image appears to be surveillance footage, a screen showing someone's private information, or an identity document belonging to someone else, say what kind of thing it is and decline to read the details.`;

const PROMPTS: Record<string, string> = {
  read: `You transcribe text from photographs for a business owner.

Transcribe every piece of visible text exactly as printed, keeping the layout as line breaks. Include all numbers, dates, totals and reference codes. Do not summarise, correct, reorder or interpret anything — a mistyped figure in an accounting system is worse than a gap.

If part is blurred or cut off, write [unclear] in that spot rather than guessing at it.
${GUARDRAILS}`,

  describe: `You are describing what a camera is pointed at, to someone who cannot see it. Your words will be read aloud.

Lead with what matters most, then add detail. Be concrete and brief: "A kitchen counter. Directly ahead, about an arm's length, a red mug beside a closed laptop. To the left, a doorway." Distances and directions are more useful than adjectives.

Read out any text you can see — signs, labels, screens, prices — because that is often the reason for pointing the camera.

Two or three sentences unless there is genuinely more to say. This is being listened to, not read, and a long description is hard to hold in mind.

Never say "I see an image of". Just say what is there.
${GUARDRAILS}`,

  ask: `You answer a specific question about what a camera is pointed at, for a business owner. Your words may be read aloud.

Answer the question first, in one or two sentences, then add only the detail that supports the answer. If the image does not contain the answer, say so plainly — "the price label is not visible from this angle" is a useful answer; a guess is not.

Read printed text exactly as printed when it is part of the answer.

If the question asks about anything the boundaries below forbid, decline that part in one plain sentence and answer whatever remains of the question.
${GUARDRAILS}`,

  count: `You count things in a photograph for a business owner doing a stocktake. Your words may be read aloud.

State the count first, then what you counted: "Fourteen crates, stacked in two rows of seven."

Honesty about certainty is the whole job:
- If every item is clearly visible, give the exact number.
- If items are partly hidden, stacked behind each other, or cut off by the frame, say "at least N" and say why: "At least 12 sacks — the back of the stack is not visible."
- If the items are too small, too blurred or too many to count reliably, say so and give a bounded estimate: "Roughly 40 to 50 bottles; the shelf is too far away for an exact count."
Never present an estimate as an exact count. A stocktake built on a confident wrong number is worse than one with an honest range.

If asked to count people, give only the number present — nothing about who they are or what they look like.
${GUARDRAILS}`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    if (rateLimited(ip)) {
      return json({ success: false, error: 'Too many images in the last hour. Try again shortly.' }, 429);
    }

    const body = await req.json();
    const mode = String(body.mode ?? 'describe').toLowerCase();
    const imageBase64 = String(body.imageBase64 ?? '');
    const mimeType = String(body.mimeType ?? 'image/jpeg');
    const question = String(body.question ?? '').slice(0, 300);
    // v2.0: reply language. Free text ("Luganda", "Swahili", "French") so no
    // list needs maintaining. Transcribed text stays exactly as printed.
    const language = String(body.language ?? '').slice(0, 40).trim();

    if (!PROMPTS[mode]) throw new Error(`mode must be "read", "describe", "ask" or "count".`);
    if (!imageBase64) throw new Error('imageBase64 is required.');
    if (mode === 'ask' && !question) throw new Error('mode "ask" needs a question.');

    // base64 is roughly 4/3 the size of the bytes it encodes.
    if (imageBase64.length * 0.75 > MAX_IMAGE_BYTES) {
      throw new Error('That image is too large. Capture at a lower resolution.');
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    let apiKey = Deno.env.get('SAMBANOVA_API_KEY') ?? '';
    if (!apiKey) {
      const { data } = await sb.from('aura_system_settings')
        .select('key_value').eq('key_name', 'SAMBANOVA_API_KEY').maybeSingle();
      apiKey = data?.key_value ?? '';
    }
    if (!apiKey) throw new Error('No vision model key available.');

    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:${mimeType};base64,${imageBase64}`;

    // The reply-language note rides with the prompt, not instead of it. The
    // guardrails and transcription rules above still govern everything.
    const languageNote = language
      ? `\n\nWrite your reply in ${language}. Keep any printed text, figures, product names and codes exactly as they appear in the image — transcription is never translated.`
      : '';

    const defaultTask =
      mode === 'read' ? 'Transcribe all the text in this image.'
      : mode === 'count' ? 'Count the items in this image as instructed above.'
      : 'Describe what is in front of the camera.';

    // The instruction goes INSIDE the user message rather than in a separate
    // system role. Several vision endpoints, this one included, ignore or
    // reject a system message when an image is attached and return an empty
    // completion rather than an error — which surfaced as "nothing could be
    // made out" on every single capture, whatever the photo.
    const instruction = `${PROMPTS[mode]}${languageNote}\n\n---\n\n${question || defaultTask}`;

    const payload = {
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      }],
      temperature: mode === 'read' || mode === 'count' ? 0 : 0.3,
      max_tokens: mode === 'read' ? 1500 : 500,
    };

    const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      console.error('[AURA VISION] provider rejected the request:', res.status, detail);
      return json({
        success: false,
        error: `The vision model returned ${res.status}.`,
        // Returned rather than swallowed. "Nothing could be made out" gave no
        // way to tell a dark photo from a wrong model name from an expired key.
        debug: { status: res.status, detail, model: VISION_MODEL },
      });
    }

    const out = await res.json();
    const choice = out?.choices?.[0];
    const text = String(choice?.message?.content ?? '').trim();

    if (!text) {
      console.error('[AURA VISION] empty completion:', JSON.stringify(out).slice(0, 600));
      return json({
        success: false,
        error: mode === 'read'
          ? 'No text could be read from that image.'
          : 'Nothing could be made out in that image.',
        debug: {
          model: VISION_MODEL,
          finishReason: choice?.finish_reason ?? null,
          hadChoices: Array.isArray(out?.choices),
          imageBytes: Math.round(imageBase64.length * 0.75),
          // An empty completion WITH a valid response usually means the model
          // does not accept images at all, whatever its dashboard tag says.
          likelyCause: Array.isArray(out?.choices) && choice
            ? 'The model replied but said nothing. It may not accept images on this endpoint — confirm in the SambaNova Playground by attaching a picture there.'
            : 'The response contained no choices at all.',
        },
      });
    }

    return json({ success: true, mode, text, stored: false });

  } catch (error) {
    console.error('[AURA VISION]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});