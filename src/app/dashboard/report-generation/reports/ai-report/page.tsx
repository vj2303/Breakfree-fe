"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_V1_BASE_URL } from "@/lib/apiConfig";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface CompetencyProfile {
  competency_name: string;
  strengths: string;
  development: string;
}
interface ProfilesData {
  overall_intro: string;
  overall_strengths: Array<{ title: string; body: string }>;
  overall_development_areas: Array<{ title: string; body: string }>;
  competency_profiles: CompetencyProfile[];
}
interface InsightsData {
  archetype: {
    name: string;
    description: string;
    core_strengths: string[];
    watchouts: string[];
    deployment_best: string;
    deployment_caution: string;
  };
  cross_competency_patterns: Array<{ title: string; description: string; risk: string; opportunity: string }>;
  predictive_indicators: Array<{ indicator: string; type: "RISK" | "OPPORTUNITY"; timeframe: string; likelihood: number; mitigation: string }>;
  role_fit: { title: string; current_fit: number; potential_fit: number; timeline: string; narrative: string; critical_gaps: string[] };
}
interface RecEntry {
  competency_name: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  intro: string;
  on_the_job: string[];
  coaching: string[];
  formal_learning: string[];
}
interface RecsData {
  recommendations: RecEntry[];
  next_steps: string[];
}
interface ParticipantInfo {
  name: string;
  designation?: string;
  department?: string;
  division?: string;
  managerName?: string;
  location?: string;
  batchNo?: string;
}
interface ACInfo {
  name: string;
  displayName?: string;
}
interface ScoringEntry {
  [sub: string]: { score: number; anchor?: string; evidence?: string };
}
interface InputData {
  participant: Record<string, string | undefined>;
  programme: { name: string; activities: string[] };
  scoring: Record<string, ScoringEntry>;
}
interface AIReportData {
  participant: ParticipantInfo;
  assessmentCenter: ACInfo;
  input: InputData;
  report: { profiles: ProfilesData; insights: InsightsData; recommendations: RecsData };
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function ratingLabel(s: number) {
  if (s >= 4.5) return "Outstanding";
  if (s >= 3.5) return "Strong";
  if (s >= 2.5) return "Proficient";
  if (s >= 1.5) return "Developing";
  return "Needs Focus";
}
function ratingColor(s: number) {
  if (s >= 3.5) return "#2A9D8F";
  if (s >= 2.5) return "#2A9D8F";
  if (s >= 1.5) return "#E9A23B";
  return "#C44E52";
}
function ratingBg(s: number) {
  if (s >= 2.5) return "#2A9D8F";
  if (s >= 1.5) return "#E9A23B";
  return "#C44E52";
}
function barPct(s: number, max = 5) {
  return `${Math.min(100, (s / max) * 100)}%`;
}

function CompScores({ scoring }: { scoring: Record<string, ScoringEntry> }) {
  return Object.entries(scoring).map(([name, subs]) => {
    const entries = Object.entries(subs);
    const avg = entries.length > 0 ? entries.reduce((s, [, v]) => s + v.score, 0) / entries.length : 0;
    const score = Math.round(avg * 10) / 10;
    return { name, score, subs: entries.map(([n, v]) => ({ name: n, score: v.score })) };
  });
}

/* ─── Page Component ────────────────────────────────────────────────────── */

export default function AIReportPage() {
  const { token } = useAuth();
  const params = useSearchParams();
  const participantId = params.get("participantId");
  const assessmentCenterId = params.get("assessmentCenterId");

  const [data, setData] = useState<AIReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token || !participantId || !assessmentCenterId) return;
    setLoading(true);
    setError(null);

