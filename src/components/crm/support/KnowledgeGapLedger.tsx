'use client';

/**
 * --- UNANSWERED QUESTIONS ---
 *
 * Questions customers asked that Aura could not answer, and the place to
 * answer them so she can next time.
 *
 * WHAT CHANGED FROM THE PREVIOUS VERSION
 *
 *   The button worked. "Inject Answer" rendered and did nothing — no handler,
 *   no dialog, no write. The one action on the screen was decoration.
 *
 *   The count stopped lying. `gaps?.filter(...).length` renders "undefined
 *   Critical Gaps" for as long as the query is loading, which is the first
 *   thing anyone sees.
 *
 *   Loading, empty and error states exist. Previously a failed query and a
 *   business with nothing outstanding looked identical: a blank card.
 *
 *   The language is plain. This screen is read by people who run businesses,
 *   not by an audience — "Neural Blind Spots" and "Critical Gaps" tell them
 *   nothing, and an accountant reading marketing copy in a working tool
 *   trusts the tool less, not more.
 *
 * ONE THING TO CONFIRM: the column an answer is saved to. ANSWER_COLUMN below
 * is set to 'answer'. If your table calls it something else the save will fail
 * with a clear message naming the column rather than failing silently.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  HelpCircle, CheckCircle2, Loader2, AlertTriangle, Search, X, Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const supabase = createClient();

// Change if your column is named differently.
const ANSWER_COLUMN = 'answer';

interface Gap {
  id: string;
  raw_question: string;
  context_at_time?: string | null;
  is_resolved?: boolean | null;
  created_at: string;
  [key: string]: any;
}

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  if (mins < 10080) return `${Math.round(mins / 1440)} days ago`;
  return d.toLocaleDateString();
};

export function KnowledgeGapLedger({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const [answering, setAnswering] = React.useState<string | null>(null);
  const [answer, setAnswer] = React.useState('');
  const [showResolved, setShowResolved] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const { data: gaps, isLoading, isError, error } = useQuery<Gap[]>({
    queryKey: ['aura_knowledge_gaps', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aura_knowledge_gaps')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!businessId,
  });

  const save = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from('aura_knowledge_gaps')
        .update({ [ANSWER_COLUMN]: text, is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        // Naming the column turns a dead end into a one-line fix.
        throw new Error(
          /column .* does not exist/i.test(error.message)
            ? `${error.message} — set ANSWER_COLUMN in this file to the column your table uses.`
            : error.message,
        );
      }
    },
    onSuccess: () => {
      toast.success('Answer saved. Aura will use it from now on.');
      setAnswering(null);
      setAnswer('');
      queryClient.invalidateQueries({ queryKey: ['aura_knowledge_gaps', businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = gaps ?? [];
  const filtered = all.filter((g) => {
    if (!showResolved && g.is_resolved) return false;
    if (!search.trim()) return true;
    return String(g.raw_question ?? '').toLowerCase().includes(search.toLowerCase());
  });

  const openCount = all.filter((g) => !g.is_resolved).length;

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
            <HelpCircle className="h-4 w-4 text-slate-400" />
            Unanswered questions
          </CardTitle>
          <p className="mt-1 text-[13px] text-slate-500">
            Questions customers asked that Aura could not answer. Answer one and she will use it next time.
          </p>
        </div>

        {/* Rendered only once the data is in — otherwise this reads
            "undefined questions" for the first second on screen. */}
        {!isLoading && !isError && (
          <Badge
            variant="secondary"
            className={
              openCount > 0
                ? 'shrink-0 border-none bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-700'
                : 'shrink-0 border-none bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700'
            }
          >
            {openCount === 0 ? 'All answered' : `${openCount} waiting`}
          </Badge>
        )}
      </CardHeader>

      {all.length > 3 && (
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="accent-slate-900"
            />
            Show answered
          </label>
        </div>
      )}

      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-[13px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading questions
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-3 px-6 py-10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-[14px] font-medium text-slate-900">These questions could not be loaded</p>
              <p className="mt-1 text-[13px] text-slate-500">{(error as Error)?.message}</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="px-6 py-14 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-3 text-[14px] font-medium text-slate-900">
              {all.length === 0 ? 'Nothing outstanding' : 'No questions match'}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
              {all.length === 0
                ? 'When a customer asks Aura something she cannot answer from your records, it will appear here.'
                : 'Try a different search, or show answered questions.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && filtered.map((gap) => {
          const isOpen = answering === gap.id;
          return (
            <div
              key={gap.id}
              className={`border-b border-slate-100 px-6 py-5 last:border-b-0 ${gap.is_resolved ? 'bg-slate-50/60' : ''}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-relaxed text-slate-900">
                    {gap.raw_question}
                  </p>
                  <p className="mt-1.5 text-[12px] text-slate-500">
                    {when(gap.created_at)}
                    {gap.context_at_time ? ` · asked on ${gap.context_at_time}` : ''}
                    {gap.is_resolved ? ' · answered' : ''}
                  </p>
                  {gap.is_resolved && gap[ANSWER_COLUMN] && (
                    <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-600">
                      {gap[ANSWER_COLUMN]}
                    </p>
                  )}
                </div>

                {!gap.is_resolved && !isOpen && (
                  <Button
                    onClick={() => { setAnswering(gap.id); setAnswer(''); }}
                    className="h-9 shrink-0 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800"
                  >
                    Answer
                  </Button>
                )}
              </div>

              {isOpen && (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="Write the answer as you would say it to the customer. Aura will use this wording."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => save.mutate({ id: gap.id, text: answer.trim() })}
                      disabled={!answer.trim() || save.isPending}
                      className="h-9 gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Save answer
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setAnswering(null); setAnswer(''); }}
                      className="h-9 gap-1.5 rounded-lg px-3 text-[13px] font-medium text-slate-500 hover:text-slate-900"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default KnowledgeGapLedger;