/**
 * Assessment Insights → Excel export.
 *
 * Writes exactly what is on screen for the filters in force, as plain values so
 * the sheet can be sorted, filtered and charted. Nothing is merged, no images,
 * no styling beyond a bold header row and a frozen pane — anything else gets in
 * the way of a pivot table.
 *
 * An unmeasured score is written as an empty cell, never as 0. A 0 would be
 * charted and averaged as a real result; a blank is skipped by Excel's own
 * AVERAGE and by any chart built on the column.
 *
 * ExcelJS is loaded on demand inside `exportInsightsWorkbook` so its ~900 KB
 * never reaches the page bundle — the cost is paid only when Export is clicked.
 */

import type { CompetencyChangeRow } from './CompetencyChangeTable';
import type { TraceParticipantEntry } from './competencyTrace';
import type { OverviewCompetency, ProgressPoint } from '../participantOverview/types';

export interface ExportParticipant {
  id: string;
  name: string;
  email: string;
  designation: string;
  groupName: string;
}

export interface ExportRollup {
  participant: ExportParticipant;
  completed: boolean;
  scored: boolean;
  lastActivityAt: string | null;
  /** Index-aligned with `competencies`. */
  points: ProgressPoint[];
  trace: Record<string, TraceParticipantEntry>;
}

export interface ExportFilters {
  cohort: string;
  assessment: string;
  designation: string;
  period: string;
}

export interface ExportInput {
  filters: ExportFilters;
  competencies: OverviewCompetency[];
  tableRows: CompetencyChangeRow[];
  rollups: ExportRollup[];
  completedCount: number;
  scoredCount: number;
}

/** One decimal, or an empty cell when the figure was never measured. */
const score = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null;

/** Excel sheet names cannot contain : \ / ? * [ ] or exceed 31 characters. */
const safeSheetName = (name: string): string =>
  name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet';

const asDate = (iso: string | null): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

type Column = { header: string; key: string; width: number };

export async function exportInsightsWorkbook(input: ExportInput): Promise<void> {
  // ExcelJS is CommonJS with a UMD browser build and no `exports` map, so
  // whether the namespace carries `.default` depends on the bundler's interop.
  // Accept either shape rather than depend on that.
  const imported = (await import('exceljs')) as unknown as Record<string, unknown>;
  const ExcelJS = (imported.default ?? imported) as typeof import('exceljs');
  const { filters, competencies, tableRows, rollups, completedCount, scoredCount } = input;

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  /** Adds a sheet with a bold, frozen, auto-filtered header row. */
  const addSheet = (name: string, columns: Column[]) => {
    const sheet = workbook.addWorksheet(safeSheetName(name));
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
    return sheet;
  };

  // ── 1. Summary ───────────────────────────────────────────────────
  // Deliberately key/value rather than a table: it records the filters the
  // rest of the workbook was produced under, so a saved file can be trusted
  // later without having to remember what was selected.
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 52 },
  ];
  summary.getRow(1).font = { bold: true };

  const exportedAt = new Date();
  [
    ['Assessment centre', filters.assessment || 'Not selected'],
    ['Cohort / group', filters.cohort],
    ['Designation', filters.designation],
    ['Period', filters.period],
    ['Participants in scope', rollups.length],
    ['Participants who finished', completedCount],
    ['Participants with scores', scoredCount],
    ['Competencies', competencies.length],
    ['Exported', exportedAt],
  ].forEach(([field, value]) => {
    const row = summary.addRow({ field, value });
    if (value instanceof Date) row.getCell('value').numFmt = 'dd mmm yyyy hh:mm';
  });

  summary.addRow({});
  summary.addRow({
    field: 'Note',
    value: 'Blank score cells mean nothing was recorded for that source, not a score of zero.',
  });

  // ── 2. Competency averages ───────────────────────────────────────
  const averages = addSheet('Competency averages', [
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Competency', key: 'competency', width: 38 },
    { header: 'N', key: 'n', width: 6 },
    { header: 'Pre readiness', key: 'preReadiness', width: 15 },
    { header: 'Post readiness', key: 'postReadiness', width: 15 },
    { header: 'Readiness difference', key: 'readinessDelta', width: 21 },
    { header: 'Pre application', key: 'preApplication', width: 16 },
    { header: 'Post application', key: 'postApplication', width: 16 },
    { header: 'Application difference', key: 'applicationDelta', width: 22 },
    { header: 'Assessors', key: 'assessors', width: 40 },
  ]);

  tableRows.forEach((row) => {
    const assessors = Array.from(
      new Set(
        (row.trace?.participants ?? []).flatMap((entry) =>
          entry.assessors.filter((a) => a.score !== null).map((a) => a.assessorName)
        )
      )
    ).sort();

    averages.addRow({
      code: row.code,
      competency: row.competencyName,
      n: row.n,
      preReadiness: score(row.preReadiness),
      postReadiness: score(row.postReadiness),
      readinessDelta: score(row.readinessDelta),
      preApplication: score(row.preApplication),
      postApplication: score(row.postApplication),
      applicationDelta: score(row.applicationDelta),
      assessors: assessors.join('; '),
    });
  });

  // ── 3. Participant scores ────────────────────────────────────────
  // One row per participant per competency. Assessors vary by competency, so
  // they go down the rows rather than across the columns — a fixed
  // "Assessor 1..n" block would misalign the moment one competency is marked
  // by a different panel.
  const perParticipant = addSheet('Participant scores', [
    { header: 'Participant', key: 'participant', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Designation', key: 'designation', width: 22 },
    { header: 'Cohort / group', key: 'group', width: 22 },
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Competency', key: 'competency', width: 34 },
    { header: 'Pre readiness', key: 'preReadiness', width: 15 },
    { header: 'Post readiness', key: 'postReadiness', width: 15 },
    { header: 'Readiness difference', key: 'readinessDelta', width: 21 },
    { header: 'Pre application', key: 'preApplication', width: 16 },
    { header: 'Post application', key: 'postApplication', width: 16 },
    { header: 'Application difference', key: 'applicationDelta', width: 22 },
    { header: 'Assessor', key: 'assessor', width: 24 },
    { header: 'Assessor score', key: 'assessorScore', width: 15 },
    { header: 'Assessor status', key: 'assessorStatus', width: 16 },
    { header: 'Assessor submitted', key: 'assessorSubmitted', width: 20 },
  ]);

  rollups.forEach((entry) => {
    competencies.forEach((competency, index) => {
      const point = entry.points[index];
      if (!point) return;
      const trace = entry.trace?.[competency.id];

      const base = {
        participant: entry.participant.name,
        email: entry.participant.email,
        designation: entry.participant.designation,
        group: entry.participant.groupName,
        code: competency.code,
        competency: competency.label,
        preReadiness: score(point.preReadiness),
        postReadiness: score(point.postReadiness),
        readinessDelta: score(point.readinessDelta),
        preApplication: score(point.preApplication),
        postApplication: score(point.postApplication),
        applicationDelta: score(point.applicationDelta),
      };

      const scoringAssessors = (trace?.assessors ?? []).filter((a) => a.score !== null);

      if (scoringAssessors.length === 0) {
        // Still emit the participant's competency figures, so a competency
        // nobody has marked is visible as a gap rather than missing entirely.
        perParticipant.addRow(base);
        return;
      }

      scoringAssessors.forEach((assessor) => {
        const submitted = asDate(assessor.submittedAt);
        const row = perParticipant.addRow({
          ...base,
          assessor: assessor.assessorName,
          assessorScore: score(assessor.score),
          assessorStatus: assessor.status,
          assessorSubmitted: submitted,
        });
        if (submitted) row.getCell('assessorSubmitted').numFmt = 'dd mmm yyyy hh:mm';
      });
    });
  });

  // ── 4. Completion status ─────────────────────────────────────────
  const completion = addSheet('Completion status', [
    { header: 'Participant', key: 'participant', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Designation', key: 'designation', width: 22 },
    { header: 'Cohort / group', key: 'group', width: 22 },
    { header: 'Assessment centre', key: 'assessment', width: 34 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Scored', key: 'scored', width: 10 },
    { header: 'Last activity', key: 'lastActivity', width: 20 },
  ]);

  rollups.forEach((entry) => {
    const lastActivity = asDate(entry.lastActivityAt);
    const row = completion.addRow({
      participant: entry.participant.name,
      email: entry.participant.email,
      designation: entry.participant.designation,
      group: entry.participant.groupName,
      assessment: filters.assessment,
      status: entry.completed ? 'Completed' : 'In progress',
      scored: entry.scored ? 'Yes' : 'No',
      lastActivity,
    });
    if (lastActivity) row.getCell('lastActivity').numFmt = 'dd mmm yyyy hh:mm';
  });

  // ── Download ─────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const stamp = exportedAt.toISOString().slice(0, 10);
  const centre = (filters.assessment || 'assessment-insights')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${centre || 'assessment-insights'}-insights-${stamp}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
