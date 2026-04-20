"use client";

import React from "react";
import type { FormattedReportContent } from "../../lib/katalystReportFormat";
import { htmlToPlainTextForPdf } from "../../lib/htmlToPlainTextForPdf";
import { ReportTiptapField } from "./ReportTiptapField";

export interface KatalystReportPreviewPage {
  participantName: string;
  assessmentCenterName: string;
  content: FormattedReportContent;
}

const COLORS = {
  black: "#111111",
  dark: "#444444",
  mid: "#888888",
  line: "#e5e5e5",
  panel: "#fafafa",
};

function ScoreRing({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const deg = (pct / 100) * 360;
  return (
    <div
      style={{
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: `conic-gradient(from -90deg, ${COLORS.black} 0deg ${deg}deg, ${COLORS.line} ${deg}deg 360deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: COLORS.black,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {typeof score === "number" ? score.toFixed(1) : "—"}
      </div>
    </div>
  );
}

function BarPair({
  readiness,
  application,
  label,
  max = 10,
}: {
  readiness: number;
  application: number;
  label: string;
  max?: number;
}) {
  const h = 120;
  const rH = (readiness / max) * h;
  const aH = (application / max) * h;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: "1 1 80px",
        minWidth: 72,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
          height: h + 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
            {readiness.toFixed(1)}
          </span>
          <div
            style={{
              width: 14,
              height: rH,
              background: COLORS.black,
              borderRadius: 2,
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
            {application.toFixed(1)}
          </span>
          <div
            style={{
              width: 14,
              height: aH,
              borderRadius: 2,
              border: `1px solid ${COLORS.mid}`,
              background: `repeating-linear-gradient(135deg, #969696, #969696 2px, #c4c4c4 2px, #c4c4c4 4px)`,
            }}
          />
        </div>
      </div>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 10,
          textAlign: "center",
          color: COLORS.dark,
          lineHeight: 1.25,
          maxWidth: 100,
        }}
      >
        {label}
      </p>
    </div>
  );
}

function parseDescriptor(
  d: string | Record<string, unknown>
): { title: string; desc: string } {
  if (typeof d === "string") {
    return { title: "Observation", desc: d };
  }
  const dObj = d as Record<string, unknown>;
  return {
    title: typeof dObj.title === "string" ? dObj.title : "Observation",
    desc:
      typeof dObj.description === "string" ? dObj.description : "",
  };
}

function patchDescriptor(
  content: FormattedReportContent,
  ci: number,
  di: number,
  next: string | Record<string, unknown>
): FormattedReportContent {
  const competencies = [...content.analysis.competencies];
  const raw = { ...(competencies[ci] as Record<string, unknown>) };
  const strengths = [...(Array.isArray(raw.strengths) ? raw.strengths : [])];
  strengths[di] = next;
  raw.strengths = strengths;
  competencies[ci] = raw;
  return {
    ...content,
    analysis: { ...content.analysis, competencies },
  };
}

function patchCompetencyField(
  content: FormattedReportContent,
  ci: number,
  field: Record<string, unknown>
): FormattedReportContent {
  const competencies = [...content.analysis.competencies];
  competencies[ci] = { ...competencies[ci], ...field };
  return {
    ...content,
    analysis: { ...content.analysis, competencies },
  };
}

export interface KatalystReportPreviewProps {
  assessorName: string;
  pages: KatalystReportPreviewPage[];
  /** When set, narrative sections use TipTap and changes are sent upstream */
  editable?: boolean;
  onPageChange?: (pageIndex: number, next: FormattedReportContent) => void;
}