    fetch(`${API_V1_BASE_URL}/reports/generate-ai-enhanced`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, assessmentCenterId }),
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json.success) throw new Error(json.message || "Failed to generate");
        setData(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, participantId, assessmentCenterId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#1B2B4B", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#6b7280", fontSize: 14 }}>Generating AI-Enhanced Report...</p>
          <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>This takes ~30 seconds (3 parallel AI calls)</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
        <div style={{ textAlign: "center", maxWidth: 500, padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h2 style={{ color: "#1B2B4B", fontSize: 18, fontWeight: 700 }}>Report Generation Failed</h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 20px", background: "#1B2B4B", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { participant, assessmentCenter, input, report } = data;
  const { profiles, insights, recommendations } = report;
  const acName = assessmentCenter.displayName || assessmentCenter.name;
  const competencies = CompScores({ scoring: input.scoring });

  return (
    <>
      {/* Print button (hidden when printing) */}
      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 100, display: "flex", gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "10px 20px", background: "#1B2B4B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          Download PDF (Print)
        </button>
        <button
          onClick={() => window.close()}
          style={{ padding: "10px 20px", background: "#fff", color: "#1B2B4B", border: "1px solid #d1d5db", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
        >
          Close
        </button>
      </div>

      <div ref={reportRef} style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: "#1F2937", lineHeight: 1.6, maxWidth: 794, margin: "0 auto", background: "#fff" }}>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          .page { padding: 50px; position: relative; }
          .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; margin-bottom: 30px; font-size: 11px; color: #6b7280; }
          .section-title { font-size: 24px; font-weight: 700; color: #1B2B4B; margin-bottom: 6px; }
          .section-line { height: 2px; background: #2A9D8F; margin-bottom: 20px; }
          .orange-line { background: #E9A23B; }
          .badge { display: inline-block; padding: 3px 14px; border-radius: 4px; color: #fff; font-size: 11px; font-weight: 700; }
          .strength-item { padding-left: 16px; border-left: 3px solid #2A9D8F; margin-bottom: 20px; }
          .dev-item { padding-left: 16px; border-left: 3px solid #E9A23B; margin-bottom: 20px; }
          .comp-header { background: #F3F4F6; border-radius: 6px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
          .comp-desc { background: #F9FAFB; padding: 8px 20px; font-style: italic; font-size: 12px; color: #6b7280; border-radius: 0 0 6px 6px; margin-bottom: 12px; }
          .sub-scores { display: flex; gap: 0; padding: 8px 20px; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px; }
          .sub-score-item { flex: 1; font-size: 12px; }
          .perf-bar-bg { height: 14px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
          .perf-bar-fill { height: 100%; border-radius: 3px; }
          .insight-card { background: #F3F4F6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 16px 0; }
          .col-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; }
          .pi-card { border-radius: 6px; padding: 12px 16px; margin-bottom: 8px; }
          .pi-risk { background: #FEF2F2; border: 1px solid #FECACA; }
          .pi-opp { background: #ECFDF5; border: 1px solid #A7F3D0; }
          .rec-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
          .rec-header { padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; }
          .rec-body { padding: 16px; }
          .rec-strand { margin-bottom: 12px; }
          .rec-strand-title { font-size: 12px; font-weight: 700; color: #1B2B4B; margin-bottom: 4px; }
          .summary-boxes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 20px; }
          .summary-box { border-radius: 6px; padding: 16px; }
        `}</style>

        {/* ─── PAGE 1: COVER ──────────────────────────────────────────── */}
        <div className="page" style={{ paddingTop: 0 }}>
          <div style={{ background: "linear-gradient(135deg, #1B2B4B 0%, #2d4a7a 100%)", padding: "30px 50px", marginLeft: -50, marginRight: -50, marginTop: 0, borderRadius: 0 }}>
            <div style={{ color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: 4 }}>B R E A K F R E E &nbsp; C O N S U L T I N G</div>
          </div>

          <div style={{ padding: "60px 0 0" }}>
            <h1 style={{ fontSize: 38, fontWeight: 400, color: "#1B2B4B", lineHeight: 1.2, margin: 0 }}>
              Leadership Assessment<br />Centre Report
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>{acName}</p>
            <div style={{ width: 60, height: 4, background: "#2A9D8F", margin: "24px 0 40px" }} />

            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1B2B4B", margin: "0 0 8px" }}>{participant.name}</h2>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              {[participant.designation, participant.department, participant.division].filter(Boolean).join(" · ")}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 60px", marginTop: 32 }}>
              {[
                { label: "LOCATION", value: participant.location || "—" },
                { label: "BATCH", value: participant.batchNo || "—" },
                { label: "MANAGER", value: participant.managerName || "—" },
                { label: "ASSESSMENT", value: `${acName} — ${new Date().getFullYear()}` },
              ].map((m) => (
                <div key={m.label} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 3, background: "#2A9D8F", borderRadius: 2 }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: 1 }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1B2B4B", marginTop: 2 }}>{m.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 40, left: 50, right: 50, borderTop: "1px solid #e5e7eb", paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#2A9D8F", fontSize: 16 }}>✦</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2B4B" }}>AI-Enhanced Report</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Includes predictive indicators, behavioural archetype & cross-competency pattern analysis</div>
            </div>
          </div>
        </div>

        {/* ─── PAGE 2: INTRODUCTION ───────────────────────────────────── */}
        <div className="page page-break">
          <div className="page-header">
            <span>Confidential — {participant.name} | {acName}</span>
            <span>Page 2</span>
          </div>
          <div className="section-title">Introduction</div>
          <div className="section-line" />

          <p style={{ fontSize: 13, color: "#374151" }}>
            This report presents findings from the {acName}. It is based on structured observations by trained assessors across {input.programme.activities.length} exercises: {input.programme.activities.map((a, i) => (
              <span key={i}>{i > 0 && (i === input.programme.activities.length - 1 ? ", and " : ", ")}<strong>{a}</strong></span>
            ))}. Behaviours are rated using Behaviourally Anchored Rating Scales (BARS) on a 1–5 scale.
          </p>

          <div style={{ display: "flex", gap: 6, margin: "28px 0" }}>
            {[
              { n: "1", label: "NEEDS\nFOCUS", bg: "#C44E52" },
              { n: "2", label: "DEVELOPING", bg: "#E9A23B" },
              { n: "3", label: "PROFICIENT", bg: "#8C8C8C" },
              { n: "4", label: "STRONG", bg: "#2A9D8F" },
              { n: "5", label: "OUTSTANDING", bg: "#1B2B4B" },
            ].map((s) => (
              <div key={s.n} style={{ flex: 1, background: s.bg, borderRadius: 6, padding: "16px 8px", textAlign: "center", color: "#fff" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{s.n}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, marginTop: 4, whiteSpace: "pre-line" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#F9FAFB", border: "1px solid #e5e7eb", borderRadius: 6, padding: 16, fontSize: 12, color: "#374151" }}>
            <strong>Note:</strong> This report is confidential (shelf-life 18–24 months). It reflects behaviours observed during assessment exercises only and does not constitute a performance appraisal. Please discuss findings with your HR Business Partner.
          </div>
        </div>

        {/* ─── PAGE 3: COMPETENCY SUMMARY ─────────────────────────────── */}
        <div className="page page-break">
          <div className="page-header">
            <span>Confidential — {participant.name} | {acName}</span>
            <span>Page 3</span>
          </div>
          <div className="section-title">Competency Summary</div>
          <div className="section-line" />
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Scores averaged across all activities and assessors.</p>

          {/* Table */}
          <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 1fr 2fr", background: "#1B2B4B", color: "#fff", padding: "10px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              <div>COMPETENCY</div><div>SCORE</div><div>RATING</div><div>PERFORMANCE</div>
            </div>
            {competencies.map((c) => (
              <div key={c.name} style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 1fr 2fr", padding: "12px 16px", borderBottom: "1px solid #f3f4f6", alignItems: "center", fontSize: 13 }}>
                <div style={{ color: "#374151" }}>{c.name}</div>
                <div style={{ fontWeight: 700 }}>{c.score.toFixed(1)}</div>
                <div><span className="badge" style={{ background: ratingBg(c.score) }}>{ratingLabel(c.score)}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div className="perf-bar-bg">
                      <div className="perf-bar-fill" style={{ width: barPct(c.score), background: ratingColor(c.score) }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "#6b7280", minWidth: 30 }}>{c.score.toFixed(1)}/5</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary boxes */}
          <div className="summary-boxes">
            <div className="summary-box" style={{ background: "#F0FDFA", borderTop: "3px solid #2A9D8F" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2B4B", marginBottom: 8 }}>★ Top Competencies</div>
              {competencies.filter(c => c.score >= 3.5).map(c => (
                <div key={c.name} style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>• {c.name}</div>
              ))}
              {competencies.filter(c => c.score >= 3.5).length === 0 && <div style={{ fontSize: 11, color: "#9ca3af" }}>—</div>}
            </div>
            <div className="summary-box" style={{ background: "#F0FDFA", borderTop: "3px solid #2A9D8F" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2B4B", marginBottom: 8 }}>■ Potential Strengths</div>
              {competencies.filter(c => c.score >= 2.5 && c.score < 3.5).map(c => (
                <div key={c.name} style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>• {c.name}</div>
              ))}
            </div>
            <div className="summary-box" style={{ background: "#FFFBEB", borderTop: "3px solid #E9A23B" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2B4B", marginBottom: 8 }}>↑ Areas of Development</div>
              {competencies.filter(c => c.score < 2.5).map(c => (
                <div key={c.name} style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>• {c.name}</div>
              ))}
              {competencies.filter(c => c.score < 2.5).length === 0 && <div style={{ fontSize: 11, color: "#9ca3af" }}>—</div>}
            </div>
          </div>
        </div>

        {/* ─── PAGE 4-5: OVERALL STRENGTHS & DEVELOPMENT ─────────────── */}
        <div className="page page-break">
          <div className="page-header">
            <span>Confidential — {participant.name} | {acName}</span>
            <span>Page 4</span>
          </div>
          <div className="section-title">Overall Strengths & Development Areas</div>
          <div className="section-line" />
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Synthesised themes observed across all exercises and assessors.</p>

          {/* Intro box */}
          <div style={{ background: "#F3F4F6", borderRadius: 6, padding: 20, marginBottom: 24, fontStyle: "italic", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
            {profiles.overall_intro}
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1B2B4B", marginBottom: 16, borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>Overall Strengths</h3>
          {profiles.overall_strengths.map((s, i) => (
            <div key={i} className="strength-item">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2B4B", marginBottom: 6 }}>✦ &nbsp;{s.title}</div>
              <p style={{ fontSize: 12.5, color: "#374151", margin: 0 }}>{s.body}</p>
            </div>
          ))}

          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1B2B4B", marginBottom: 16, borderBottom: "1px solid #e5e7eb", paddingBottom: 8, marginTop: 32 }}>Overall Development Areas</h3>
          {profiles.overall_development_areas.map((d, i) => (
            <div key={i} className="dev-item">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2B4B", marginBottom: 6 }}><span style={{ color: "#E9A23B" }}>▲</span> &nbsp;{d.title}</div>
              <p style={{ fontSize: 12.5, color: "#374151", margin: 0 }}>{d.body}</p>
            </div>
          ))}
        </div>

        {/* ─── PAGE 6: READINESS VS APPLICATION ──────────────────────── */}
        <div className="page page-break">
          <div className="page-header">
            <span>Confidential — {participant.name} | {acName}</span>
            <span>Page 6</span>
          </div>
          <div className="section-title">Readiness vs. Application Analysis</div>
          <div className="section-line" />
          <p style={{ fontSize: 12, color: "#374151", marginBottom: 20 }}>
            <strong>Application</strong> = behaviours observed in assessment exercises. <strong>Readiness</strong> = self-reported knowledge from the Situational Judgement Test (SJT). Readiness exceeding Application → knows what good looks like, needs practice applying it. Application exceeding Readiness → performing naturally, needs theoretical grounding.
          </p>

          {/* Bar chart */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 12, fontSize: 11 }}>
              <span><span style={{ display: "inline-block", width: 12, height: 12, background: "#1B2B4B", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Application (observed)</span>
              <span><span style={{ display: "inline-block", width: 12, height: 12, background: "#ADC6DB", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Readiness (SJT)</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 0, height: 180 }}>
              {competencies.map((c) => {
                const app = c.score;
                const rdy = Math.round(c.score);
                return (
                  <div key={c.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 160 }}>
                      <div style={{ width: 24, background: "#1B2B4B", borderRadius: "3px 3px 0 0", height: `${(app / 5) * 100}%`, position: "relative" }}>
                        <span style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "#1B2B4B" }}>{app.toFixed(1)}</span>
                      </div>
                      <div style={{ width: 24, background: "#ADC6DB", borderRadius: "3px 3px 0 0", height: `${(rdy / 5) * 100}%`, position: "relative" }}>
                        <span style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "#6b7280" }}>{rdy}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#374151", textAlign: "center", marginTop: 8, lineHeight: 1.2, maxWidth: 100 }}>{c.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gap table */}
          <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr 2.5fr", background: "#1B2B4B", color: "#fff", padding: "10px 16px", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              <div>COMPETENCY</div><div>APPLICATION</div><div>READINESS</div><div>GAP</div><div>IMPLICATION</div>
            </div>
            {competencies.map((c) => {
              const app = c.score;
              const rdy = Math.round(c.score);
              const gap = app - rdy;
              const impl = Math.abs(gap) <= 0.3 ? "Well aligned — sustain current approach" : gap > 0 ? "Behaviour ahead — build theoretical grounding" : "Knowledge ahead — focus on practical application";
              return (
                <div key={c.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr 2.5fr", padding: "10px 16px", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                  <div>{c.name}</div>
                  <div style={{ fontWeight: 700 }}>{app.toFixed(1)}</div>
                  <div style={{ fontWeight: 700 }}>{rdy}</div>
                  <div style={{ color: gap < -0.3 ? "#C44E52" : "#374151", fontWeight: 700 }}>{gap.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{impl}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── PAGES 7-9: DETAILED COMPETENCY PROFILES ───────────────── */}
        <div className="page page-break">
          <div className="page-header">
            <span>Confidential — {participant.name} | {acName}</span>
            <span>Page 7</span>
          </div>
          <div className="section-title">Detailed Competency Profiles</div>
          <div className="section-line" />
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 24 }}>Sub-competency scores and synthesised observations for each competency cluster.</p>

          {profiles.competency_profiles.map((profile) => {
            const comp = competencies.find((c) => c.name === profile.competency_name);
            const score = comp?.score ?? 3;
            return (
              <div key={profile.competency_name} style={{ marginBottom: 36 }}>
                <div className="comp-header">
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1B2B4B" }}>{profile.competency_name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#1B2B4B" }}>{score.toFixed(1)}/5</span>
                    <span className="badge" style={{ background: ratingBg(score) }}>{ratingLabel(score)}</span>
                  </div>
                </div>

                {/* Sub-competency scores */}
                {comp?.subs && comp.subs.length > 0 && (
                  <div className="sub-scores">
                    {comp.subs.map((s) => (
                      <div key={s.name} className="sub-score-item">
                        <span style={{ fontWeight: 600, color: "#1B2B4B" }}>{s.name.split("\t")[0]}</span>
                        <span style={{ marginLeft: 8, color: "#6b7280" }}>{s.score.toFixed(1)}/5</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths */}
                <div className="strength-item" style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2A9D8F", marginBottom: 8 }}>✦ Observed Strengths</div>
                  <p style={{ fontSize: 12.5, color: "#374151", margin: 0, lineHeight: 1.7 }}>{profile.strengths}</p>
                </div>

                {/* Development */}
                <div className="dev-item">
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E9A23B", marginBottom: 8 }}>▲ Areas for Development</div>
                  <p style={{ fontSize: 12.5, color: "#374151", margin: 0, lineHeight: 1.7 }}>{profile.development}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── PAGE 10: AI-POWERED INSIGHTS ───────────────────────────── */}
        <div className="page page-break">
          <div className="page-header">
            <span>Confidential — {participant.name} | {acName}</span>
            <span>Page 10</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 6 }}>
            <span className="section-title">AI-Powered Insights</span>
            <span style={{ color: "#2A9D8F", fontSize: 13, fontWeight: 700 }}>✦ AI Generated</span>
          </div>
          <div className="section-line" />

          <p style={{ fontSize: 12, color: "#374151", marginBottom: 20 }}>
            The following insights are generated by AI analysis of the full competency data, assessor observations, and readiness scores. They identify cross-competency patterns, behavioural archetypes, and forward-looking performance indicators.
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1B2B4B", marginBottom: 12 }}>Behavioural Archetype</h3>
          <div className="insight-card">
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1B2B4B", marginBottom: 8 }}>{insights.archetype.name}</div>
            <p style={{ fontSize: 12.5, color: "#374151", margin: 0 }}>{insights.archetype.description}</p>
          </div>

          <div className="three-col">
            <div className="col-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1B2B4B", letterSpacing: 1, marginBottom: 12 }}>CORE STRENGTHS</div>
              {insights.archetype.core_strengths.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 8 }}><span style={{ color: "#2A9D8F" }}>✦</span> {s}</div>
              ))}
            </div>
            <div className="col-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1B2B4B", letterSpacing: 1, marginBottom: 12 }}>WATCH-OUTS</div>
              {insights.archetype.watchouts.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 8 }}><span style={{ color: "#E9A23B" }}>▲</span> {w}</div>
              ))}
            </div>
            <div className="col-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1B2B4B", letterSpacing: 1, marginBottom: 12 }}>DEPLOYMENT FIT</div>
              <p style={{ fontSize: 12, color: "#374151", marginBottom: 8 }}><strong>Best in:</strong> {insights.archetype.deployment_best}</p>
              <p style={{ fontSize: 12, color: "#374151" }}><strong>Approach carefully:</strong> {insights.archetype.deployment_caution}</p>
            </div>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1B2B4B", marginTop: 24, marginBottom: 6 }}>Cross-Competency Pattern Analysis</h3>
          <div style={{ height: 2, background: "#2A9D8F", marginBottom: 12 }} />
          <p style={{ fontSize: 12, fontStyle: "italic", color: "#6b7280", marginBottom: 16 }}>AI analysis of how competency combinations interact — moving beyond siloed scores to identify systemic leadership dynamics.</p>

          {insights.cross_competency_patterns.map((p, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1B2B4B", marginBottom: 6 }}>{p.title}</div>
              <p style={{ fontSize: 12.5, color: "#374151", margin: "0 0 6px" }}>{p.description}</p>
              <div style={{ fontSize: 11, color: "#C44E52", marginBottom: 2 }}><strong>Risk:</strong> {p.risk}</div>
              <div style={{ fontSize: 11, color: "#2A9D8F" }}><strong>Opportunity:</strong> {p.opportunity}</div>
            </div>
          ))}
        </div>

        {/* ─── PAGE 11: PREDICTIVE INDICATORS & ROLE FIT ──────────────── */}
        <div className="page page-break">
          <div className="page-header">
            <span>Confidential — {participant.name} | {acName}</span>
            <span>Page 11</span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1B2B4B", marginBottom: 12 }}>Predictive Indicators</h3>

          {insights.predictive_indicators.map((pi, i) => (
            <div key={i} className={`pi-card ${pi.type === "RISK" ? "pi-risk" : "pi-opp"}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="badge" style={{ background: pi.type === "RISK" ? "#C44E52" : "#2A9D8F", fontSize: 9 }}>{pi.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1B2B4B" }}>{pi.indicator}</span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{pi.timeframe} | Likelihood: {pi.likelihood}/10</div>
              <div style={{ fontSize: 11, color: "#374151", marginTop: 4 }}>Mitigation: {pi.mitigation}</div>
            </div>
          ))}

          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1B2B4B", marginTop: 24, marginBottom: 12 }}>Role Fit Assessment</h3>
          <div className="insight-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1B2B4B", marginBottom: 12 }}>{insights.role_fit.title}</div>
            <div style={{ display: "flex", gap: 32, marginBottom: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#1B2B4B" }}>{insights.role_fit.current_fit}</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>Current Fit</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#2A9D8F" }}>{insights.role_fit.potential_fit}</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>Potential Fit</div>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#374151" }}>Timeline: <strong>{insights.role_fit.timeline}</strong></div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "#374151", margin: "0 0 12px" }}>{insights.role_fit.narrative}</p>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2B4B", marginBottom: 6 }}>Critical Gaps:</div>
            {insights.role_fit.critical_gaps.map((g, i) => (
              <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>• {g}</div>
            ))}
          </div>
        </div>

        {/* ─── PAGE 12: 70-20-10 RECOMMENDATIONS ─────────────────────── */}
        <div className="page page-break">
          <div className="page-header">
            <span>Confidential — {participant.name} | {acName}</span>
            <span>Page 12</span>
          </div>
          <div className="section-title">70-20-10 Development Plan</div>
          <div className="section-line" />
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>Targeted development actions across on-the-job (70%), coaching (20%), and formal learning (10%).</p>

          {recommendations.recommendations.map((rec) => {
            const prioColor = rec.priority === "HIGH" ? "#C44E52" : rec.priority === "MEDIUM" ? "#E9A23B" : "#2A9D8F";
            const prioBg = rec.priority === "HIGH" ? "#FEF2F2" : rec.priority === "MEDIUM" ? "#FFFBEB" : "#F0FDFA";
            return (
              <div key={rec.competency_name} className="rec-card">
                <div className="rec-header" style={{ background: prioBg }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1B2B4B" }}>{rec.competency_name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="badge" style={{ background: prioColor }}>{rec.priority}</span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Score: {rec.score}</span>
                  </div>
                </div>
                <div className="rec-body">
                  <p style={{ fontSize: 12, color: "#374151", marginBottom: 12 }}>{rec.intro}</p>
                  <div className="rec-strand">
                    <div className="rec-strand-title">70% On-the-Job</div>
                    {rec.on_the_job.map((item, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4, paddingLeft: 12 }}>• {item}</div>)}
                  </div>
                  <div className="rec-strand">
                    <div className="rec-strand-title">20% Coaching & Mentoring</div>
                    {rec.coaching.map((item, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4, paddingLeft: 12 }}>• {item}</div>)}
                  </div>
                  <div className="rec-strand">
                    <div className="rec-strand-title">10% Formal Learning</div>
                    {rec.formal_learning.map((item, i) => <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4, paddingLeft: 12 }}>• {item}</div>)}
                  </div>
                </div>
              </div>
            );
          })}

          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1B2B4B", marginTop: 24, marginBottom: 12 }}>Next Steps — First 30 Days</h3>
          <div style={{ background: "#F3F4F6", borderRadius: 6, padding: 16 }}>
            {recommendations.next_steps.map((step, i) => (
              <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}><strong>{i + 1}.</strong> {step}</div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
