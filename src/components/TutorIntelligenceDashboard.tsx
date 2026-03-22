// ============================================================================
// TutorIntelligenceDashboard.tsx
// React Server Component — fetches AI diagnostic data from `smarty_diagnostics`
// and renders a high-density intelligence brief for the human tutor.
//
// This component runs ENTIRELY on the server. No client-side JS is shipped.
// The Supabase query uses the service-role key to bypass RLS.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

// ── Fail-fast environment validation ──
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

// Server-only Supabase client — service role bypasses Row Level Security
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── TypeScript Interfaces ──

interface TutorIntelligenceDashboardProps {
  studentId: string;
}

interface SmartyDiagnosticRow {
  id: string;
  student_id: string;
  subject: string;
  confidence_score: number;
  concept_weaknesses: string[];
  behavioral_flags: string[];
  ai_summary: string;
  created_at: string;
}

// ── Helper functions ──

function getConfidenceColour(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function getConfidenceLabel(score: number): string {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MODERATE";
  return "LOW";
}

// ============================================================================
// COMPONENT
// ============================================================================

export default async function TutorIntelligenceDashboard({
  studentId,
}: TutorIntelligenceDashboardProps) {
  const { data, error } = await supabase
    .from("smarty_diagnostics")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // PGRST116 = "No rows found" — expected for new students
  if (error && error.code !== "PGRST116") {
    console.error("Smarty diagnostics fetch error:", error.message);
  }

  // ── Fallback UI ──
  if (!data) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-800 text-slate-400 text-xs font-mono uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          No Data Available
        </div>
        <p className="text-slate-500 text-sm">
          No Smarty AI diagnostics available for this student yet.
        </p>
      </div>
    );
  }

  // ── Type-safe data extraction ──
  const diagnostic = data as unknown as SmartyDiagnosticRow;

  const weaknesses: string[] = Array.isArray(diagnostic.concept_weaknesses)
    ? diagnostic.concept_weaknesses
    : [];

  const flags: string[] = Array.isArray(diagnostic.behavioral_flags)
    ? diagnostic.behavioral_flags
    : [];

  const score = diagnostic.confidence_score ?? 0;
  const scoreColour = getConfidenceColour(score);
  const scoreLabel = getConfidenceLabel(score);

  return (
    <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/20">
      {/* ── Dashboard Header ── */}
      <div className="bg-slate-900 border-b border-indigo-500/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Smarty AI Intelligence Brief
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Classification: Tutor Eyes Only
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-600">
            Generated
          </p>
          <p className="text-xs font-mono text-slate-400">
            {new Date(diagnostic.created_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Top Metrics Row ── */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        <div className="px-6 py-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600 mb-1">
            Subject Domain
          </p>
          <p className="text-lg font-bold text-white">
            {diagnostic.subject}
          </p>
        </div>

        <div className="px-6 py-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600 mb-1">
            AI Diagnostic Confidence
          </p>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black tabular-nums ${scoreColour}`}>
              {score}%
            </span>
            <span
              className={`text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                score >= 75
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : score >= 50
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {scoreLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Indicators Row ── */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 border-t border-slate-800">
        {/* Concept Weaknesses */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-rose-400">
              Concept Weaknesses ({weaknesses.length})
            </p>
          </div>

          {weaknesses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {weaknesses.map((weakness, index) => (
                <span
                  key={`weakness-${index}`}
                  className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-300 text-xs font-mono px-3 py-1.5 rounded-lg border border-rose-500/20"
                >
                  <svg className="w-3 h-3 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                  </svg>
                  {weakness}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-600 font-mono italic">
              No concept weaknesses detected.
            </p>
          )}
        </div>

        {/* Behavioral Flags */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400">
              Behavioral Flags ({flags.length})
            </p>
          </div>

          {flags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {flags.map((flag, index) => (
                <span
                  key={`flag-${index}`}
                  className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 text-xs font-mono px-3 py-1.5 rounded-lg border border-amber-500/20"
                >
                  <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                  </svg>
                  {flag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-600 font-mono italic">
              No behavioral flags detected.
            </p>
          )}
        </div>
      </div>

      {/* ── AI Tactical Summary ── */}
      <div className="border-t border-slate-800 px-6 py-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-indigo-500/10 p-1 rounded border border-indigo-500/20">
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400">
            AI Tactical Summary
          </p>
        </div>

        <div className="bg-slate-900/50 border-l-2 border-indigo-500/40 rounded-r-lg px-4 py-3">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {diagnostic.ai_summary}
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
          Smarty AI Diagnostic Engine v2.0
        </p>
        <p className="text-[10px] font-mono text-slate-600">
          Student ID: {studentId.slice(0, 8)}…
        </p>
      </div>
    </div>
  );
}
