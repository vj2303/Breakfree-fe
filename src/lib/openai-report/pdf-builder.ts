/**
 * Professional PDF builder matching Breakfree Consulting reference design.
 * Uses jsPDF to render a multi-page assessment report.
 */
import { jsPDF } from "jspdf";
import type { CompetencyProfilesResponse, AIInsightsResponse, RecommendationsResponse } from "./validators";
import type { GeneratedReport, ReportInput } from "./generator";

// ─── Design System ───────────────────────────────────────────────────────────

const C = {
  NAVY: [27, 43, 75] as const,        // header bg, dark text
  TEAL: [42, 157, 143] as const,      // accent, proficient badge
  ORANGE: [233, 162, 59] as const,    // developing badge, dev areas
  RED: [196, 78, 82] as const,        // needs focus badge
  DARK_GRAY: [55, 65, 81] as const,   // body text
  MID_GRAY: [107, 114, 128] as const, // secondary text
  LIGHT_GRAY: [243, 244, 246] as const,// section bg
  BORDER: [229, 231, 235] as const,   // borders
  WHITE: [255, 255, 255] as const,
  BLACK: [0, 0, 0] as const,
  TEAL_LIGHT: [236, 253, 245] as const,
  ORANGE_LIGHT: [255, 247, 237] as const,
  RED_LIGHT: [254, 242, 242] as const,
};

type RGB = readonly [number, number, number];

interface ParticipantMeta {
  name: string;
  designation?: string;
  department?: string;
  location?: string;
  batch?: string;
  manager?: string;
  assessmentName?: string;
  assessmentDate?: string;
}

interface CompetencyScore {
  name: string;
  score: number;
  readiness?: number;
  application?: number;
  subCompetencies?: Array<{ name: string; score: number }>;
}

export interface PdfBuildOptions {
  participant: ParticipantMeta;
  report: GeneratedReport;
  input: ReportInput;
  competencyScores: CompetencyScore[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRatingLabel(score: number): string {
  if (score >= 4.5) return "Outstanding";
  if (score >= 3.5) return "Strong";
  if (score >= 2.5) return "Proficient";
  if (score >= 1.5) return "Developing";
  return "Needs Focus";
}

function getRatingColor(score: number): RGB {
  if (score >= 3.5) return C.TEAL;
  if (score >= 2.5) return C.TEAL;
  if (score >= 1.5) return C.ORANGE;
  return C.RED;
}

function getRatingBgColor(score: number): RGB {
  if (score >= 2.5) return C.TEAL;
  if (score >= 1.5) return C.ORANGE;
  return C.RED;
}

class ReportPdfBuilder {
  private doc: jsPDF;
  private pageNum = 0;
  private yPos = 0;
  private readonly pw: number;    // page width
  private readonly ph: number;    // page height
  private readonly m = 25;        // margin
  private readonly mw: number;    // max content width

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "a4" });
    this.pw = this.doc.internal.pageSize.getWidth();
    this.ph = this.doc.internal.pageSize.getHeight();
    this.mw = this.pw - 2 * this.m;
  }

  // ─── Low-level drawing ──────────────────────────────────────────────

  private setColor(c: RGB) {
    this.doc.setTextColor(c[0], c[1], c[2]);
  }

  private setFill(c: RGB) {
    this.doc.setFillColor(c[0], c[1], c[2]);
  }

  private setDraw(c: RGB) {
    this.doc.setDrawColor(c[0], c[1], c[2]);
  }

  private font(style: "normal" | "bold" | "italic" | "bolditalic", size: number) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
  }

  private text(t: string, x: number, y: number, opts?: { align?: "left" | "center" | "right"; maxWidth?: number }) {
    this.doc.text(t, x, y, opts);
  }

  private wrap(t: string, width: number): string[] {
    return this.doc.splitTextToSize(t, width);
  }

  private rect(x: number, y: number, w: number, h: number, style: "F" | "S" | "FD" = "F") {
    this.doc.rect(x, y, w, h, style);
  }

  private line(x1: number, y1: number, x2: number, y2: number) {
    this.doc.line(x1, y1, x2, y2);
  }

  private roundedRect(x: number, y: number, w: number, h: number, r: number, style: "F" | "S" | "FD" = "F") {
    // jsPDF doesn't have roundedRect natively, use rect with clip
    this.doc.roundedRect(x, y, w, h, r, r, style);
  }

  // ─── Page management ────────────────────────────────────────────────

  private newPage() {
    if (this.pageNum > 0) {
      this.doc.addPage();
    }
    this.pageNum++;
    this.yPos = this.m;
  }

  private checkPage(needed: number = 40): boolean {
    if (this.yPos + needed > this.ph - 40) {
      this.drawFooter();
      this.newPage();
      this.drawPageHeader();
      return true;
    }
    return false;
  }

  private participantName = "";
  private assessmentName = "";

  private drawPageHeader() {
    // thin top bar
    this.setFill(C.NAVY);
    this.rect(0, 0, this.pw, 3);

    // header text
    this.setColor(C.MID_GRAY);
    this.font("normal", 7.5);
    this.text(`Confidential — ${this.participantName} | ${this.assessmentName}`, this.m, 20);
    this.text(`Page ${this.pageNum}`, this.pw - this.m, 20, { align: "right" });

    // separator line
    this.setDraw(C.BORDER);
    this.doc.setLineWidth(0.5);
    this.line(this.m, 28, this.pw - this.m, 28);
    this.yPos = 50;
  }

  private drawFooter() {
    // nothing needed — header has page numbers
  }

  // ─── Section helpers ────────────────────────────────────────────────

  private sectionTitle(title: string, color: RGB = C.TEAL) {
    this.checkPage(50);
    this.setColor(C.NAVY);
    this.font("bold", 20);
    this.text(title, this.m, this.yPos);
    this.yPos += 8;

    this.setDraw(color);
    this.doc.setLineWidth(2);
    this.line(this.m, this.yPos, this.pw - this.m, this.yPos);
    this.yPos += 15;
  }

  private subTitle(title: string) {
    this.checkPage(30);
    this.setColor(C.NAVY);
    this.font("bold", 14);
    this.text(title, this.m, this.yPos);
    this.yPos += 15;
  }

  private bodyText(t: string, indent: number = 0) {
    this.setColor(C.DARK_GRAY);
    this.font("normal", 9.5);
    const lines = this.wrap(t, this.mw - indent);
    for (const line of lines) {
      this.checkPage(12);
      this.text(line, this.m + indent, this.yPos);
      this.yPos += 13;
    }
  }

  private italicText(t: string) {
    this.setColor(C.MID_GRAY);
    this.font("italic", 9.5);
    const lines = this.wrap(t, this.mw);
    for (const line of lines) {
      this.checkPage(12);
      this.text(line, this.m, this.yPos);
      this.yPos += 13;
    }
  }

  private drawRatingBadge(x: number, y: number, score: number, w: number = 72, h: number = 20) {
    const label = getRatingLabel(score);
    const color = getRatingBgColor(score);
    this.setFill(color);
    this.roundedRect(x, y, w, h, 4, "F");
    this.setColor(C.WHITE);
    this.font("bold", 8);
    this.text(label, x + w / 2, y + h / 2 + 3, { align: "center" });
  }

  private drawPerformanceBar(x: number, y: number, w: number, score: number, maxScore: number = 5) {
    const barH = 14;
    // bg
    this.setFill(C.BORDER);
    this.roundedRect(x, y, w, barH, 3, "F");
    // filled
    const fillW = Math.max(0, Math.min(1, score / maxScore)) * w;
    if (fillW > 0) {
      const color = getRatingColor(score);
      this.setFill(color);
      this.roundedRect(x, y, fillW, barH, 3, "F");
    }
    // score text
    this.setColor(C.DARK_GRAY);
    this.font("bold", 8);
    this.text(`${score.toFixed(1)}/${maxScore}`, x + w + 8, y + barH / 2 + 3);
  }

  // ─── PAGE 1: Cover ──────────────────────────────────────────────────

  private drawCoverPage(p: ParticipantMeta) {
    this.newPage();

    // Dark navy header band
    this.setFill(C.NAVY);
    this.rect(0, 0, this.pw, 80);
    this.setColor(C.WHITE);
    this.font("bold", 10);
    this.text("B R E A K F R E E   C O N S U L T I N G", this.m, 45);

    // Title
    this.yPos = 150;
    this.setColor(C.NAVY);
    this.font("normal", 32);
    this.text("Leadership Assessment", this.m, this.yPos);
    this.yPos += 40;
    this.text("Centre Report", this.m, this.yPos);
    this.yPos += 30;

    // Subtitle
    this.setColor(C.MID_GRAY);
    this.font("normal", 13);
    this.text(this.assessmentName, this.m, this.yPos);
    this.yPos += 30;

    // Accent line
    this.setFill(C.TEAL);
    this.rect(this.m, this.yPos, 60, 4);
    this.yPos += 40;

    // Participant name
    this.setColor(C.NAVY);
    this.font("bold", 24);
    this.text(p.name || "Participant", this.m, this.yPos);
    this.yPos += 20;

    // Designation
    if (p.designation || p.department) {
      this.setColor(C.MID_GRAY);
      this.font("normal", 11);
      const parts = [p.designation, p.department].filter(Boolean);
      this.text(parts.join(" · "), this.m, this.yPos);
      this.yPos += 30;
    } else {
      this.yPos += 15;
    }

    // Meta grid
    const metaItems = [
      { label: "LOCATION", value: p.location || "—" },
      { label: "BATCH", value: p.batch || "—" },
      { label: "MANAGER", value: p.manager || "—" },
      { label: "ASSESSMENT", value: `${p.assessmentName || "—"} — ${p.assessmentDate || new Date().getFullYear()}` },
    ];

    const colW = this.mw / 2;
    for (let i = 0; i < metaItems.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = this.m + col * colW;
      const y = this.yPos + row * 45;

      // left accent bar
      this.setFill(C.TEAL);
      this.rect(x, y, 3, 30);

      this.setColor(C.MID_GRAY);
      this.font("bold", 7.5);
      this.text(metaItems[i].label, x + 12, y + 10);
      this.setColor(C.NAVY);
      this.font("bold", 10);
      this.text(metaItems[i].value, x + 12, y + 24);
    }

    this.yPos += 110;

    // AI-Enhanced badge at bottom
    const badgeY = this.ph - 70;
    this.setDraw(C.BORDER);
    this.doc.setLineWidth(0.5);
    this.line(this.m, badgeY - 10, this.pw - this.m, badgeY - 10);

    this.setColor(C.TEAL);
    this.font("bold", 10);
    this.text("✦  AI-Enhanced Report", this.m + 30, badgeY + 5);
    this.setColor(C.MID_GRAY);
    this.font("normal", 8);
    this.text("Includes predictive indicators, behavioural archetype & cross-competency pattern analysis", this.m + 30, badgeY + 18);
  }

  // ─── PAGE 2: Introduction ───────────────────────────────────────────

  private drawIntroPage(input: ReportInput) {
    this.newPage();
    this.drawPageHeader();

    this.sectionTitle("Introduction");

    // Intro text with bold exercise names
    this.setColor(C.DARK_GRAY);
    this.font("normal", 10);
    const activities = input.programme.activities.join(", ");
    const introText = `This report presents findings from the ${input.programme.name}. It is based on structured observations by trained assessors across the exercises: ${activities}. Behaviours are rated using Behaviourally Anchored Rating Scales (BARS) on a 1–5 scale.`;
    const introLines = this.wrap(introText, this.mw);
    for (const line of introLines) {
      this.text(line, this.m, this.yPos);
      this.yPos += 14;
    }
    this.yPos += 20;

    // BARS scale boxes
    const scales = [
      { num: "1", label: "NEEDS\nFOCUS", color: C.RED },
      { num: "2", label: "DEVELOPING", color: C.ORANGE },
      { num: "3", label: "PROFICIENT", color: [140, 140, 140] as RGB },
      { num: "4", label: "STRONG", color: C.TEAL },
      { num: "5", label: "OUTSTANDING", color: C.NAVY },
    ];
    const boxW = (this.mw - 20) / 5;
    const boxH = 65;

    for (let i = 0; i < scales.length; i++) {
      const x = this.m + i * (boxW + 5);
      this.setFill(scales[i].color);
      this.roundedRect(x, this.yPos, boxW, boxH, 4, "F");

      this.setColor(C.WHITE);
      this.font("bold", 24);
      this.text(scales[i].num, x + boxW / 2, this.yPos + 28, { align: "center" });
      this.font("bold", 7);
      const labelLines = scales[i].label.split("\n");
      labelLines.forEach((l, li) => {
        this.text(l, x + boxW / 2, this.yPos + 42 + li * 10, { align: "center" });
      });
    }
    this.yPos += boxH + 30;

    // Confidentiality note
    this.setFill(C.LIGHT_GRAY);
    this.roundedRect(this.m, this.yPos, this.mw, 55, 4, "F");
    this.setColor(C.DARK_GRAY);
    this.font("bold", 9);
    this.text("Note:", this.m + 12, this.yPos + 18);
    this.font("normal", 9);
    const noteLines = this.wrap(
      "This report is confidential (shelf-life 18–24 months). It reflects behaviours observed during assessment exercises only and does not constitute a performance appraisal. Please discuss findings with your HR Business Partner.",
      this.mw - 30
    );
    noteLines.forEach((l, i) => {
      this.text(l, this.m + 12, this.yPos + 18 + (i + 1) * 12);
    });
  }

  // ─── PAGE 3: Competency Summary ─────────────────────────────────────

  private drawCompetencySummaryPage(competencies: CompetencyScore[]) {
    this.newPage();
    this.drawPageHeader();

    this.sectionTitle("Competency Summary");

    this.setColor(C.MID_GRAY);
    this.font("normal", 9);
    this.text("Scores averaged across all activities and assessors.", this.m, this.yPos);
    this.yPos += 20;

    // Table header
    const colX = [this.m, this.m + 180, this.m + 240, this.m + 330];
    const colLabels = ["COMPETENCY", "SCORE", "RATING", "PERFORMANCE"];
    this.setFill(C.NAVY);
    this.rect(this.m, this.yPos, this.mw, 24, "F");
    this.setColor(C.WHITE);
    this.font("bold", 8);
    colLabels.forEach((label, i) => {
      this.text(label, colX[i] + 8, this.yPos + 16);
    });
    this.yPos += 30;

    // Table rows
    for (const comp of competencies) {
      this.checkPage(35);
      const rowY = this.yPos;

      // separator
      this.setDraw(C.BORDER);
      this.doc.setLineWidth(0.5);
      this.line(this.m, rowY, this.pw - this.m, rowY);

      // name
      this.setColor(C.DARK_GRAY);
      this.font("normal", 10);
      this.text(comp.name, colX[0] + 8, rowY + 18);

      // score
      this.font("bold", 11);
      this.text(comp.score.toFixed(1), colX[1] + 15, rowY + 18);

      // rating badge
      this.drawRatingBadge(colX[2] + 5, rowY + 5, comp.score);

      // performance bar
      this.drawPerformanceBar(colX[3] + 5, rowY + 7, 140, comp.score);

      this.yPos += 35;
    }

    this.yPos += 25;

    // Bottom boxes: Top Competencies, Potential Strengths, Areas of Development
    const sorted = [...competencies].sort((a, b) => b.score - a.score);
    const topComps = sorted.slice(0, 1).map(c => c.name);
    const strengths = sorted.filter(c => c.score >= 2.5).slice(0, 3).map(c => c.name);
    const devAreas = sorted.filter(c => c.score < 3.0).slice(-2).map(c => c.name);

    this.checkPage(100);
    const boxW = (this.mw - 20) / 3;
    const boxH = 90;
    const boxes = [
      { title: "Top Competencies", icon: "★", items: topComps, borderColor: C.TEAL },
      { title: "Potential Strengths", icon: "■", items: strengths, borderColor: C.TEAL },
      { title: "Areas of Development", icon: "↑", items: devAreas, borderColor: C.ORANGE },
    ];

    for (let i = 0; i < boxes.length; i++) {
      const x = this.m + i * (boxW + 10);
      const y = this.yPos;

      // border top
      this.setFill(boxes[i].borderColor);
      this.rect(x, y, boxW, 3);

      // box bg
      this.setFill(C.LIGHT_GRAY);
      this.rect(x, y + 3, boxW, boxH - 3);

      // title
      this.setColor(C.NAVY);
      this.font("bold", 9);
      this.text(`${boxes[i].icon}  ${boxes[i].title}`, x + 10, y + 22);

      // items
      this.setColor(C.DARK_GRAY);
      this.font("normal", 9);
      boxes[i].items.forEach((item, idx) => {
        this.text(`• ${item}`, x + 15, y + 40 + idx * 15);
      });
    }

    this.yPos += boxH + 15;
  }

  // ─── PAGE 4-5: Overall Strengths & Development ──────────────────────

  private drawOverallStrengthsDevelopment(profiles: CompetencyProfilesResponse) {
    this.newPage();
    this.drawPageHeader();

    this.sectionTitle("Overall Strengths & Development Areas");

    this.setColor(C.MID_GRAY);
    this.font("normal", 9);
    this.text("Synthesised themes observed across all exercises and assessors.", this.m, this.yPos);
    this.yPos += 20;

    // Overall intro in gray box
    this.checkPage(60);
    const introLines = this.wrap(profiles.overall_intro, this.mw - 24);
    const introH = introLines.length * 14 + 20;
    this.setFill(C.LIGHT_GRAY);
    this.roundedRect(this.m, this.yPos, this.mw, introH, 4, "F");
    this.setColor(C.DARK_GRAY);
    this.font("italic", 9.5);
    introLines.forEach((line, i) => {
      this.text(line, this.m + 12, this.yPos + 16 + i * 14);
    });
    this.yPos += introH + 20;

    // Overall Strengths
    this.subTitle("Overall Strengths");
    for (const s of profiles.overall_strengths) {
      this.checkPage(80);
      // Icon + title
      this.setColor(C.TEAL);
      this.font("bold", 10);
      this.text("✦", this.m + 8, this.yPos);
      this.setColor(C.NAVY);
      this.font("bold", 11);
      this.text(s.title, this.m + 25, this.yPos);
      this.yPos += 15;

      // Body
      this.bodyText(s.body, 8);
      this.yPos += 10;
    }

    // Overall Development Areas
    this.yPos += 5;
    this.subTitle("Overall Development Areas");
    for (const d of profiles.overall_development_areas) {
      this.checkPage(80);
      // Icon + title
      this.setColor(C.ORANGE);
      this.font("bold", 10);
      this.text("▲", this.m + 8, this.yPos);
      this.setColor(C.NAVY);
      this.font("bold", 11);
      this.text(d.title, this.m + 25, this.yPos);
      this.yPos += 15;

      // Body
      this.bodyText(d.body, 8);
      this.yPos += 10;
    }
  }

  // ─── PAGE 6: Readiness vs Application ───────────────────────────────

  private drawReadinessVsApplication(competencies: CompetencyScore[]) {
    this.newPage();
    this.drawPageHeader();

    this.sectionTitle("Readiness vs. Application Analysis");

    this.setColor(C.DARK_GRAY);
    this.font("normal", 9.5);
    const desc = "Application = behaviours observed in assessment exercises. Readiness = self-reported knowledge. Readiness exceeding Application → knows what good looks like, needs practice applying it. Application exceeding Readiness → performing naturally, needs theoretical grounding.";
    const descLines = this.wrap(desc, this.mw);
    descLines.forEach(l => {
      this.text(l, this.m, this.yPos);
      this.yPos += 13;
    });
    this.yPos += 20;

    // Bar chart
    const chartX = this.m + 30;
    const chartW = this.mw - 60;
    const chartH = 160;
    const chartY = this.yPos;
    const maxVal = 5;

    // Chart box
    this.setFill(C.WHITE);
    this.setDraw(C.BORDER);
    this.doc.setLineWidth(0.5);
    this.rect(this.m, chartY - 10, this.mw, chartH + 50, "S");

    // Y-axis grid
    for (let i = 0; i <= 5; i++) {
      const lineY = chartY + chartH - (i / maxVal) * chartH;
      this.setDraw([230, 230, 230] as unknown as RGB);
      this.doc.setLineWidth(0.3);
      this.line(chartX, lineY, chartX + chartW, lineY);
      this.setColor(C.MID_GRAY);
      this.font("normal", 7);
      this.text(i.toString(), chartX - 12, lineY + 3);
    }

    // Bars
    const groupW = chartW / competencies.length;
    const barW = Math.min(28, groupW / 2 - 4);

    // Legend
    this.setFill(C.NAVY);
    this.rect(chartX + chartW - 160, chartY - 5, 10, 10, "F");
    this.setColor(C.DARK_GRAY);
    this.font("normal", 7.5);
    this.text("Application (observed)", chartX + chartW - 145, chartY + 3);
    this.setFill([173, 198, 219] as unknown as RGB);
    this.rect(chartX + chartW - 70, chartY - 5, 10, 10, "F");
    this.text("Readiness (SJT)", chartX + chartW - 55, chartY + 3);

    competencies.forEach((comp, idx) => {
      const cx = chartX + idx * groupW + groupW / 2;
      const app = comp.application ?? comp.score;
      const rdy = comp.readiness ?? comp.score;

      // Application bar (dark)
      const appH = (app / maxVal) * chartH;
      this.setFill(C.NAVY);
      this.rect(cx - barW - 2, chartY + chartH - appH, barW, appH, "F");
      this.setColor(C.WHITE);
      this.font("bold", 7.5);
      if (appH > 15) this.text(app.toFixed(1), cx - barW / 2 - 2, chartY + chartH - appH + 12, { align: "center" });

      // Readiness bar (light blue)
      const rdyH = (rdy / maxVal) * chartH;
      this.setFill([173, 198, 219] as unknown as RGB);
      this.rect(cx + 2, chartY + chartH - rdyH, barW, rdyH, "F");
      this.setColor(C.NAVY);
      this.font("bold", 7.5);
      if (rdyH > 15) this.text(rdy.toFixed(0), cx + barW / 2 + 2, chartY + chartH - rdyH + 12, { align: "center" });

      // X label
      this.setColor(C.DARK_GRAY);
      this.font("normal", 7.5);
      const nameLines = this.wrap(comp.name, groupW - 10);
      nameLines.forEach((l, li) => {
        this.text(l, cx, chartY + chartH + 12 + li * 9, { align: "center" });
      });
    });

    this.yPos = chartY + chartH + 60;

    // Gap table
    this.checkPage(40 + competencies.length * 30);
    const tColX = [this.m, this.m + 150, this.m + 230, this.m + 300, this.m + 345];
    const tLabels = ["COMPETENCY", "APPLICATION", "READINESS", "GAP", "IMPLICATION"];

    this.setFill(C.NAVY);
    this.rect(this.m, this.yPos, this.mw, 22, "F");
    this.setColor(C.WHITE);
    this.font("bold", 7.5);
    tLabels.forEach((label, i) => {
      this.text(label, tColX[i] + 8, this.yPos + 15);
    });
    this.yPos += 26;

    competencies.forEach((comp) => {
      this.checkPage(30);
      const rowY = this.yPos;
      const app = comp.application ?? comp.score;
      const rdy = comp.readiness ?? comp.score;
      const gap = (app - rdy);
      const implication = Math.abs(gap) <= 0.3
        ? "Well aligned — sustain current approach"
        : gap > 0
          ? "Behaviour ahead — build theoretical grounding"
          : "Knowledge ahead — focus on practical application";

      this.setDraw(C.BORDER);
      this.doc.setLineWidth(0.5);
      this.line(this.m, rowY, this.pw - this.m, rowY);

      this.setColor(C.DARK_GRAY);
      this.font("normal", 9);
      this.text(comp.name, tColX[0] + 8, rowY + 16);
      this.font("bold", 9);
      this.text(app.toFixed(1), tColX[1] + 20, rowY + 16);
      this.text(rdy.toFixed(0), tColX[2] + 20, rowY + 16);

      this.setColor(gap < 0 ? C.RED : gap > 0.3 ? C.TEAL : C.DARK_GRAY);
      this.text(gap.toFixed(1), tColX[3] + 15, rowY + 16);

      this.setColor(C.DARK_GRAY);
      this.font("normal", 8);
      const impLines = this.wrap(implication, this.pw - this.m - tColX[4] - 10);
      impLines.forEach((l, i) => {
        this.text(l, tColX[4] + 8, rowY + 12 + i * 10);
      });
      this.yPos += Math.max(28, impLines.length * 10 + 14);
    });
  }

  // ─── PAGE 7-9: Detailed Competency Profiles ─────────────────────────

  private drawDetailedCompetencyProfiles(
    profiles: CompetencyProfilesResponse,
    competencies: CompetencyScore[]
  ) {
    this.newPage();
    this.drawPageHeader();
    this.sectionTitle("Detailed Competency Profiles");

    this.setColor(C.MID_GRAY);
    this.font("normal", 9);
    this.text("Sub-competency scores and synthesised observations for each competency cluster.", this.m, this.yPos);
    this.yPos += 25;

    for (const profile of profiles.competency_profiles) {
      const compScore = competencies.find(c => c.name === profile.competency_name);
      const score = compScore?.score ?? 3;

      this.checkPage(200);

      // Competency header bar
      this.setFill(C.LIGHT_GRAY);
      this.roundedRect(this.m, this.yPos, this.mw, 35, 4, "F");
      this.setColor(C.NAVY);
      this.font("bold", 14);
      this.text(profile.competency_name, this.m + 12, this.yPos + 22);

      // Score + badge
      this.font("bold", 14);
      this.text(`${score.toFixed(1)}/5`, this.pw - this.m - 110, this.yPos + 22);
      this.drawRatingBadge(this.pw - this.m - 78, this.yPos + 8, score);

      this.yPos += 45;

      // Sub-competency scores
      if (compScore?.subCompetencies && compScore.subCompetencies.length > 0) {
        const subW = Math.min(160, (this.mw - 20) / compScore.subCompetencies.length);
        this.checkPage(30);

        this.setDraw(C.BORDER);
        this.doc.setLineWidth(0.5);
        this.line(this.m + 8, this.yPos, this.pw - this.m - 8, this.yPos);
        this.yPos += 12;

        compScore.subCompetencies.forEach((sub, i) => {
          const x = this.m + 12 + i * subW;
          this.setColor(C.NAVY);
          this.font("bold", 8.5);
          const subNameLines = this.wrap(sub.name, subW - 15);
          subNameLines.forEach((l, li) => {
            this.text(l, x, this.yPos + li * 10);
          });
          this.font("normal", 9);
          this.text(`${sub.score.toFixed(1)}/5`, x + subW - 40, this.yPos);
        });
        this.yPos += 25;
      }

      // Observed Strengths
      this.checkPage(40);
      this.setFill(C.TEAL);
      this.rect(this.m + 8, this.yPos, 3, 14);
      this.setColor(C.TEAL);
      this.font("bold", 10);
      this.text("✦  Observed Strengths", this.m + 18, this.yPos + 11);
      this.yPos += 20;

      this.bodyText(profile.strengths, 8);
      this.yPos += 12;

      // Areas for Development
      this.checkPage(40);
      this.setFill(C.ORANGE);
      this.rect(this.m + 8, this.yPos, 3, 14);
      this.setColor(C.ORANGE);
      this.font("bold", 10);
      this.text("▲  Areas for Development", this.m + 18, this.yPos + 11);
      this.yPos += 20;

      this.bodyText(profile.development, 8);
      this.yPos += 30;
    }
  }

  // ─── PAGE 10: AI-Powered Insights ───────────────────────────────────

  private drawAIInsightsPage(insights: AIInsightsResponse) {
    this.newPage();
    this.drawPageHeader();

    // Title with AI badge
    this.setColor(C.NAVY);
    this.font("bold", 20);
    this.text("AI-Powered Insights", this.m, this.yPos);
    this.setColor(C.TEAL);
    this.font("bold", 10);
    this.text("✦ Claude AI", this.m + 215, this.yPos);
    this.yPos += 8;
    this.setDraw(C.TEAL);
    this.doc.setLineWidth(2);
    this.line(this.m, this.yPos, this.pw - this.m, this.yPos);
    this.yPos += 15;

    this.setColor(C.DARK_GRAY);
    this.font("normal", 9);
    const aiIntro = "The following insights are generated by AI analysis of the full competency data, assessor observations, and readiness scores. They identify cross-competency patterns, behavioural archetypes, and forward-looking performance indicators that go beyond individual competency feedback.";
    const aiLines = this.wrap(aiIntro, this.mw);
    aiLines.forEach(l => { this.text(l, this.m, this.yPos); this.yPos += 12; });
    this.yPos += 15;

    // Behavioural Archetype section
    this.subTitle("Behavioural Archetype");
    this.yPos += 5;

    // Archetype card
    this.checkPage(80);
    this.setFill(C.LIGHT_GRAY);
    this.roundedRect(this.m, this.yPos, this.mw, 65, 6, "F");
    this.setColor(C.NAVY);
    this.font("bold", 18);
    this.text(insights.archetype.name, this.m + 15, this.yPos + 28);
    this.setColor(C.DARK_GRAY);
    this.font("normal", 9);
    const archLines = this.wrap(insights.archetype.description, this.mw - 30);
    archLines.forEach((l, i) => {
      this.text(l, this.m + 15, this.yPos + 42 + i * 11);
    });
    this.yPos += 80;

    // Three columns: Core Strengths, Watch-outs, Deployment Fit
    this.checkPage(130);
    const colW = (this.mw - 20) / 3;
    const colH = 140;
    const cols = [
      {
        title: "CORE STRENGTHS",
        items: insights.archetype.core_strengths,
        icon: "✦",
        iconColor: C.TEAL,
      },
      {
        title: "WATCH-OUTS",
        items: insights.archetype.watchouts,
        icon: "▲",
        iconColor: C.ORANGE,
      },
      {
        title: "DEPLOYMENT FIT",
        items: [
          `Best in: ${insights.archetype.deployment_best}`,
          `Approach carefully: ${insights.archetype.deployment_caution}`,
        ],
        icon: "",
        iconColor: C.NAVY,
      },
    ];

    for (let i = 0; i < cols.length; i++) {
      const x = this.m + i * (colW + 10);
      const y = this.yPos;

      this.setFill(C.WHITE);
      this.setDraw(C.BORDER);
      this.doc.setLineWidth(0.5);
      this.roundedRect(x, y, colW, colH, 4, "FD");

      this.setColor(C.NAVY);
      this.font("bold", 8);
      this.text(cols[i].title, x + 12, y + 20);

      this.setColor(C.DARK_GRAY);
      this.font("normal", 8.5);
      let itemY = y + 36;
      cols[i].items.forEach(item => {
        const prefix = cols[i].icon ? `${cols[i].icon}  ` : "";
        if (cols[i].icon) {
          this.setColor(cols[i].iconColor);
          this.text(cols[i].icon, x + 12, itemY);
          this.setColor(C.DARK_GRAY);
        }
        const iLines = this.wrap(item, colW - 35);
        iLines.forEach((l, li) => {
          this.text(l, x + (prefix ? 25 : 12), itemY + li * 11);
        });
        itemY += iLines.length * 11 + 6;
      });
    }
    this.yPos += colH + 25;

    // Cross-Competency Patterns
    this.checkPage(40);
    this.subTitle("Cross-Competency Pattern Analysis");
    this.setColor(C.MID_GRAY);
    this.font("italic", 9);
    this.text("AI analysis of how competency combinations interact — moving beyond siloed scores to identify systemic leadership dynamics.", this.m, this.yPos);
    this.yPos += 20;

    for (const p of insights.cross_competency_patterns) {
      this.checkPage(70);
      this.setColor(C.NAVY);
      this.font("bold", 11);
      this.text(p.title, this.m + 5, this.yPos);
      this.yPos += 14;

      this.bodyText(p.description);
      this.yPos += 5;

      this.setColor(C.RED);
      this.font("bold", 8);
      this.text("Risk:", this.m + 10, this.yPos);
      this.setColor(C.DARK_GRAY);
      this.font("normal", 8.5);
      this.text(p.risk, this.m + 40, this.yPos);
      this.yPos += 12;

      this.setColor(C.TEAL);
      this.font("bold", 8);
      this.text("Opportunity:", this.m + 10, this.yPos);
      this.setColor(C.DARK_GRAY);
      this.font("normal", 8.5);
      const oppLines = this.wrap(p.opportunity, this.mw - 80);
      oppLines.forEach((l, i) => {
        this.text(l, this.m + 75, this.yPos + i * 11);
      });
      this.yPos += oppLines.length * 11 + 15;
    }

    // Predictive Indicators
    this.checkPage(40);
    this.subTitle("Predictive Indicators");

    for (const pi of insights.predictive_indicators) {
      this.checkPage(45);
      const isRisk = pi.type === "RISK";
      const bgColor = isRisk ? C.RED_LIGHT : C.TEAL_LIGHT;
      const tagColor = isRisk ? C.RED : C.TEAL;

      this.setFill(bgColor);
      this.roundedRect(this.m, this.yPos, this.mw, 38, 4, "F");

      // Tag
      this.setFill(tagColor);
      this.roundedRect(this.m + 10, this.yPos + 6, 55, 14, 3, "F");
      this.setColor(C.WHITE);
      this.font("bold", 7);
      this.text(pi.type, this.m + 37, this.yPos + 15, { align: "center" });

      // Indicator text
      this.setColor(C.NAVY);
      this.font("bold", 9);
      this.text(pi.indicator, this.m + 72, this.yPos + 15);

      // Meta line
      this.setColor(C.MID_GRAY);
      this.font("normal", 7.5);
      this.text(`${pi.timeframe} | Likelihood: ${pi.likelihood}/10 | Mitigation: ${pi.mitigation}`, this.m + 12, this.yPos + 30);

      this.yPos += 44;
    }

    // Role Fit
    this.checkPage(70);
    this.yPos += 5;
    this.subTitle("Role Fit Assessment");

    this.setFill(C.LIGHT_GRAY);
    this.roundedRect(this.m, this.yPos, this.mw, 60, 4, "F");

    this.setColor(C.NAVY);
    this.font("bold", 11);
    this.text(insights.role_fit.title, this.m + 15, this.yPos + 18);

    // Fit scores
    const fitX = this.m + 15;
    this.font("bold", 22);
    this.text(insights.role_fit.current_fit.toString(), fitX, this.yPos + 45);
    this.font("normal", 8);
    this.text("Current", fitX, this.yPos + 55);

    this.setColor(C.TEAL);
    this.font("bold", 22);
    this.text(insights.role_fit.potential_fit.toString(), fitX + 70, this.yPos + 45);
    this.setColor(C.MID_GRAY);
    this.font("normal", 8);
    this.text("Potential", fitX + 70, this.yPos + 55);

    this.setColor(C.DARK_GRAY);
    this.font("normal", 8);
    this.text(`Timeline: ${insights.role_fit.timeline}`, fitX + 150, this.yPos + 45);

    this.yPos += 70;

    this.bodyText(insights.role_fit.narrative);
    this.yPos += 8;
    this.font("bold", 9);
    this.setColor(C.NAVY);
    this.text("Critical Gaps:", this.m, this.yPos);
    this.yPos += 12;
    for (const g of insights.role_fit.critical_gaps) {
      this.checkPage(12);
      this.setColor(C.DARK_GRAY);
      this.font("normal", 9);
      this.text(`• ${g}`, this.m + 10, this.yPos);
      this.yPos += 13;
    }
  }

  // ─── PAGE: 70-20-10 Recommendations ─────────────────────────────────

  private drawRecommendationsPage(recommendations: RecommendationsResponse) {
    this.newPage();
    this.drawPageHeader();

    this.sectionTitle("70-20-10 Development Plan");

    this.setColor(C.MID_GRAY);
    this.font("normal", 9);
    this.text("Targeted development actions across on-the-job (70%), coaching (20%), and formal learning (10%).", this.m, this.yPos);
    this.yPos += 25;

    for (const rec of recommendations.recommendations) {
      this.checkPage(120);

      // Competency header with priority
      const prioColor = rec.priority === "HIGH" ? C.RED : rec.priority === "MEDIUM" ? C.ORANGE : C.TEAL;
      this.setFill(C.LIGHT_GRAY);
      this.roundedRect(this.m, this.yPos, this.mw, 24, 4, "F");
      this.setColor(C.NAVY);
      this.font("bold", 11);
      this.text(rec.competency_name, this.m + 12, this.yPos + 16);

      // Priority badge
      this.setFill(prioColor);
      this.roundedRect(this.pw - this.m - 110, this.yPos + 4, 45, 16, 3, "F");
      this.setColor(C.WHITE);
      this.font("bold", 7);
      this.text(rec.priority, this.pw - this.m - 87, this.yPos + 14, { align: "center" });

      // Score
      this.setColor(C.DARK_GRAY);
      this.font("normal", 8);
      this.text(`Score: ${rec.score}`, this.pw - this.m - 55, this.yPos + 16);

      this.yPos += 32;

      // Intro
      this.bodyText(rec.intro);
      this.yPos += 8;

      // 70%
      this.setColor(C.NAVY);
      this.font("bold", 9);
      this.text("70% On-the-Job", this.m + 8, this.yPos);
      this.yPos += 12;
      for (const item of rec.on_the_job) {
        this.checkPage(20);
        this.setColor(C.DARK_GRAY);
        this.font("normal", 9);
        const lines = this.wrap(`• ${item}`, this.mw - 20);
        lines.forEach(l => { this.text(l, this.m + 15, this.yPos); this.yPos += 12; });
      }
      this.yPos += 5;

      // 20%
      this.setColor(C.NAVY);
      this.font("bold", 9);
      this.text("20% Coaching & Mentoring", this.m + 8, this.yPos);
      this.yPos += 12;
      for (const item of rec.coaching) {
        this.checkPage(20);
        this.setColor(C.DARK_GRAY);
        this.font("normal", 9);
        const lines = this.wrap(`• ${item}`, this.mw - 20);
        lines.forEach(l => { this.text(l, this.m + 15, this.yPos); this.yPos += 12; });
      }
      this.yPos += 5;

      // 10%
      this.setColor(C.NAVY);
      this.font("bold", 9);
      this.text("10% Formal Learning", this.m + 8, this.yPos);
      this.yPos += 12;
      for (const item of rec.formal_learning) {
        this.checkPage(20);
        this.setColor(C.DARK_GRAY);
        this.font("normal", 9);
        const lines = this.wrap(`• ${item}`, this.mw - 20);
        lines.forEach(l => { this.text(l, this.m + 15, this.yPos); this.yPos += 12; });
      }

      this.yPos += 20;
    }

    // Next Steps
    this.checkPage(50);
    this.subTitle("Next Steps — First 30 Days");
    this.yPos += 5;

    recommendations.next_steps.forEach((step, i) => {
      this.checkPage(20);
      this.setColor(C.NAVY);
      this.font("bold", 9);
      this.text(`${i + 1}.`, this.m + 5, this.yPos);
      this.setColor(C.DARK_GRAY);
      this.font("normal", 9.5);
      const lines = this.wrap(step, this.mw - 25);
      lines.forEach((l, li) => {
        this.text(l, this.m + 20, this.yPos + li * 13);
      });
      this.yPos += lines.length * 13 + 6;
    });
  }

  // ─── Public build method ────────────────────────────────────────────

  build(opts: PdfBuildOptions): jsPDF {
    this.participantName = opts.participant.name || "Participant";
    this.assessmentName = opts.participant.assessmentName || opts.input.programme.name || "Assessment";

    // 1. Cover
    this.drawCoverPage(opts.participant);

    // 2. Introduction
    this.drawIntroPage(opts.input);

    // 3. Competency Summary
    this.drawCompetencySummaryPage(opts.competencyScores);

    // 4-5. Overall Strengths & Development
    this.drawOverallStrengthsDevelopment(opts.report.profiles);

    // 6. Readiness vs Application
    this.drawReadinessVsApplication(opts.competencyScores);

    // 7-9. Detailed Competency Profiles
    this.drawDetailedCompetencyProfiles(opts.report.profiles, opts.competencyScores);

    // 10. AI Insights
    this.drawAIInsightsPage(opts.report.insights);

    // 11+. Recommendations
    this.drawRecommendationsPage(opts.report.recommendations);

    return this.doc;
  }
}

/**
 * Build and download the professional Breakfree-style PDF.
 */
export function buildBreakfreeReportPdf(opts: PdfBuildOptions): void {
  const builder = new ReportPdfBuilder();
  const doc = builder.build(opts);

  const fileName = `${opts.participant.name}_${opts.participant.assessmentName || "Report"}_AI_Report.pdf`.replace(/[^a-z0-9]/gi, "_");
  doc.save(fileName);
}