export function KatalystReportPreview({
  assessorName,
  pages,
  editable = false,
  onPageChange,
}: KatalystReportPreviewProps) {
  const reportDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="katalyst-report-preview"
      style={{
        fontFamily:
          '"Georgia", "Times New Roman", serif',
        color: COLORS.dark,
        lineHeight: 1.55,
      }}
    >
      <style>{`
        @media print {
          .katalyst-report-preview .report-sheet {
            break-after: page;
            box-shadow: none !important;
          }
          .katalyst-report-preview .report-sheet:last-child {
            break-after: auto;
          }
        }
      `}</style>

      {pages.map((page, pageIdx) => {
        const { participantName, assessmentCenterName, content } = page;
        const comps = content.analysis.competencies;
        const chartData = comps.map((c) => ({
          name: typeof c.name === "string" ? c.name : "Competency",
          readiness:
            typeof c.readiness === "number" ? c.readiness : 5,
          application:
            typeof c.application === "number" ? c.application : 5,
        }));

        return (
          <div
            key={`${page.participantName}-${pageIdx}`}
            className="report-sheet"
            style={{
              maxWidth: 720,
              margin: "0 auto 32px",
              background: "#fff",
              border: `1px solid ${COLORS.line}`,
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {/* Cover */}
            <div
              style={{
                padding: "40px 48px 48px",
                minHeight: 520,
                borderBottom: `4px solid ${COLORS.black}`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 48,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    fontWeight: 600,
                    color: COLORS.mid,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  CONFIDENTIAL
                </span>
              </div>

              <p
                style={{
                  fontSize: 13,
                  letterSpacing: "0.35em",
                  fontWeight: 700,
                  color: COLORS.black,
                  margin: "0 0 8px",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                KATALYST
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: COLORS.mid,
                  margin: "0 0 32px",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Leadership Development Program
              </p>

              <h1
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: COLORS.black,
                  margin: "0 0 12px",
                  lineHeight: 1.1,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Leadership
                <br />
                Competency
                <br />
                Diagnostic Report
              </h1>
              <div
                style={{
                  width: 48,
                  height: 3,
                  background: COLORS.black,
                  marginBottom: 40,
                }}
              />

              <div
                style={{
                  background: COLORS.panel,
                  border: `1px solid ${COLORS.line}`,
                  borderLeft: `4px solid ${COLORS.black}`,
                  padding: "24px 28px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 24,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: COLORS.mid,
                        marginBottom: 6,
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      Participant
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: COLORS.black,
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {participantName}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: COLORS.mid,
                        marginBottom: 6,
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      Report date
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: COLORS.black,
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {reportDate}
                    </div>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: COLORS.mid,
                      marginBottom: 6,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Assessment center
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.black,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {assessmentCenterName}
                  </div>
                </div>
              </div>

              <p
                style={{
                  marginTop: 36,
                  fontSize: 12,
                  color: COLORS.mid,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Authored by: <strong style={{ color: COLORS.black }}>Breakfree Consulting</strong>
              </p>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: COLORS.mid,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Assessor: {assessorName}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "flex-end",
                  marginTop: "auto",
                  paddingTop: 28,
                }}
              >
                <img
                  src="/logo.png"
                  alt="Breakfree Consulting"
                  style={{
                    height: 52,
                    width: "auto",
                    maxWidth: 200,
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>

            {/* Introduction */}
            <div style={{ padding: "36px 48px" }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.black,
                  margin: "0 0 12px",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Introduction &amp; summary
              </h2>
              <div
                style={{
                  height: 1,
                  background: COLORS.black,
                  marginBottom: 20,
                  maxWidth: 200,
                }}
              />
              {editable && onPageChange ? (
                <div style={{ marginBottom: 20 }}>
                  <ReportTiptapField
                    key={`${pageIdx}-intro`}
                    initialValue={
                      content.introduction ||
                      `This report summarizes leadership competency evidence gathered for ${participantName} within ${assessmentCenterName}.`
                    }
                    minHeight={140}
                    onChange={(html) =>
                      onPageChange(pageIdx, { ...content, introduction: html })
                    }
                  />
                </div>
              ) : content.introduction && content.introduction.trim().startsWith("<") ? (
                <div
                  style={{ fontSize: 13, margin: "0 0 20px" }}
                  dangerouslySetInnerHTML={{
                    __html: content.introduction,
                  }}
                />
              ) : (
                <p style={{ fontSize: 13, margin: "0 0 20px", whiteSpace: "pre-wrap" }}>
                  {content.introduction ||
                    `This report summarizes leadership competency evidence gathered for ${participantName} within ${assessmentCenterName}.`}
                </p>
              )}

              {(editable && onPageChange) ||
              content.comments.strengths.length > 0 ? (
                <div style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "0 0 12px",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Top strengths
                  </h3>
                  {editable && onPageChange ? (
                    <textarea
                      value={content.comments.strengths.join("\n")}
                      onChange={(e) =>
                        onPageChange(pageIdx, {
                          ...content,
                          comments: {
                            ...content.comments,
                            strengths: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      placeholder="One strength per line"
                      style={{
                        width: "100%",
                        minHeight: 100,
                        padding: 12,
                        fontSize: 13,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 6,
                        fontFamily: "system-ui, sans-serif",
                        resize: "vertical",
                      }}
                    />
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                      {content.comments.strengths.slice(0, 8).map((s, i) => (
                        <li key={i} style={{ marginBottom: 8 }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {(editable && onPageChange) ||
              content.comments.developmentAreas.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "0 0 12px",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Development priorities
                  </h3>
                  {editable && onPageChange ? (
                    <textarea
                      value={content.comments.developmentAreas.join("\n")}
                      onChange={(e) =>
                        onPageChange(pageIdx, {
                          ...content,
                          comments: {
                            ...content.comments,
                            developmentAreas: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      placeholder="One area per line"
                      style={{
                        width: "100%",
                        minHeight: 100,
                        padding: 12,
                        fontSize: 13,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 6,
                        fontFamily: "system-ui, sans-serif",
                        resize: "vertical",
                      }}
                    />
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                      {content.comments.developmentAreas.slice(0, 8).map((s, i) => (
                        <li key={i} style={{ marginBottom: 8 }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            {/* Competencies */}
            {comps.map((comp, ci) => {
              const compName =
                typeof comp.name === "string" ? comp.name : "Competency";
              const compScore =
                typeof comp.score === "number" ? comp.score : 0;
              const descriptors = (
                Array.isArray(comp.strengths) ? comp.strengths : []
              ) as Array<string | Record<string, unknown>>;
              const analysisComment =
                typeof comp.analysisComment === "string"
                  ? comp.analysisComment
                  : "";

              return (
                <div
                  key={`${compName}-${ci}`}
                  style={{
                    borderTop: `1px solid ${COLORS.line}`,
                  }}
                >
                  <div
                    style={{
                      background: COLORS.black,
                      color: "#fff",
                      padding: "12px 48px",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {editable && onPageChange ? (
                      <input
                        type="text"
                        value={compName}
                        onChange={(e) =>
                          onPageChange(
                            pageIdx,
                            patchCompetencyField(content, ci, {
                              name: e.target.value,
                            })
                          )
                        }
                        aria-label="Competency name"
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          fontFamily: "system-ui, sans-serif",
                          outline: "none",
                          textTransform: "uppercase",
                        }}
                      />
                    ) : (
                      compName.toUpperCase()
                    )}
                  </div>
                  <div
                    style={{
                      padding: "28px 48px",
                      display: "flex",
                      gap: 28,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                      <h4
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          margin: "0 0 12px",
                          fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        Analysis
                      </h4>
                      {descriptors.length > 0 ? (
                        descriptors.map((d, di) => {
                          const { title, desc } = parseDescriptor(d);
                          return (
                            <div
                              key={di}
                              style={{
                                marginBottom: 16,
                                paddingLeft: 12,
                                borderLeft: `3px solid ${COLORS.line}`,
                              }}
                            >
                              {editable && onPageChange ? (
                                <>
                                  {typeof d === "string" ? (
                                    <ReportTiptapField
                                      key={`${pageIdx}-${ci}-d-${di}`}
                                      initialValue={d}
                                      minHeight={100}
                                      onChange={(html) =>
                                        onPageChange(
                                          pageIdx,
                                          patchDescriptor(content, ci, di, html)
                                        )
                                      }
                                    />
                                  ) : (
                                    <>
                                      <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => {
                                          const dObj = d as Record<
                                            string,
                                            unknown
                                          >;
                                          onPageChange(
                                            pageIdx,
                                            patchDescriptor(content, ci, di, {
                                              ...dObj,
                                              title: e.target.value,
                                              description:
                                                typeof dObj.description ===
                                                "string"
                                                  ? dObj.description
                                                  : desc,
                                            })
                                          );
                                        }}
                                        style={{
                                          width: "100%",
                                          marginBottom: 8,
                                          padding: "6px 8px",
                                          fontSize: 12,
                                          fontWeight: 700,
                                          border: `1px solid ${COLORS.line}`,
                                          borderRadius: 4,
                                          fontFamily: "system-ui, sans-serif",
                                        }}
                                      />
                                      <ReportTiptapField
                                        key={`${pageIdx}-${ci}-d-${di}-body`}
                                        initialValue={desc}
                                        minHeight={100}
                                        onChange={(html) => {
                                          const dObj = d as Record<
                                            string,
                                            unknown
                                          >;
                                          onPageChange(
                                            pageIdx,
                                            patchDescriptor(content, ci, di, {
                                              ...dObj,
                                              description: html,
                                            })
                                          );
                                        }}
                                      />
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      marginBottom: 6,
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                  >
                                    {title}
                                  </div>
                                  {desc.trim().startsWith("<") ? (
                                    <div
                                      style={{ fontSize: 13 }}
                                      dangerouslySetInnerHTML={{
                                        __html: desc,
                                      }}
                                    />
                                  ) : (
                                    <div style={{ fontSize: 13 }}>{desc}</div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })
                      ) : editable && onPageChange ? (
                        <ReportTiptapField
                          key={`${pageIdx}-${ci}-analysis`}
                          initialValue={
                            analysisComment ||
                            "No specific detailed comments."
                          }
                          minHeight={120}
                          onChange={(html) =>
                            onPageChange(
                              pageIdx,
                              patchCompetencyField(content, ci, {
                                analysisComment: html,
                              })
                            )
                          }
                        />
                      ) : analysisComment.trim().startsWith("<") ? (
                        <div
                          style={{ fontSize: 13, margin: 0 }}
                          dangerouslySetInnerHTML={{ __html: analysisComment }}
                        />
                      ) : (
                        <p style={{ fontSize: 13, margin: 0 }}>
                          {analysisComment || "No specific detailed comments."}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <ScoreRing score={compScore} />
                      <span
                        style={{
                          fontSize: 10,
                          color: COLORS.mid,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        Score
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Readiness vs Application */}
            <div
              style={{
                borderTop: `1px solid ${COLORS.line}`,
                padding: "36px 48px 48px",
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.black,
                  margin: "0 0 20px",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Readiness vs application
              </h2>
              {chartData.length > 0 ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      justifyContent: "center",
                      alignItems: "flex-end",
                      marginBottom: 20,
                      padding: "16px 0",
                      border: `1px solid ${COLORS.line}`,
                      background: COLORS.panel,
                    }}
                  >
                    {chartData.map((row, ri) => (
                      <BarPair
                        key={ri}
                        readiness={row.readiness}
                        application={row.application}
                        label={row.name}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 24,
                      justifyContent: "flex-end",
                      fontSize: 11,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          background: COLORS.black,
                          borderRadius: 2,
                        }}
                      />
                      Readiness
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          border: `1px solid ${COLORS.mid}`,
                          background: `repeating-linear-gradient(135deg, #969696, #969696 2px, #c4c4c4 2px, #c4c4c4 4px)`,
                        }}
                      />
                      Application
                    </span>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: COLORS.mid }}>
                  No competency chart data for this report.
                </p>
              )}

              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: "32px 0 12px",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Detailed scores
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f0f0f0" }}>
                      <th style={{ textAlign: "left", padding: 10, border: `1px solid ${COLORS.line}` }}>
                        Competency
                      </th>
                      <th style={{ padding: 10, border: `1px solid ${COLORS.line}`, width: 48 }}>
                        R
                      </th>
                      <th style={{ padding: 10, border: `1px solid ${COLORS.line}`, width: 48 }}>
                        A
                      </th>
                      <th style={{ textAlign: "left", padding: 10, border: `1px solid ${COLORS.line}` }}>
                        Comment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((c, ti) => {
                      const n = typeof c.name === "string" ? c.name : "—";
                      const r =
                        typeof c.readiness === "number" ? c.readiness : "—";
                      const a =
                        typeof c.application === "number" ? c.application : "—";
                      const cm =
                        typeof c.analysisComment === "string"
                          ? c.analysisComment
                          : "";
                      const cmPlain = htmlToPlainTextForPdf(cm);
                      return (
                        <tr
                          key={ti}
                          style={{
                            background: ti % 2 === 1 ? "#fafafa" : "#fff",
                          }}
                        >
                          <td style={{ padding: 10, border: `1px solid ${COLORS.line}`, verticalAlign: "top" }}>
                            {n}
                          </td>
                          <td style={{ padding: 10, border: `1px solid ${COLORS.line}`, textAlign: "center" }}>
                            {r}
                          </td>
                          <td style={{ padding: 10, border: `1px solid ${COLORS.line}`, textAlign: "center" }}>
                            {a}
                          </td>
                          <td style={{ padding: 10, border: `1px solid ${COLORS.line}`, verticalAlign: "top", maxWidth: 280 }}>
                            {cmPlain.length > 160
                              ? `${cmPlain.slice(0, 160)}…`
                              : cmPlain}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                padding: "16px 48px",
                borderTop: `1px solid ${COLORS.line}`,
                fontSize: 10,
                color: COLORS.mid,
                fontFamily: "system-ui, sans-serif",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Leadership competency assessment report</span>
              <span>Participant: {participantName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
