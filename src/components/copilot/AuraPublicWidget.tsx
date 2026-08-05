'use client';

/**
 * --- AURA PUBLIC WIDGET ---
 * The floating Aura bubble on the marketing site. Mounted from the website
 * layout, so it appears on every public page.
 *
 * Deliberately standalone. It does NOT use useCopilot() or the AI SDK, because
 * CopilotContext requires a Supabase session and a businessId — neither of
 * which a logged-out visitor has. Wiring the marketing site into that provider
 * would mean the public pages carry the authenticated chat plumbing around for
 * no reason, and it blurs the line this widget exists to keep sharp: this chat
 * has no identity and no data.
 *
 * It reuses AuraAvatar so the face matches the one customers see inside the
 * product, and it parses the same SSE format the edge functions emit.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Loader2, MessageCircle } from 'lucide-react';
import { AuraAvatar } from '@/components/copilot/AuraAvatar';

const PUBLIC_ENDPOINT =
  'https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-public-concierge';

const OPENERS = [
  'What is BBU1?',
  'Which businesses is it built for?',
  'How do I get started?',
];

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AuraPublicWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  const send = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;

    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: clean };
    const replyId = crypto.randomUUID();

    setMessages((prev) => [...prev, userMsg, { id: replyId, role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(PUBLIC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('no stream');

      const decoder = new TextDecoder();
      // Carry an incomplete trailing line across reads — a single SSE event can
      // straddle two network chunks, and parsing half of one silently drops
      // that fragment of text mid-sentence.
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
          try {
            const frame = JSON.parse(trimmed.slice(6));
            if (frame.type === 'text-delta' && frame.delta) {
              setMessages((prev) => prev.map((m) =>
                m.id === replyId ? { ...m, content: m.content + frame.delta } : m));
            }
            if (frame.type === 'error' && frame.errorText) {
              setMessages((prev) => prev.map((m) =>
                m.id === replyId ? { ...m, content: frame.errorText } : m));
            }
          } catch (e) { /* incomplete frame, next read completes it */ }
        }
      }
    } catch (e) {
      setMessages((prev) => prev.map((m) =>
        m.id === replyId
          ? { ...m, content: "I couldn't reach my service just then. Please try again, or use the contact page." }
          : m));
    } finally {
      setBusy(false);
    }
  }, [messages, busy]);

  if (!mounted) return null;

  return (
    <>
      {/* LAUNCHER */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Aura"
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-full bg-blue-600 py-2.5 pl-2.5 pr-5 text-white shadow-xl shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-2xl active:scale-95"
        >
          <AuraAvatar agent="aura" className="h-9 w-9" interactive={false} />
          <span className="text-[13px] font-semibold">Ask Aura</span>
        </button>
      )}

      {/* PANEL */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex h-[85vh] flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:w-[400px] sm:rounded-3xl">

          {/* header */}
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4">
            <AuraAvatar
              agent="aura"
              state={busy ? 'thinking' : 'idle'}
              status="online"
              className="h-11 w-11"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[14px] font-bold leading-tight text-slate-900">Aura</h2>
              <p className="truncate text-[11px] leading-tight text-slate-400">
                {busy ? 'Typing...' : 'Ask about BBU1'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X size={18} />
            </button>
          </header>

          {/* thread */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4">
            {messages.length === 0 && (
              <div className="py-8 text-center">
                <AuraAvatar agent="aura" className="mx-auto h-20 w-20" />
                <h3 className="mt-4 text-[15px] font-bold text-slate-900">Hello.</h3>
                <p className="mx-auto mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
                  I can explain what BBU1 does, who it suits, and how to get started.
                </p>
                <div className="mx-auto mt-6 flex max-w-[280px] flex-col gap-2">
                  {OPENERS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-[13px] font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 hover:text-slate-900"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex items-end gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <AuraAvatar agent="aura" className="h-8 w-8" interactive={false} />
                )}
                <div
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'rounded-br-md bg-slate-900 text-white'
                      : 'rounded-bl-md border border-slate-100 bg-white text-slate-800'
                  }`}
                >
                  {m.content || (
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div ref={endRef} />
          </div>

          {/* composer */}
          <footer className="shrink-0 border-t border-slate-100 bg-white p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/60 p-1.5 pl-4 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about BBU1..."
                maxLength={1500}
                disabled={busy}
                className="h-9 min-w-0 flex-1 border-none bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
                  !busy && input.trim()
                    ? 'bg-slate-900 text-white shadow-md hover:bg-black'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
            <p className="mt-2 px-2 text-center text-[10px] text-slate-400">
              Aura has no access to any customer account or data from this page.
            </p>
          </footer>
        </div>
      )}
    </>
  );
}