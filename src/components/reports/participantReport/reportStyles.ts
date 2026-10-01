/**
 * Styling for the participant report document.
 *
 * The report is printed through the browser, so the page is laid out at A4
 * width and every section that must start on a fresh sheet carries
 * `page-break`. Colours and type follow the Breakfree report design: navy for
 * structure, teal for application/strengths, amber for development.
 */

export const NAVY = '#1B2B4B';
export const TEAL = '#2A9D8F';
export const AMBER = '#E9A23B';
export const RED = '#C44E52';
export const INK = '#374151';
export const MUTED = '#6b7280';
export const LINE = '#e5e7eb';

/** Band → the fill used in the matrix and on pills. */
export const BAND_FILL: Record<string, string> = {
  Outstanding: '#1F7A6D',
  Strong: '#2A9D8F',
  Proficient: '#A8DCD4',
  Developing: '#E3F2EF',
  'Needs Focus': '#FBE3E1',
};

export const BAND_TEXT: Record<string, string> = {
  Outstanding: '#ffffff',
  Strong: '#ffffff',
  Proficient: '#14564C',
  Developing: '#14564C',
  'Needs Focus': '#8C2F28',
};

export const PRIORITY_STYLE: Record<string, { bg: string; fg: string }> = {
  HIGH: { bg: '#FBE3E1', fg: '#A33A32' },
  MEDIUM: { bg: '#FDF1DD', fg: '#8A5A12' },
  LOW: { bg: '#EDF2F7', fg: '#44556B' },
};

export const ALIGNMENT_STYLE: Record<string, { bg: string; fg: string; border: string }> = {
  Aligned: { bg: '#ffffff', fg: NAVY, border: '#cbd5e1' },
  'Needs Grounding': { bg: '#ffffff', fg: NAVY, border: NAVY },
  'Needs Practice': { bg: '#ffffff', fg: NAVY, border: NAVY },
};

export const REPORT_CSS = `
  .report-root {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: ${INK};
    line-height: 1.6;
    background: #fff;
    max-width: 794px;   /* A4 at 96dpi */
    margin: 0 auto;
  }
  .report-root .sheet {
    position: relative;
    min-height: 1010px;
    padding: 38px 48px 64px;
    display: flex;
    flex-direction: column;
  }
  .report-root .page-break { page-break-before: always; break-before: page; }
  .report-root .avoid-break { page-break-inside: avoid; break-inside: avoid; }

  .report-root .running-head {
    text-align: right;
    font-size: 9.5px;
    letter-spacing: 2.4px;
    color: #9aa6b2;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  /* Screen only: the running footer is a print device. */
  .report-root .running-footer { display: none; }
  .report-root .sheet-footer {
    position: absolute;
    left: 52px;
    right: 52px;
    bottom: 26px;
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    color: #9aa6b2;
    border-top: 1px solid ${LINE};
    padding-top: 8px;
  }

  .report-root h1.doc-title {
    font-size: 38px;
    line-height: 1.2;
    font-weight: 400;
    color: ${NAVY};
    margin: 0 0 10px;
  }
  .report-root h2.section-head {
    font-size: 24px;
    font-weight: 700;
    color: ${NAVY};
    margin: 0 0 3px;
  }
  .report-root h3.block-head {
    font-size: 14px;
    font-weight: 700;
    color: ${NAVY};
    margin: 0 0 6px;
  }
  .report-root .rule {
    height: 2px;
    background: ${TEAL};
    margin: 10px 0 16px;
  }
  .report-root .rule-short { width: 64px; height: 3px; background: ${TEAL}; margin: 26px 0; }

  .report-root .meta-item {
    border-left: 3px solid ${TEAL};
    padding-left: 12px;
    margin-bottom: 18px;
  }
  .report-root .meta-label {
    font-size: 9.5px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: ${MUTED};
    margin-bottom: 3px;
  }
  .report-root .meta-value { font-size: 13.5px; font-weight: 600; color: ${NAVY}; }

  .report-root .pill {
    display: inline-block;
    border-radius: 999px;
    padding: 3px 12px;
    font-size: 10.5px;
    font-weight: 700;
    white-space: nowrap;
  }
  .report-root .pill-outline {
    display: inline-block;
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 10.5px;
    font-weight: 600;
    background: #fff;
  }

  .report-root table.matrix { width: 100%; border-collapse: collapse; font-size: 11px; }
  .report-root table.matrix th {
    background: ${NAVY};
    color: #fff;
    font-weight: 600;
    padding: 8px;
    text-align: center;
    font-size: 10.5px;
  }
  .report-root table.matrix th.left { text-align: left; }
  .report-root table.matrix td { padding: 5px 8px; text-align: center; border-bottom: 1px solid #f1f5f9; }
  .report-root table.matrix td.left { text-align: left; }
  .report-root table.matrix tr.group td { background: #EEF2F7; font-weight: 700; color: ${NAVY}; }

  .report-root .callout {
    border-radius: 10px;
    padding: 12px 15px;
    font-size: 12px;
    line-height: 1.58;
  }
  .report-root .callout-strength { background: #F2FAF8; border-left: 4px solid ${TEAL}; }
  .report-root .callout-development { background: #FEF8EE; border-left: 4px solid ${AMBER}; }
  .report-root .callout-plain { background: #fff; border: 1px solid ${LINE}; }
  .report-root .callout-summary { background: #F8FAFC; border: 1px solid ${LINE}; border-left: 4px solid ${TEAL}; }

  @media print {
    /* Scaled slightly so each section lands on a single sheet. Cheaper than
       shrinking every type size by hand, and it keeps the proportions. */
    .report-root { max-width: none; zoom: 0.92; }
    /* A4 (297mm) less the 12mm page margins, with room for the footer. The
       sheet is sized to the printable area so the footer lands at the bottom
       of its own page instead of being pushed onto the next one. */
    .report-root .sheet {
      position: relative;
      min-height: 278mm;   /* printable height ÷ the zoom above */
      padding: 0 0 14mm;
    }
    .report-root .sheet + .sheet { page-break-before: always; }
    .report-root .sheet:last-child { page-break-after: avoid; }
    /* One running footer, repeated by the browser on every printed page.
       Per-sheet footers are hidden: a section that runs to two pages would
       otherwise strand its footer halfway down the second one. */
    .report-root .sheet-footer { display: none; }
    .report-root .running-footer {
      display: block;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      font-size: 9.5px;
      color: #9aa6b2;
      border-top: 1px solid ${LINE};
      padding-top: 6px;
    }
    /* A heading should never be the last thing on a page. */
    .report-root h3.block-head { page-break-after: avoid; break-after: avoid; }
    .report-root table.matrix tr { page-break-inside: avoid; break-inside: avoid; }
  }
`;
