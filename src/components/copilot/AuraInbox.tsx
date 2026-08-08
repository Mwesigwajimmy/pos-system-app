'use client';

/**
 * --- INBOX ---
 * Customer messages, and the replies Aura has drafted for them.
 *
 * THE DESIGN DECISION THAT MATTERS
 *
 * The draft is editable, and what gets sent is whatever is in the box when
 * Send is pressed — not what the model wrote. That is deliberate. An
 * uneditable draft trains people to either accept it blindly or ignore the
 * feature; an editable one gets read, corrected, and improved.
 *
 * Nothing sends on its own. These messages go to customers under the
 * business's own name, from its own number.
 *
 * ✅ v1.2:
 * - The relay address is finally SHOWN. It was always generated on the
 *   server, but the UI threw it away — which is exactly why a newly
 *   connected business never received anything: nobody told them where to
 *   forward their mail. Each email channel now shows its relay address with
 *   a copy button and the three forwarding steps, including the fact that
 *   Gmail's confirmation email will arrive HERE, in this inbox.
 * - New email. Compose from scratch, to one address or a pasted list of up
 *   to 500, with Aura writing the first draft from a plain instruction.
 *   Sending still requires a person to press Send.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  MessageSquare, Mail, Send, Loader2, RefreshCw, Check, X,
  AlertTriangle, Inbox as InboxIcon, Plug, Clock, PenLine, Copy, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const supabase = createClient();

const INBOX_ENDPOINT =
  'https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-inbox';

interface Message {
  id: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'web';
  direction: 'inbound' | 'outbound';
  counterparty: string;
  counterparty_name: string | null;
  subject: string | null;
  body: string;
  draft_reply: string | null;
  status: 'new' | 'drafted' | 'approved' | 'sent' | 'failed' | 'ignored';
  send_error: string | null;
  created_at: string;
  sent_at: string | null;
}

interface Channel {
  id: string;
  channel: string;
  identifier: string;
  auto_send: boolean;
  relay_address: string | null;
}

async function callInbox(payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(INBOX_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const out = await res.json();
  if (!out?.success && out?.error) throw new Error(out.error);
  return out;
}

const when = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return new Date(iso).toLocaleDateString();
};

const countRecipients = (raw: string) => {
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\n]/)) {
    const addr = part.trim().toLowerCase();
    if (addr && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) seen.add(addr);
  }
  return seen.size;
};

export function AuraInbox({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<'waiting' | 'all'>('waiting');
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [showConnect, setShowConnect] = React.useState(false);
  const [showCompose, setShowCompose] = React.useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['aura_inbox', businessId, filter],
    queryFn: async () => {
      const out = await callInbox({ action: 'list', businessId, limit: 100 });
      return out.messages as Message[];
    },
    enabled: !!businessId,
    // Messages arrive by webhook, so the screen has to go and look. Thirty
    // seconds is frequent enough to feel live without hammering the function.
    refetchInterval: 30000,
  });

  const { data: channels } = useQuery({
    queryKey: ['aura_channels', businessId],
    queryFn: async () => (await callInbox({ action: 'channels', businessId })).channels as Channel[],
    enabled: !!businessId,
  });

  const redraft = useMutation({
    mutationFn: (messageId: string) => callInbox({ action: 'draft', messageId }),
    onSuccess: (out: any) => {
      setEdits((e) => ({ ...e, [out.messageId]: out.draft }));
      queryClient.invalidateQueries({ queryKey: ['aura_inbox', businessId] });
      toast.success('Rewritten');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      callInbox({ action: 'approve_send', messageId: id, text, confirm: true }),
    onSuccess: (out: any) => {
      if (out.sent) {
        toast.success('Sent');
        queryClient.invalidateQueries({ queryKey: ['aura_inbox', businessId] });
      } else {
        toast.error(out.error ?? 'It could not be sent.');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const messages = (data ?? []).filter((m) => {
    if (m.direction === 'outbound') return false;   // replies show inside their message
    if (filter === 'all') return true;
    return m.status === 'new' || m.status === 'drafted' || m.status === 'failed';
  });

  const waiting = (data ?? []).filter(
    (m) => m.direction === 'inbound' && (m.status === 'new' || m.status === 'drafted'),
  ).length;

  // A count alone can't tell you the longest-ignored customer has been
  // waiting three days instead of three minutes.
  const oldestWaiting = (data ?? [])
    .filter((m) => m.direction === 'inbound' && (m.status === 'new' || m.status === 'drafted'))
    .reduce((oldest: Message | null, m) => {
      if (!oldest) return m;
      return new Date(m.created_at) < new Date(oldest.created_at) ? m : oldest;
    }, null as Message | null);

  const hasChannels = (channels ?? []).length > 0;
  const hasEmailChannel = (channels ?? []).some((c) => c.channel === 'email');

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
            <InboxIcon className="h-4 w-4 text-slate-400" />
            Inbox
          </CardTitle>
          <p className="mt-1 text-[13px] text-slate-500">
            Messages from customers, with a reply drafted for each. Nothing sends until you send it.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {!isLoading && !isError && (
              <Badge
                variant="secondary"
                className={cn('border-none px-3 py-1 text-[12px] font-semibold',
                  waiting > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}
              >
                {waiting === 0 ? 'All handled' : `${waiting} waiting`}
              </Badge>
            )}
            <Button variant="ghost" onClick={() => refetch()} disabled={isFetching}
              className="h-9 w-9 rounded-lg p-0 text-slate-500 hover:text-slate-900">
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
            {hasEmailChannel && (
              <Button variant="ghost" onClick={() => { setShowCompose((v) => !v); setShowConnect(false); }}
                className="h-9 gap-1.5 rounded-lg px-3 text-[13px] font-medium text-slate-600 hover:text-slate-900">
                <PenLine className="h-3.5 w-3.5" /> New email
              </Button>
            )}
            <Button variant="ghost" onClick={() => { setShowConnect((v) => !v); setShowCompose(false); }}
              className="h-9 gap-1.5 rounded-lg px-3 text-[13px] font-medium text-slate-600 hover:text-slate-900">
              <Plug className="h-3.5 w-3.5" /> Channels
            </Button>
          </div>

          {!isLoading && !isError && oldestWaiting && (
            <p className="flex items-center gap-1 text-[11px] font-medium text-amber-700">
              <Clock className="h-3 w-3" /> Oldest waiting: {when(oldestWaiting.created_at)}
            </p>
          )}
        </div>
      </CardHeader>

      {showCompose && (
        <ComposeEmail
          businessId={businessId}
          onSent={() => {
            setShowCompose(false);
            queryClient.invalidateQueries({ queryKey: ['aura_inbox', businessId] });
          }}
        />
      )}

      {showConnect && <ConnectChannels businessId={businessId} channels={channels ?? []} />}

      {!hasChannels && !showConnect && (
        <div className="border-b border-slate-100 bg-amber-50/60 px-6 py-3">
          <p className="text-[13px] text-amber-800">
            No email address or WhatsApp number is connected yet, so nothing can arrive here.
            Open Channels to connect one.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3">
        {(['waiting', 'all'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
              filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            {f === 'waiting' ? 'Needs a reply' : 'Everything'}
          </button>
        ))}
      </div>

      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-[13px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading messages
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-3 px-6 py-10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-[14px] font-medium text-slate-900">Messages could not be loaded</p>
              <p className="mt-1 text-[13px] text-slate-500">{(error as Error)?.message}</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && messages.length === 0 && (
          <div className="px-6 py-14 text-center">
            <Check className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-3 text-[14px] font-medium text-slate-900">
              {filter === 'waiting' ? 'Nothing waiting' : 'No messages yet'}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
              {filter === 'waiting'
                ? 'Every message has been replied to.'
                : 'Messages from customers will appear here once a channel is connected.'}
            </p>
          </div>
        )}

        {!isLoading && messages.map((m) => {
          const text = edits[m.id] ?? m.draft_reply ?? '';
          const busy = send.isPending && send.variables?.id === m.id;
          const drafting = redraft.isPending && redraft.variables === m.id;

          return (
            <div key={m.id} className="border-b border-slate-100 px-6 py-5 last:border-b-0">
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  m.channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
                  {m.channel === 'whatsapp' ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[14px] font-semibold text-slate-900">
                      {m.counterparty_name || m.counterparty}
                    </span>
                    <span className="text-[12px] text-slate-400">{m.counterparty}</span>
                    <span className="text-[12px] text-slate-400">· {when(m.created_at)}</span>
                    {m.status === 'sent' && (
                      <span className="text-[12px] font-medium text-emerald-600">· replied</span>
                    )}
                  </div>

                  {m.subject && (
                    <p className="mt-0.5 text-[13px] font-medium text-slate-700">{m.subject}</p>
                  )}

                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">
                    {m.body}
                  </p>

                  {m.send_error && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">
                      Could not send: {m.send_error}
                    </p>
                  )}

                  {m.status !== 'sent' && (
                    <div className="mt-4">
                      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Reply
                        {!m.draft_reply && <span className="normal-case tracking-normal text-slate-400">— not drafted yet</span>}
                      </label>

                      <textarea
                        value={text}
                        onChange={(e) => setEdits((s) => ({ ...s, [m.id]: e.target.value }))}
                        rows={m.channel === 'whatsapp' ? 3 : 5}
                        placeholder="Write the reply, or press Draft to have one written."
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                      />

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          onClick={() => send.mutate({ id: m.id, text })}
                          disabled={!text.trim() || busy}
                          className="h-9 gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Send
                        </Button>

                        <Button
                          variant="ghost"
                          onClick={() => redraft.mutate(m.id)}
                          disabled={drafting}
                          className="h-9 gap-1.5 rounded-lg px-3 text-[13px] font-medium text-slate-600 hover:text-slate-900"
                        >
                          {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          {m.draft_reply ? 'Rewrite' : 'Draft'}
                        </Button>

                        {/* The edited text is what sends. Worth saying once,
                            because people reasonably assume otherwise. */}
                        {edits[m.id] !== undefined && edits[m.id] !== m.draft_reply && (
                          <span className="text-[11px] text-slate-400">Your edit will be sent</span>
                        )}
                      </div>
                    </div>
                  )}

                  {m.status === 'sent' && m.draft_reply && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <Clock className="h-3 w-3" /> Sent {m.sent_at ? when(m.sent_at) : ''}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                        {m.draft_reply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * ✅ v1.2: writing a new email — to one address or a pasted list. Aura can
 * write the first version from a plain instruction; the person edits and
 * presses Send. The recipient count sits on the button itself so sending to
 * 200 people never happens by surprise.
 */
function ComposeEmail({ businessId, onSent }: { businessId: string; onSent: () => void }) {
  const [to, setTo] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [instruction, setInstruction] = React.useState('');

  const recipientCount = countRecipients(to);

  const draft = useMutation({
    mutationFn: () => callInbox({ action: 'compose_draft', businessId, instruction: instruction.trim() }),
    onSuccess: (out: any) => {
      if (out.subject && !subject.trim()) setSubject(out.subject);
      else if (out.subject) setSubject(out.subject);
      setBody(out.body);
      toast.success('Drafted — read it before sending');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendAll = useMutation({
    mutationFn: () => callInbox({
      action: 'compose',
      businessId,
      to,
      subject: subject.trim(),
      body: body.trim(),
      confirm: true,
    }),
    onSuccess: (out: any) => {
      if (out.sent > 0 && out.failed === 0) {
        toast.success(out.sent === 1 ? 'Sent' : `Sent to ${out.sent} recipients`);
        onSent();
      } else if (out.sent > 0) {
        toast.warning(`Sent to ${out.sent}, but ${out.failed} failed. The failures are recorded in Everything.`);
        onSent();
      } else {
        toast.error(out.failures?.[0]?.error ?? 'Nothing could be sent.');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 border-b border-slate-100 bg-slate-50/60 px-6 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">New email</p>

      <div className="space-y-2">
        <textarea
          value={to}
          onChange={(e) => setTo(e.target.value)}
          rows={2}
          placeholder="To — one address, or paste a list separated by commas or new lines (up to 500)"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
        />

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-400"
        />

        <div className="flex gap-2">
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Tell Aura what this email should say, e.g. we are closed on Monday for stocktaking"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && instruction.trim() && !draft.isPending) draft.mutate();
            }}
          />
          <Button
            variant="ghost"
            onClick={() => draft.mutate()}
            disabled={!instruction.trim() || draft.isPending}
            className="h-11 shrink-0 gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:text-slate-900"
          >
            {draft.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Write it
          </Button>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          placeholder="The email itself. Write it here, or have Aura write the first version above."
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => sendAll.mutate()}
            disabled={recipientCount === 0 || !subject.trim() || !body.trim() || sendAll.isPending}
            className="h-9 gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {sendAll.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {recipientCount <= 1 ? 'Send' : `Send to ${recipientCount} recipients`}
          </Button>

          {recipientCount > 1 && (
            <span className="text-[11px] text-slate-500">
              Every recipient gets their own copy — nobody sees the list.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Connecting a number or an address. Credentials go straight to the function.
 *
 * ✅ v1.2: the relay address is shown for every email channel, with the
 * forwarding steps. This is the single piece of information receiving
 * depends on, and it used to be invisible.
 */
function ConnectChannels({ businessId, channels }: { businessId: string; channels: Channel[] }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = React.useState<'email' | 'whatsapp'>('email');
  const [identifier, setIdentifier] = React.useState('');
  const [phoneNumberId, setPhoneNumberId] = React.useState('');
  const [accessToken, setAccessToken] = React.useState('');
  const [resendKey, setResendKey] = React.useState('');

  const copyRelay = (relay: string) => {
    navigator.clipboard.writeText(relay)
      .then(() => toast.success('Copied'))
      .catch(() => toast.error('Could not copy — select it and copy manually.'));
  };

  const connect = useMutation({
    mutationFn: () => callInbox({
      action: 'channels',
      businessId,
      connect: {
        channel: kind,
        identifier: identifier.trim(),
        credentials: kind === 'whatsapp'
          ? { phone_number_id: phoneNumberId.trim(), access_token: accessToken.trim() }
          : (resendKey.trim() ? { resend_api_key: resendKey.trim() } : {}),
        autoDraft: true,
        autoSend: false,
      },
    }),
    onSuccess: (out: any) => {
      const relay = out?.channel?.relay_address;
      toast.success(relay
        ? 'Connected — now set up forwarding to the address shown below'
        : 'Connected');
      setIdentifier(''); setPhoneNumberId(''); setAccessToken(''); setResendKey('');
      queryClient.invalidateQueries({ queryKey: ['aura_channels', businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 border-b border-slate-100 bg-slate-50/60 px-6 py-5">
      {channels.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Connected</p>
          {channels.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[13px] text-slate-800">
                  {c.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · {c.identifier}
                </span>
                <span className="text-[11px] text-slate-500">
                  {c.auto_send ? 'replies automatically' : 'drafts only'}
                </span>
              </div>

              {c.channel === 'email' && c.relay_address && (
                <div className="border-t border-slate-100 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Your forwarding address
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-slate-100 px-2 py-1.5 text-[12px] font-medium text-slate-800">
                      {c.relay_address}
                    </code>
                    <Button variant="ghost" onClick={() => copyRelay(c.relay_address!)}
                      className="h-8 w-8 shrink-0 rounded-lg p-0 text-slate-500 hover:text-slate-900">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-slate-600">
                    <li>In Gmail or Outlook, open the forwarding settings for {c.identifier}.</li>
                    <li>Add this address as the forwarding destination.</li>
                    <li>
                      Gmail sends a confirmation email — it will arrive here in this inbox
                      as a message from Google. Open it and use the code or link inside.
                    </li>
                  </ol>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Until forwarding is set up, no messages can arrive on this channel.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Connect</p>

        <div className="mb-3 flex gap-2">
          {(['email', 'whatsapp'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
                kind === k ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600')}>
              {k === 'email' ? 'Email' : 'WhatsApp'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={kind === 'email' ? 'The address customers write to, e.g. info@yourbusiness.com' : '+256700000000'}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-400"
          />

          {kind === 'whatsapp' ? (
            <>
              <input
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="Phone number ID (from Meta)"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Access token (from Meta)"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
              <p className="text-[11px] leading-relaxed text-slate-500">
                This number must be registered to the WhatsApp Cloud API. A number already in use
                on the WhatsApp app cannot be connected.
              </p>
            </>
          ) : (
            <>
              <input
                type="password"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                placeholder="Resend API key (optional — uses the shared key if blank)"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
              <p className="text-[11px] leading-relaxed text-slate-500">
                After connecting, you will be given a forwarding address. Set your email to
                forward there and messages will start arriving in this inbox.
              </p>
            </>
          )}

          <Button
            onClick={() => connect.mutate()}
            disabled={!identifier.trim() || connect.isPending}
            className="h-9 gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {connect.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
            Connect
          </Button>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Replies are drafted but never sent automatically. Automatic sending can be switched on
            later, once you have read a few weeks of drafts.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuraInbox;