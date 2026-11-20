/**
 * Participant Overview → Excel export.
 *
 * The same figures that are on screen for this participant, as plain values so
 * they can be sorted, filtered and charted. Nothing merged, no images.
 *
 * An unmeasured score is written as an empty cell, never 0. A 0 would be
 * averaged and charted as a real result; a blank is skipped by Excel's own
 * AVERAGE and by any chart over the column — the same rule the screen follows
 * when it shows "No data".
 *
 * ExcelJS loads on demand inside the export so its bundle is fetched only when
 * someone actually exports.
 */

import {
  assessorCompetencyAverage,
  assessorCompetencyComments,
  competencyMax,
  roundToDisplay,
} from './scoring';
import type {
  AssessorRecord,
  CompletionRow,
  OverviewActivity,
  OverviewAssessmentCenter,
  OverviewCompetency,
  OverviewParticipant,
  ProgressPoint,
} from './types';

export interface ParticipantExportInput {
  participant: OverviewParticipant;
  assessmentCenter: OverviewAssessmentCenter;
  cohortName: string;
  competencies: OverviewCompetency[];
  activities: OverviewActivity[];
  completionRows: CompletionRow[];
  assessors: AssessorRecord[];
  descriptors: Record<string, unknown> | null;
  progressPoints: ProgressPoint[];
}

const score = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? roundToDisplay(value) : null;

const asDate = (iso: string | null): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

const safeSheetName = (name: string): string =>
  name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet';

type Column = { header: string; key: string; width: number };

export async function exportParticipantWorkbook(input: ParticipantExportInput): Promise<void> {
  // CommonJS with a UMD browser build and no exports map, so the namespace may
  // or may not carry `.default` depending on the bundler's interop.
  const imported = (await import('exceljs')) as unknown as Record<string, unknown>;
  const ExcelJS = (imported.default ?? imported) as typeof import('exceljs');

  const {
    participant,
    assessmentCenter,
    cohortName,
    competencies,
    activities,
    completionRows,
    assessors,
    descriptors,
    progressPoints,
  } = input;

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const exportedAt = new Date();

  const addSheet = (name: string, columns: Column[]) => {
    const sheet = workbook.addWorksheet(safeSheetName(name));
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    return sheet;
  };

  const activityIds = activities.map((activity) => activity.activityId);
  const pointByCode = new Map(progressPoints.map((point) => [point.code, point]));

  // ── 1. Summary ───────────────────────────────────────────────────
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Field', key: 'field', width: 26 },
    { header: 'Value', key: 'value', width: 54 },
  ];
  summary.getRow(1).font = { bold: true };

  const completedDates = completionRows
    .map((row) => asDate(row.completedAt))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  [
    ['Participant', participant.name],
    ['Participant ID', participant.userCode || participant.id],
    ['Email', participant.email],
    ['Designation', participant.designation],
    ['Manager / team leader', participant.managerName],
    ['Cohort / batch', cohortName],
    ['Assessment centre', assessmentCenter.displayName || assessmentCenter.name],
    ['Activities', completionRows.length],
    ['Activities completed', completionRows.filter((row) => row.isSubmitted).length],
    ['Competencies', competencies.length],
    ['Assessors', assessors.length],
    ['First completed', completedDates[0] ?? ''],
    ['Last completed', completedDates[completedDates.length - 1] ?? ''],
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

  // ── 2. Competency scores ─────────────────────────────────────────
  // One row per competency, with each assessor as their own column — the
  // scoring table on screen, as values.
  const scoreSheet = addSheet('Competency scores', [
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Competency', key: 'competency', width: 36 },
    { header: 'Max score', key: 'max', width: 11 },
    ...assessors.map((assessor, index) => ({
      header: assessor.name || `Assessor ${index + 1}`,
      key: `assessor${index}`,
      width: 18,
    })),
    { header: 'Final score', key: 'final', width: 12 },
    { header: 'Pre readiness', key: 'preReadiness', width: 14 },
    { header: 'Post readiness', key: 'postReadiness', width: 14 },
    { header: 'Readiness difference', key: 'readinessDelta', width: 20 },
    { header: 'Pre application', key: 'preApplication', width: 15 },
    { header: 'Post application', key: 'postApplication', width: 15 },
    { header: 'Application difference', key: 'applicationDelta', width: 21 },
  ]);

  competencies.forEach((competency) => {
    const assessingActivityIds = activities
      .filter((activity) => activity.competencyIds.includes(competency.id))
      .map((activity) => activity.activityId);
    const scoped = assessingActivityIds.length > 0 ? assessingActivityIds : activityIds;

    const maxes = scoped
      .map((activityId) => competencyMax(descriptors, activityId, competency))
      .filter((value) => value > 0);

    const perAssessor = assessors.map((assessor) =>
      assessorCompetencyAverage(assessor, scoped, competency)
    );
    const present = perAssessor.filter((value): value is number => value !== null);
    const point = pointByCode.get(competency.code);

    const row: Record<string, unknown> = {
      code: competency.code,
      competency: competency.label,
      max: maxes.length > 0 ? score(maxes.reduce((a, b) => a + b, 0) / maxes.length) : null,
      final: present.length > 0 ? score(present.reduce((a, b) => a + b, 0) / present.length) : null,
      preReadiness: score(point?.preReadiness),
      postReadiness: score(point?.postReadiness),
      readinessDelta: score(point?.readinessDelta),
      preApplication: score(point?.preApplication),
      postApplication: score(point?.postApplication),
      applicationDelta: score(point?.applicationDelta),
    };
    perAssessor.forEach((value, index) => {
      row[`assessor${index}`] = score(value);
    });

    scoreSheet.addRow(row);
  });

  // ── 3. Activity completion ───────────────────────────────────────
  const completion = addSheet('Activity completion', [
    { header: 'Activity', key: 'activity', width: 38 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Duration (min)', key: 'duration', width: 14 },
    { header: 'Assessors', key: 'assessors', width: 28 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Completed on', key: 'completedAt', width: 20 },
    { header: 'Competencies assessed', key: 'competencies', width: 46 },
  ]);

  completionRows.forEach((activityRow) => {
    const activity = activities.find((a) => a.activityId === activityRow.activityId);
    const names = (activity?.competencyIds || [])
      .map((id) => competencies.find((c) => c.id === id))
      .filter((c): c is OverviewCompetency => Boolean(c))
      .map((c) => `${c.code} ${c.label}`);

    const completedAt = asDate(activityRow.completedAt);
    const row = completion.addRow({
      activity: activityRow.name,
      type: activityRow.activityType,
      duration: activityRow.durationMinutes,
      assessors: activityRow.assessors.join('; '),
      status: activityRow.isSubmitted ? 'Completed' : 'Not completed',
      completedAt,
      competencies: names.join('; '),
    });
    if (completedAt) row.getCell('completedAt').numFmt = 'dd mmm yyyy hh:mm';
  });

  // ── 4. Assessor comments ─────────────────────────────────────────
  // The evidence behind the scores, which is the part a reader most often
  // wants alongside the numbers and cannot get out of a chart.
  const commentSheet = addSheet('Assessor comments', [
    { header: 'Activity', key: 'activity', width: 34 },
    { header: 'Code', key: 'code', width: 8 },
    { header: 'Competency', key: 'competency', width: 30 },
    { header: 'Sub-competency', key: 'subCompetency', width: 34 },
    { header: 'Assessor', key: 'assessor', width: 20 },
    { header: 'Comment', key: 'comment', width: 80 },
  ]);

  activities.forEach((activity) => {
    competencies.forEach((competency) => {
      assessors.forEach((assessor) => {
        assessorCompetencyComments(assessor, activity.activityId, competency).forEach((entry) => {
          commentSheet.addRow({
            activity: activity.name,
            code: competency.code,
            competency: competency.label,
            subCompetency: entry.subCompetency,
            assessor: assessor.name,
            comment: entry.comment,
          });
        });
      });
    });
  });

  if (commentSheet.rowCount === 1) {
    commentSheet.addRow({ activity: 'No comments recorded.' });
  }

  // ── Download ─────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const slug = (participant.name || 'participant')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug || 'participant'}-overview-${exportedAt.toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
