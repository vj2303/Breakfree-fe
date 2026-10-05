'use client';

import React from 'react';

import {
  ALIGNMENT_STYLE,
  AMBER,
  BAND_FILL,
  BAND_TEXT,
  INK,
  LINE,
  MUTED,
  NAVY,
  PRIORITY_STYLE,
  REPORT_CSS,
  TEAL,
} from './reportStyles';
import type {
  CompetencyCopy,
  CompetencyView,
  HighlightCard,
  ReportParticipant,
  ReportView,
  SubCompetencyView,
} from './types';

/**
 * The participant report, laid out for print.
 *
 * Sections follow the assessment centre's saved Report Structure, so turning
 * a part off in the structure removes it from the document. Every number
 * comes from the view model the backend computed; nothing is derived here
 * beyond formatting.
 */

const fmt = (value: number | null | undefined): string =>
  typeof value === 'number' ? value.toFixed(1) : '–';

function BandPill({ band }: { band: string | null }) {
  if (!band) return null;
  return (
    <span className="pill" style={{ background: BAND_FILL[band] || '#eef2f7', color: BAND_TEXT[band] || NAVY }}>
      {band}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const style = PRIORITY_STYLE[priority] || PRIORITY_STYLE.MEDIUM;
  return (
    <span className="pill" style={{ background: style.bg, color: style.fg, letterSpacing: 0.6 }}>
      {priority} PRIORITY
    </span>
  );
}

/** Application bar with the readiness result marked on the same scale. */
function ScoreBar({ score, readiness, width = 260 }: { score: number | null; readiness?: number | null; width?: number }) {
  const pct = score === null ? 0 : Math.max(0, Math.min(100, (score / 5) * 100));
  const readinessPct = readiness === null || readiness === undefined ? null : Math.max(0, Math.min(100, (readiness / 5) * 100));
  return (
    <div style={{ position: 'relative', width, height: 14, background: '#EEF4F3', borderRadius: 3 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: TEAL, borderRadius: 3 }} />
      {readinessPct !== null && (
        <div
          title="Readiness (SJT)"
          style={{ position: 'absolute', top: -3, left: `calc(${readinessPct}% - 1.5px)`, width: 3, height: 20, background: NAVY, borderRadius: 1 }}
        />
      )}
    </div>
  );
}

function SheetFooter({ participantName, centreName, page }: { participantName: string; centreName: string; page: number }) {
  return (
    <div className="sheet-footer">
      <span>Confidential — {participantName} | {centreName}</span>
      <span>Page {page}</span>
    </div>
  );
}

function RunningHead() {
  return <div className="running-head">Breakfree Consulting</div>;
}

/* ─── Cover ──────────────────────────────────────────────────────────── */

function Cover({
  participant,
  centreName,
  view,
}: {
  participant: ReportParticipant;
  centreName: string;
  view: ReportView;
}) {
  const role = [participant.designation, participant.department, participant.division].filter(Boolean).join(' · ');
  const meta: Array<[string, string | null | undefined]> = [
    ['Location', participant.location],
    ['Batch', participant.batchNo],
    ['Manager', participant.managerName],
    ['Assessment centre', centreName],
    ['Assessment date', view.meta.assessmentDate],
    ['Report date', view.meta.reportDate],
  ];

  return (
    <section className="sheet">
      <div
        style={{
          background: `linear-gradient(100deg, ${NAVY} 0%, #2E4A73 100%)`,
          borderRadius: 10,
          padding: '34px 30px',
          color: '#fff',
          fontSize: 11,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 64,
        }}
      >
        Breakfree Consulting
      </div>

      <h1 className="doc-title">Leadership Assessment<br />Centre Report</h1>
      <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>{centreName}</p>
      <div className="rule-short" />

      <div style={{ fontSize: 26, fontWeight: 700, color: NAVY }}>{participant.name}</div>
      {role && <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 34px' }}>{role}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 34 }}>
        {meta.map(([label, value]) => (
          <div className="meta-item" key={label}>
            <div className="meta-label">{label}</div>
            <div className="meta-value">{value || '—'}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 28, borderTop: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: '#B3443C', fontWeight: 700, letterSpacing: 1.4 }}>CONFIDENTIAL</span>
        <span style={{ color: MUTED }}>Breakfree Consulting</span>
      </div>
    </section>
  );
}

/* ─── Snapshot ───────────────────────────────────────────────────────── */

function HighlightColumn({
  title,
  icon,
  accent,
  cards,
  oneLiners,
  showPriority,
}: {
  title: string;
  icon: string;
  accent: string;
  cards: HighlightCard[];
  oneLiners: Record<string, string>;
  showPriority: boolean;
}) {
  return (
    <div>
      <div style={{ borderTop: `2px solid ${accent}`, paddingTop: 8, marginBottom: 14 }}>
        <span style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: 1.6 }}>
          {icon} {title.toUpperCase()}
        </span>
      </div>
      {cards.map((card) => (
        <div key={`${card.competencyName}-${card.subCompetency}`} className="avoid-break" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: NAVY }}>{card.subCompetency}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: NAVY }}>{fmt(card.score)}</span>
          </div>
          <div style={{ fontSize: 11, color: MUTED, margin: '2px 0 4px' }}>
            {card.competencyName}
            {showPriority && <> · <PriorityPill priority={card.priority} /></>}
          </div>
          {oneLiners[card.subCompetency] && (
            <div style={{ fontSize: 12.5, color: INK }}>{oneLiners[card.subCompetency]}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function Snapshot({
  participant,
  centreName,
  view,
  page,
  showChart,
  showStrengths,
  showDevelopment,
}: {
  participant: ReportParticipant;
  centreName: string;
  view: ReportView;
  page: number;
  showChart: boolean;
  showStrengths: boolean;
  showDevelopment: boolean;
}) {
  return (
    <section className="sheet page-break">
      <RunningHead />
      <h2 className="section-head">Snapshot</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>
        {participant.name} · {centreName}
      </p>
      <div className="rule" />

      {showChart && (
        <>
          <h3 className="block-head">Competency profile</h3>
          <div style={{ marginBottom: 10 }}>
            {view.competencies.map((c) => (
              <div key={c.competencyId} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span style={{ width: 170, fontSize: 12, color: INK }}>{c.name}</span>
                <ScoreBar score={c.application} readiness={c.readiness} />
                <span style={{ width: 30, fontSize: 13, fontWeight: 700, color: NAVY }}>{fmt(c.application)}</span>
                <BandPill band={c.band} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 10.5, color: MUTED, marginBottom: 16 }}>
            <span><span style={{ display: 'inline-block', width: 16, height: 8, background: TEAL, borderRadius: 2, marginRight: 5 }} />Application — observed in exercises</span>
            <span><span style={{ display: 'inline-block', width: 3, height: 10, background: NAVY, marginRight: 5, verticalAlign: -1 }} />Readiness — SJT result</span>
          </div>
        </>
      )}

      {view.overallSummary && (
        <>
          <h3 className="block-head">Overall summary</h3>
          <div className="callout callout-summary" style={{ marginBottom: 18 }}>{view.overallSummary}</div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: showStrengths && showDevelopment ? '1fr 1fr' : '1fr', gap: 28 }}>
        {showStrengths && (
          <HighlightColumn
            title="Key strengths"
            icon="✦"
            accent={TEAL}
            cards={view.keyStrengths}
            oneLiners={view.subCompetencyOneLiners}
            showPriority={false}
          />
        )}
        {showDevelopment && (
          <HighlightColumn
            title="Development areas"
            icon="▲"
            accent={AMBER}
            cards={view.developmentAreas}
            oneLiners={view.subCompetencyOneLiners}
            showPriority
          />
        )}
      </div>

      <SheetFooter participantName={participant.name} centreName={centreName} page={page} />
    </section>
  );
}

/* ─── How to read this report ────────────────────────────────────────── */

const SCALE = [
  { level: 1, label: 'Needs Focus' },
  { level: 2, label: 'Developing' },
  { level: 3, label: 'Proficient' },
  { level: 4, label: 'Strong' },
  { level: 5, label: 'Outstanding' },
];

function HowToRead({
  participant,
  centreName,
  view,
  page,
  showScale,
  showReadiness,
}: {
  participant: ReportParticipant;
  centreName: string;
  view: ReportView;
  page: number;
  showScale: boolean;
  showReadiness: boolean;
}) {
  return (
    <section className="sheet page-break">
      <RunningHead />
      <h2 className="section-head">How to read this report</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>
        What was assessed, how it was rated, and what the two measures mean.
      </p>
      <div className="rule" />

      <p style={{ fontSize: 12.5, marginTop: 0 }}>
        This report is based on structured observations by trained assessors across{' '}
        <strong>{view.exercises.length} exercises</strong>. Behaviours were rated using Behaviourally Anchored
        Rating Scales (BARS).
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '12px 0 16px' }}>
        {view.exercises.map((exercise) => (
          <div key={exercise.activityId} className="avoid-break" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ background: NAVY, color: '#fff', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
                {exercise.code}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{exercise.name}</span>
            </div>
            {exercise.blurb && <div style={{ fontSize: 11.5, color: MUTED }}>{exercise.blurb}</div>}
          </div>
        ))}
      </div>

      {showScale && (
        <>
          <h3 className="block-head">Rating scale</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 }}>
            {SCALE.map((s) => (
              <div
                key={s.level}
                style={{
                  background: BAND_FILL[s.label],
                  color: BAND_TEXT[s.label],
                  borderRadius: 6,
                  padding: '9px 6px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 700 }}>{s.level}</div>
                <div style={{ fontSize: 10.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10.5, color: MUTED, marginTop: 0 }}>
            Scores are averages across exercises and assessors, shown to one decimal. A band applies from its whole
            number upward (3.0–3.9 = Proficient); 4.5 and above is Outstanding.
          </p>
        </>
      )}

      {showReadiness && (
        <>
          <h3 className="block-head" style={{ marginTop: 18 }}>Two measures per competency</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: TEAL, marginBottom: 3 }}>Application</div>
              <div style={{ fontSize: 11.5, color: INK }}>Behaviour observed by trained assessors across the exercises.</div>
            </div>
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, marginBottom: 3 }}>Readiness</div>
              <div style={{ fontSize: 11.5, color: INK }}>
                Results from the situational judgement test (SJT) — understanding of what effective behaviour looks like.
              </div>
            </div>
          </div>
          <p style={{ fontSize: 10.5, color: MUTED, marginTop: 0 }}>
            When the two differ by more than half a point, the report flags <strong>Needs Practice</strong> (readiness
            ahead of application) or <strong>Needs Grounding</strong> (application ahead of readiness). Otherwise the
            competency is <strong>Aligned</strong>.
          </p>
        </>
      )}

      <h3 className="block-head" style={{ marginTop: 18 }}>Competency overview</h3>
      <table className="matrix">
        <thead>
          <tr>
            <th className="left">Competency</th>
            <th>Application</th>
            <th>Band</th>
            {showReadiness && <th>Readiness</th>}
            {showReadiness && <th>Readiness vs application</th>}
          </tr>
        </thead>
        <tbody>
          {view.competencies.map((c) => (
            <tr key={c.competencyId}>
              <td className="left" style={{ fontWeight: 600, color: NAVY }}>{c.name}</td>
              <td style={{ fontWeight: 700 }}>{fmt(c.application)}</td>
              <td><BandPill band={c.band} /></td>
              {showReadiness && <td style={{ fontWeight: 700 }}>{fmt(c.readiness)}</td>}
              {showReadiness && (
                <td>
                  {c.alignment && (
                    <span
                      className="pill-outline"
                      style={{
                        border: `1px solid ${ALIGNMENT_STYLE[c.alignment].border}`,
                        color: ALIGNMENT_STYLE[c.alignment].fg,
                      }}
                    >
                      {c.alignment}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 10.5, color: MUTED, borderLeft: `3px solid ${LINE}`, paddingLeft: 10, marginTop: 18 }}>
        This report reflects behaviour observed in assessment exercises only and is not a performance appraisal.
        Validity: 18–24 months. Please discuss the findings with your manager and HR Business Partner.
      </p>

      <SheetFooter participantName={participant.name} centreName={centreName} page={page} />
    </section>
  );
}

/* ─── Competency × exercise matrix ───────────────────────────────────── */

function Matrix({
  participant,
  centreName,
  view,
  page,
}: {
  participant: ReportParticipant;
  centreName: string;
  view: ReportView;
  page: number;
}) {
  const cell = (score: number | null) => {
    if (score === null) return <span style={{ color: '#cbd5e1' }}>–</span>;
    const band = score >= 4.5 ? 'Outstanding' : score >= 4 ? 'Strong' : score >= 3 ? 'Proficient' : score >= 2 ? 'Developing' : 'Needs Focus';
    return (
      <span
        style={{
          display: 'inline-block',
          minWidth: 40,
          padding: '4px 0',
          borderRadius: 4,
          background: BAND_FILL[band],
          color: BAND_TEXT[band],
          fontWeight: 700,
        }}
      >
        {score.toFixed(1)}
      </span>
    );
  };

  return (
    <section className="sheet page-break">
      <RunningHead />
      <h2 className="section-head">Competency × exercise</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>
        Average rating for each sub-competency in each exercise. “–” means the sub-competency was not assessed in that
        exercise.
      </p>
      <div className="rule" />

      <table className="matrix">
        <thead>
          <tr>
            <th className="left">Competency / sub-competency</th>
            {view.exercises.map((e) => (
              <th key={e.activityId}>
                {e.code}
              </th>
            ))}
            <th>Overall</th>
          </tr>
        </thead>
        <tbody>
          {view.competencies.map((c) => (
            <React.Fragment key={c.competencyId}>
              <tr className="group">
                <td className="left">{c.name}</td>
                {view.exercises.map((e) => <td key={e.activityId} />)}
                <td>{fmt(c.application)}</td>
              </tr>
              {c.subCompetencies.map((sub) => (
                <tr key={sub.key}>
                  <td className="left" style={{ paddingLeft: 18 }}>
                    {sub.name}
                    {sub.tag === 'strength' && <span style={{ color: TEAL, fontSize: 10, fontWeight: 700 }}> ✦ Strength</span>}
                    {sub.tag === 'development' && <span style={{ color: AMBER, fontSize: 10, fontWeight: 700 }}> ▲ Development</span>}
                  </td>
                  {view.exercises.map((e) => (
                    <td key={e.activityId}>{cell(sub.perExercise[e.activityId] ?? null)}</td>
                  ))}
                  <td style={{ fontWeight: 700 }}>{fmt(sub.score)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 14, fontSize: 10, color: MUTED, marginTop: 10 }}>
        {['Developing', 'Proficient', 'Strong', 'Outstanding'].map((band) => (
          <span key={band}>
            <span style={{ display: 'inline-block', width: 14, height: 9, background: BAND_FILL[band], borderRadius: 2, marginRight: 4 }} />
            {band}
          </span>
        ))}
      </div>

      {view.matrixPattern && (
        <div className="callout callout-summary" style={{ marginTop: 18 }}>
          <strong>Pattern across exercises.</strong> {view.matrixPattern}
        </div>
      )}

      <SheetFooter participantName={participant.name} centreName={centreName} page={page} />
    </section>
  );
}

/* ─── Per-competency detail ──────────────────────────────────────────── */

/** "CS - The 12% Mandate - Pre-Sr. Mgr" reads as "Case Study" in evidence rows. */
const EXERCISE_LABELS: Record<string, string> = {
  CS: 'Case Study',
  RP: 'Role Play',
  GD: 'Group Discussion',
  IB: 'Inbox',
};

function EvidenceRows({ sub, exerciseLabel }: { sub: SubCompetencyView; exerciseLabel: (name: string) => string }) {
  const rows = [sub.highest, sub.lowest].filter(Boolean) as NonNullable<SubCompetencyView['highest']>[];
  if (rows.length === 0) return null;
  return (
    <div className="evidence-group" style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{sub.name}</div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 4 }}>
          <span
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: row.score >= 4 ? TEAL : '#D8E3E1',
              color: row.score >= 4 ? '#fff' : NAVY,
              fontSize: 10.5,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {row.score}
          </span>
          <span style={{ flexShrink: 0, width: 108, fontSize: 11, color: MUTED }}>{exerciseLabel(row.exerciseName)}</span>
          <span style={{ fontSize: 11.5, color: INK }}>{row.descriptor}</span>
        </div>
      ))}
    </div>
  );
}

function CompetencyDetail({
  participant,
  centreName,
  competency,
  copy,
  page,
  showStrengths,
  showDevelopment,
  showEvidence,
  showReadiness,
  exerciseLabel,
}: {
  participant: ReportParticipant;
  centreName: string;
  competency: CompetencyView;
  copy: CompetencyCopy | undefined;
  page: number;
  showStrengths: boolean;
  showDevelopment: boolean;
  showEvidence: boolean;
  showReadiness: boolean;
  exerciseLabel: (name: string) => string;
}) {
  return (
    <section className="sheet page-break">
      <RunningHead />

      <div style={{ background: NAVY, borderRadius: 8, padding: '15px 20px', color: '#fff', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase', color: '#A9BBD3' }}>Competency</div>
          <div style={{ fontSize: 21, fontWeight: 700 }}>{competency.name}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase', color: '#A9BBD3' }}>Application</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 700 }}>{fmt(competency.application)}</span>
            <BandPill band={competency.band} />
          </div>
        </div>
        {showReadiness && competency.readiness !== null && (
          <div style={{ textAlign: 'center', borderLeft: '1px solid #44597A', paddingLeft: 22 }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase', color: '#A9BBD3' }}>Readiness</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{fmt(competency.readiness)}</span>
              {competency.alignment && (
                <span className="pill-outline" style={{ color: NAVY }}>{competency.alignment}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ margin: '14px 0 6px' }}>
        {competency.subCompetencies.map((sub) => (
          <div key={sub.key} className="avoid-break" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '8px 0', borderBottom: `1px solid ${LINE}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
                {sub.name}
                {sub.tag === 'strength' && <span style={{ color: TEAL, fontSize: 10.5 }}> ✦ Strength</span>}
                {sub.tag === 'development' && <span style={{ color: AMBER, fontSize: 10.5 }}> ▲ Development</span>}
              </div>
              {sub.description && <div style={{ fontSize: 11.5, color: MUTED }}>{sub.description}</div>}
            </div>
            <ScoreBar score={sub.score} width={120} />
            <span style={{ width: 28, fontSize: 13, fontWeight: 700, color: NAVY }}>{fmt(sub.score)}</span>
            <BandPill band={sub.band} />
          </div>
        ))}
      </div>

      {showStrengths && copy && copy.strengths.length > 0 && (
        <>
          <h3 className="block-head" style={{ marginTop: 16 }}>Strengths</h3>
          {copy.strengths.map((s, i) => (
            <div key={i} className="callout callout-strength avoid-break" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                <span style={{ color: TEAL }}>✦ {s.subCompetency}</span>
                {s.headline && <span style={{ color: MUTED, fontWeight: 600 }}> — {s.headline}</span>}
              </div>
              <div style={{ marginBottom: 6 }}><strong>What assessors observed:</strong> {s.observed}</div>
              {s.howToUse && <div><strong>How to use it:</strong> {s.howToUse}</div>}
            </div>
          ))}
        </>
      )}

      {showDevelopment && copy && copy.developments.length > 0 && (
        <>
          <h3 className="block-head" style={{ marginTop: 14 }}>Development</h3>
          {copy.developments.map((d, i) => (
            <div key={i} className="callout callout-development avoid-break" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                <span style={{ color: '#B57714' }}>▲ {d.subCompetency}</span>
                {d.headline && <span style={{ color: MUTED, fontWeight: 600 }}> — {d.headline}</span>}{' '}
                <PriorityPill priority={d.priority} />
              </div>
              <div style={{ marginBottom: 6 }}><strong>What assessors observed:</strong> {d.observed}</div>
              {d.nextLevel && <div><strong>What the next level looks like:</strong> {d.nextLevel}</div>}
            </div>
          ))}
        </>
      )}

      {showEvidence && (
        <>
          <h3 className="block-head" style={{ marginTop: 16 }}>
            Evidence highlights{' '}
            <span style={{ fontWeight: 400, fontSize: 11, color: MUTED }}>
              — highest- and lowest-rated behaviour per sub-competency
            </span>
          </h3>
          {competency.subCompetencies.map((sub) => (
            <EvidenceRows key={sub.key} sub={sub} exerciseLabel={exerciseLabel} />
          ))}
        </>
      )}

      <SheetFooter participantName={participant.name} centreName={centreName} page={page} />
    </section>
  );
}

/* ─── Readiness vs application ───────────────────────────────────────── */

function ReadinessVsApplication({
  participant,
  centreName,
  view,
  page,
}: {
  participant: ReportParticipant;
  centreName: string;
  view: ReportView;
  page: number;
}) {
  const scored = view.competencies.filter((c) => c.readiness !== null);
  if (scored.length === 0) return null;
  const barWidth = 330;
  const signed = (value: number | null) =>
    value === null ? '–' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`;

  return (
    <section className="sheet page-break">
      <RunningHead />
      <h2 className="section-head">Readiness vs application</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>
        Application = behaviour observed in the exercises. Readiness = situational judgement test (SJT) result. The
        two are never combined.
      </p>
      <div className="rule" />

      <div style={{ marginBottom: 14 }}>
        {view.competencies.map((c) => (
          <div key={c.competencyId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ width: 160, fontSize: 12, fontWeight: 600, color: NAVY }}>{c.name}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <div style={{ width: barWidth, height: 11, background: '#EEF4F3', borderRadius: 2 }}>
                  <div style={{ width: `${((c.application ?? 0) / 5) * 100}%`, height: '100%', background: TEAL, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{fmt(c.application)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: barWidth, height: 11, background: '#EEF1F6', borderRadius: 2 }}>
                  <div style={{ width: `${((c.readiness ?? 0) / 5) * 100}%`, height: '100%', background: NAVY, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{fmt(c.readiness)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 10.5, color: MUTED, marginBottom: 16 }}>
        <span><span style={{ display: 'inline-block', width: 14, height: 8, background: TEAL, borderRadius: 2, marginRight: 5 }} />Application</span>
        <span><span style={{ display: 'inline-block', width: 14, height: 8, background: NAVY, borderRadius: 2, marginRight: 5 }} />Readiness</span>
      </div>

      <table className="matrix">
        <thead>
          <tr>
            <th className="left">Competency</th>
            <th>Application</th>
            <th>Readiness</th>
            <th>Gap</th>
            <th>Label</th>
            <th className="left">Implication</th>
          </tr>
        </thead>
        <tbody>
          {view.competencies.map((c) => (
            <tr key={c.competencyId}>
              <td className="left" style={{ fontWeight: 700, color: NAVY }}>{c.name}</td>
              <td style={{ fontWeight: 700 }}>{fmt(c.application)}</td>
              <td style={{ fontWeight: 700 }}>{fmt(c.readiness)}</td>
              <td style={{ fontWeight: 700 }}>{signed(c.gap)}</td>
              <td>
                {c.alignment && (
                  <span className="pill-outline" style={{ border: `1px solid ${ALIGNMENT_STYLE[c.alignment].border}`, color: NAVY }}>
                    {c.alignment}
                  </span>
                )}
              </td>
              <td className="left" style={{ fontSize: 10.5, color: MUTED }}>{c.implication}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {view.developmentPlan?.readinessNarrative && (
        <>
          <h3 className="block-head" style={{ marginTop: 18 }}>What this means for development</h3>
          <div className="callout callout-summary">{view.developmentPlan.readinessNarrative}</div>
        </>
      )}

      <SheetFooter participantName={participant.name} centreName={centreName} page={page} />
    </section>
  );
}

/* ─── Development plan ───────────────────────────────────────────────── */

function DevelopmentPlanSection({
  participant,
  centreName,
  plan,
  page,
}: {
  participant: ReportParticipant;
  centreName: string;
  plan: NonNullable<ReportView['developmentPlan']>;
  page: number;
}) {
  const column = (label: string, children: React.ReactNode) => (
    <div style={{ flex: 1, borderLeft: `1px solid ${LINE}`, padding: '10px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2, color: TEAL, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: INK, lineHeight: 1.55 }}>{children}</div>
    </div>
  );

  return (
    <section className="sheet page-break">
      <RunningHead />
      <h2 className="section-head">Development plan</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>
        One block per development area, ordered by priority. Actions follow the 70-20-10 model: on the job, coaching
        and feedback, formal learning.
      </p>
      <div className="rule" />

      {plan.blocks.map((block) => (
        <div key={block.subCompetency} className="avoid-break" style={{ border: `1px solid ${LINE}`, borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ background: '#F8FAFC', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{block.subCompetency}</div>
              <div style={{ fontSize: 11, color: MUTED }}>
                {block.competencyName}
                {block.readinessLabel ? ` · Readiness: ${block.readinessLabel}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{fmt(block.score)}</span>
              <PriorityPill priority={block.priority} />
            </div>
          </div>

          {block.whatToWorkOn && (
            <div style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${LINE}` }}>
              <strong>What to work on:</strong> {block.whatToWorkOn}
            </div>
          )}

          <div style={{ display: 'flex' }}>
            {column(
              '70% · ON THE JOB',
              <ul style={{ margin: 0, paddingLeft: 14 }}>
                {block.onTheJob.map((action, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{action}</li>
                ))}
              </ul>
            )}
            {column('20% · COACHING & FEEDBACK', block.coaching)}
            {column('10% · FORMAL LEARNING', block.formalLearning)}
          </div>
        </div>
      ))}

      {(plan.leverageStrengths.length > 0 || plan.firstThirtyDays.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 6 }}>
          {plan.leverageStrengths.length > 0 && (
            <div className="callout callout-plain avoid-break">
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Leverage your strengths</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {plan.leverageStrengths.map((item, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <strong>{item.from} → {item.to}.</strong> {item.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.firstThirtyDays.length > 0 && (
            <div className="callout callout-summary avoid-break">
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>First 30 days</div>
              <ol style={{ margin: 0, paddingLeft: 16 }}>
                {plan.firstThirtyDays.map((step, i) => (
                  <li key={i} style={{ marginBottom: 5 }}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <SheetFooter participantName={participant.name} centreName={centreName} page={page} />
    </section>
  );
}

/* ─── Appendix: every rating an assessor gave ────────────────────────── */

function Appendix({
  participant,
  centreName,
  appendix,
  exerciseLabel,
  page,
}: {
  participant: ReportParticipant;
  centreName: string;
  appendix: NonNullable<ReportView['appendix']>;
  exerciseLabel: (name: string) => string;
  page: number;
}) {
  const hasUnrated = appendix.some((c) =>
    c.subCompetencies.some((s) => s.entries.some((e) => e.score === null && e.descriptor))
  );

  return (
    <section className="sheet page-break">
      <RunningHead />
      <h2 className="section-head">Appendix — Assessor evidence</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>
        Every rating and BARS descriptor selected, by competency, sub-competency and exercise. This is the audit
        trail for the report; assessor names and notes appear only here.
      </p>
      <div className="rule" />

      <table className="matrix">
        <thead>
          <tr>
            <th className="left" style={{ width: 90 }}>Exercise</th>
            <th className="left" style={{ width: 90 }}>Assessor</th>
            <th style={{ width: 56 }}>Rating</th>
            <th className="left">Behaviour observed (BARS descriptor)</th>
            <th className="left" style={{ width: 120 }}>Assessor note</th>
          </tr>
        </thead>
        <tbody>
          {appendix.map((competency) => (
            <React.Fragment key={competency.competencyId}>
              <tr>
                <td className="left" colSpan={5} style={{ background: NAVY, color: '#fff', fontWeight: 700, fontSize: 11.5 }}>
                  {competency.competencyName.split('\t')[0].split(':')[0]}
                </td>
              </tr>
              {competency.subCompetencies
                .filter((sub) => sub.entries.length > 0)
                .map((sub) => (
                  <React.Fragment key={sub.subCompetency}>
                    <tr>
                      <td className="left" colSpan={5} style={{ background: '#EEF2F7', fontWeight: 700, color: NAVY, fontSize: 11 }}>
                        {sub.subCompetency.split('\t')[0].split(':')[0]}
                        <span style={{ fontWeight: 400, color: MUTED }}> — {fmt(sub.averageScore)}</span>
                      </td>
                    </tr>
                    {sub.entries.map((entry, i) => (
                      <tr key={i}>
                        <td className="left" style={{ fontSize: 10.5 }}>{exerciseLabel(entry.activityName)}</td>
                        <td className="left" style={{ fontSize: 10.5 }}>{entry.assessorName}</td>
                        <td style={{ fontWeight: 700, color: entry.score === null ? '#B3443C' : INK, fontSize: 10.5 }}>
                          {entry.score === null ? 'Not rated' : entry.score}
                        </td>
                        <td className="left" style={{ fontSize: 10.5 }}>{entry.descriptor || '—'}</td>
                        <td className="left" style={{ fontSize: 10, color: '#8A5A12', fontStyle: 'italic' }}>
                          {entry.comments.join(' ')}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {hasUnrated && (
        <p style={{ fontSize: 10, color: MUTED, marginTop: 10 }}>
          “Not rated”: the assessor selected a descriptor but no rating was recorded. These entries are excluded from
          all averages.
        </p>
      )}

      <SheetFooter participantName={participant.name} centreName={centreName} page={page} />
    </section>
  );
}

/* ─── Document ───────────────────────────────────────────────────────── */

export default function ReportDocument({
  participant,
  centreName,
  view,
}: {
  participant: ReportParticipant;
  centreName: string;
  view: ReportView;
}) {
  const structure = view.structure;
  // With no saved structure, show everything rather than an empty document.
  const showIntro = structure ? structure.introduction : true;
  const showScale = structure?.overallRatings?.interpretingScoreTable ?? true;
  const showMatrix = structure?.overallRatings?.competenciesScoreMatrix ?? true;
  const showChart = (structure?.overallRatings?.chartType ?? 'bar') !== 'none';
  const showReadiness = structure ? structure.readinessVsApplication : true;
  const showStrengths = structure?.comments?.areasOfStrength ?? true;
  const showDevelopment = structure?.comments?.areasOfDevelopment ?? true;
  const showDetail = structure?.analysis?.detailObservation ?? true;
  const showRecommendation = structure ? structure.recommendation : true;

  const copyById = new Map(view.competencyCopy.map((c) => [c.competencyId, c]));
  // Evidence rows name the exercise type, not its full title.
  const codeByExerciseName = new Map(view.exercises.map((e) => [e.name, e.code]));
  const exerciseLabel = (name: string) => {
    const code = codeByExerciseName.get(name);
    return (code && EXERCISE_LABELS[code]) || name;
  };
  let page = 1;

  return (
    <div className="report-root">
      <style>{REPORT_CSS}</style>

      {/* The sections sit inside a table so that, when printing, the browser
          repeats the footer on every page *and* reserves room for it. A fixed
          footer is simply painted over whatever reaches the foot of a page. */}
      <table className="print-frame">
        <tfoot>
          <tr>
            <td>
              <div className="running-footer">
                Confidential — {participant.name} | {centreName}
              </div>
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
              <Cover participant={participant} centreName={centreName} view={view} />

              <Snapshot
                participant={participant}
                centreName={centreName}
                view={view}
                page={++page}
                showChart={showChart}
                showStrengths={showStrengths}
                showDevelopment={showDevelopment}
              />

              {showIntro && (
                <HowToRead
                  participant={participant}
                  centreName={centreName}
                  view={view}
                  page={++page}
                  showScale={showScale}
                  showReadiness={showReadiness}
                />
              )}

              {showMatrix && (
                <Matrix participant={participant} centreName={centreName} view={view} page={++page} />
              )}

              {showDetail &&
                view.competencies.map((competency) => (
                  <CompetencyDetail
                    key={competency.competencyId}
                    participant={participant}
                    centreName={centreName}
                    competency={competency}
                    copy={copyById.get(competency.competencyId)}
                    page={++page}
                    showStrengths={showStrengths}
                    showDevelopment={showDevelopment}
                    showEvidence
                    showReadiness={showReadiness}
                    exerciseLabel={exerciseLabel}
                  />
                ))}

              {showReadiness && (
                <ReadinessVsApplication
                  participant={participant}
                  centreName={centreName}
                  view={view}
                  page={++page}
                />
              )}

              {showRecommendation && view.developmentPlan && view.developmentPlan.blocks.length > 0 && (
                <DevelopmentPlanSection
                  participant={participant}
                  centreName={centreName}
                  plan={view.developmentPlan}
                  page={++page}
                />
              )}

              {view.appendix && view.appendix.length > 0 && (
                <Appendix
                  participant={participant}
                  centreName={centreName}
                  appendix={view.appendix}
                  exerciseLabel={exerciseLabel}
                  page={++page}
                />
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
