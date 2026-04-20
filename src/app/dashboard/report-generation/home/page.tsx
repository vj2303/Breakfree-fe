"use client";
import React, { useState, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";
import { API_BASE_URL_WITH_API } from "../../../../lib/apiConfig";
import {
  formatReportContentForPDF,
  type FormattedReportContent,
} from "../../../../lib/katalystReportFormat";
import { htmlToPlainTextForPdf } from "../../../../lib/htmlToPlainTextForPdf";
import {
  enrichReportContentWithSynthesizedComments,
  isSyntheticScoreId,
} from "../../../../lib/reportSynthesis";
import { KatalystReportPreview } from "../../../../components/reports/KatalystReportPreview";

// --- INTERFACES ---

interface Assessor {
  id: string;
  name: string;
  email: string;
  designation: string;
  accessLevel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Score {
  id: string;
  participantId: string;
  assessorId: string;
  assessmentCenterId: string;
  competencyScores?: {
    [competencyId: string]: {
      [subCompetency: string]: number;
    };
  };
  overallComments?: string;
  individualComments?: {
    [competencyId: string]: string;
  } | null;
  status: "DRAFT" | "SUBMITTED" | "FINALIZED";
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assessor: Assessor;
  participant: {
    id: string;
    name: string;
    email: string;
  };
  assessmentCenter: {
    id: string;
    name: string;
  };
}

interface AssessorStats {
  assessor: Assessor;
  totalAllotted: number;
  assessed: number;
  inProgress: number;
  notAssessed: number;
  scores: Score[];
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    scores: Score[];
    pagination: Pagination;
  };
}

interface EditScoreData {
  competencyScores: {
    [competencyId: string]: {
      [subCompetency: string]: number;
    };
  };
  overallComments: string;
  individualComments: {
    [competencyId: string]: string;
  };
  status: "DRAFT" | "SUBMITTED" | "FINALIZED";
}

interface GroupParticipant {
  id: string;
  name: string;
  email?: string;
}

interface Group {
  id: string;
  name: string;
  admin: string;
  adminEmail: string;
  members: string[];
  participantIds?: string[];
  participants?: GroupParticipant[];
}

interface ParticipantAssignmentSummary {
  assignmentId: string;
  assessmentCenter: {
    id: string;
    name: string;
    displayName?: string;
  };
  totalActivities: number;
  submittedActivities: number;
  completionPercentage: number;
}

interface ParticipantProgressRow {
  participantId: string;
  name: string;
  email?: string;
  assignments: ParticipantAssignmentSummary[];
  fetchError?: string;
}

interface GroupWithAssessorMarks extends Group {
  assessorMarks: {
    assessorId: string;
    assessorName: string;
    assessorEmail: string;
    participantId: string;
    participantName: string;
    scores: Score[];
    totalAssessments: number;
    completedAssessments: number;
  }[];
}

const HomePage = () => {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<"groups" | "assessors">("groups");

  // Groups State
  const [, setGroups] = useState<Group[]>([]);
  const [groupsWithMarks, setGroupsWithMarks] = useState<
    GroupWithAssessorMarks[]
  >([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] =
    useState<GroupWithAssessorMarks | null>(null);
  const [participantProgressRows, setParticipantProgressRows] = useState<
    ParticipantProgressRow[]
  >([]);
  const [participantProgressLoading, setParticipantProgressLoading] =
    useState(false);

  // Assessors State
  const [assessorStats, setAssessorStats] = useState<AssessorStats[]>([]);
  const [filteredStats, setFilteredStats] = useState<AssessorStats[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal & Action State
  const [selectedAssessor, setSelectedAssessor] =
    useState<AssessorStats | null>(null);
  const [selectedScore, setSelectedScore] = useState<Score | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<EditScoreData | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [reportPreviewStat, setReportPreviewStat] =
    useState<AssessorStats | null>(null);
  const [reportPreviewPages, setReportPreviewPages] = useState<Array<{
    score: Score;
    content: FormattedReportContent;
  }> | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // --- HELPERS ---
  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || "";
    }
    return "";
  };

  // --- API FETCHING ---

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const token = getAuthToken();
      // Use Next.js API route or configured API base URL
      const res = await fetch(
        `${API_BASE_URL_WITH_API}/groups?page=1&limit=100&search=`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await res.json();
      if (result.success && result.data && result.data.groups) {
        setGroups(result.data.groups);
        const groupsWithMockMarks: GroupWithAssessorMarks[] =
          result.data.groups.map(
            (group: Group & { participants?: GroupParticipant[] }) => ({
              ...group,
              participants: group.participants || [],
              participantIds:
                group.participantIds ||
                (Array.isArray(group.members) ? group.members : []),
              assessorMarks:
                (group as Group & { assessorMarks?: unknown[] }).assessorMarks ||
                [],
            })
          );
        setGroupsWithMarks(groupsWithMockMarks);
      } else {
        setGroupsError(result.message || "Failed to fetch groups");
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
      setGroupsError("Error fetching groups");
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const fetchAssessorScores = useCallback(async (page = 1, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_BASE_URL_WITH_API}/assessors/admin/scores`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch assessor scores");
      const data: ApiResponse = await response.json();
      if (!data.success || !data.data)
        throw new Error(data.message || "Failed to fetch assessor scores");

      const assessorMap = new Map<string, AssessorStats>();

      data.data.scores.forEach((score) => {
        const assessorId = score.assessor.id;
        if (!assessorMap.has(assessorId)) {
          assessorMap.set(assessorId, {
            assessor: score.assessor,
            totalAllotted: 0,
            assessed: 0,
            inProgress: 0,
            notAssessed: 0,
            scores: [],
          });
        }
        const stats = assessorMap.get(assessorId)!;
        stats.scores.push(score);
        stats.totalAllotted += 1;
        if (score.status === "SUBMITTED" || score.status === "FINALIZED")
          stats.assessed += 1;
        else if (score.status === "DRAFT") stats.inProgress += 1;
        else stats.notAssessed += 1;
      });

      const statsArray = Array.from(assessorMap.values());
      setAssessorStats(statsArray);
      setFilteredStats(statsArray);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch assessor scores"
      );
      setAssessorStats([]);
      setFilteredStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- EFFECTS ---

  useEffect(() => {
    if (activeTab === "groups") fetchGroups();
  }, [activeTab, fetchGroups]);

  useEffect(() => {
    if (!selectedGroup) {
      setParticipantProgressRows([]);
      return;
    }

    let cancelled = false;

    const loadParticipantProgress = async () => {
      const participants: GroupParticipant[] = [];
      if (
        selectedGroup.participants &&
        selectedGroup.participants.length > 0
      ) {
        selectedGroup.participants.forEach((p) =>
          participants.push({
            id: p.id,
            name: p.name,
            email: p.email,
          })
        );
      } else if (
        selectedGroup.participantIds &&
        selectedGroup.participantIds.length > 0
      ) {
        selectedGroup.participantIds.forEach((id) =>
          participants.push({
            id,
            name: `Participant (${id.slice(-6)})`,
          })
        );
      }

      if (participants.length === 0) {
        setParticipantProgressRows([]);
        return;
      }

      setParticipantProgressLoading(true);
      setParticipantProgressRows([]);

      const token = getAuthToken();
      const rows = await Promise.all(
        participants.map(async (p) => {
          try {
            const res = await fetch(
              `${API_BASE_URL_WITH_API}/assignments/participant/${p.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );
            if (!res.ok) {
              return {
                participantId: p.id,
                name: p.name,
                email: p.email,
                assignments: [] as ParticipantAssignmentSummary[],
                fetchError: "Could not load assignments",
              };
            }
            const result = await res.json();
            const raw =
              result.success && result.data?.assignments
                ? result.data.assignments
                : Array.isArray(result.data)
                ? result.data
                : [];
            const assignments: ParticipantAssignmentSummary[] = (
              Array.isArray(raw) ? raw : []
            ).map(
              (a: {
                assignmentId: string;
                assessmentCenter: ParticipantAssignmentSummary["assessmentCenter"];
                totalActivities?: number;
                submittedActivities?: number;
                completionPercentage?: number;
              }) => ({
                assignmentId: a.assignmentId,
                assessmentCenter: a.assessmentCenter,
                totalActivities: a.totalActivities ?? 0,
                submittedActivities: a.submittedActivities ?? 0,
                completionPercentage: Math.round(
                  a.completionPercentage ?? 0
                ),
              })
            );
            return {
              participantId: p.id,
              name: p.name,
              email: p.email,
              assignments,
            };
          } catch {
            return {
              participantId: p.id,
              name: p.name,
              email: p.email,
              assignments: [] as ParticipantAssignmentSummary[],
              fetchError: "Could not load assignments",
            };
          }
        })
      );

      if (!cancelled) {
        setParticipantProgressRows(rows);
        setParticipantProgressLoading(false);
      }
    };

    loadParticipantProgress();
    return () => {
      cancelled = true;
      setParticipantProgressLoading(false);
    };
  }, [selectedGroup]);

  useEffect(() => {
    if (activeTab === "assessors")
      fetchAssessorScores(pagination.currentPage, pagination.itemsPerPage);
  }, [
    activeTab,
    fetchAssessorScores,
    pagination.currentPage,
    pagination.itemsPerPage,
  ]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStats(assessorStats);
    } else {
      const filtered = assessorStats.filter(
        (stat) =>
          stat.assessor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stat.assessor.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStats(filtered);
    }
  }, [searchTerm, assessorStats]);

  // --- HANDLERS ---

  const handleEditScore = (score: Score) => {
    setSelectedScore(score);
    // Initialize edit data from existing score
    setEditData({
      competencyScores: score.competencyScores || {},
      overallComments: score.overallComments || "",
      individualComments: score.individualComments || {},
      status: score.status === "FINALIZED" ? "FINALIZED" : score.status,
    });
    // Close assessor view modal to show edit modal clearly
    setSelectedAssessor(null);
    setShowEditModal(true);
  };

  const handleSaveScore = async () => {
    if (!selectedScore || !editData) return;
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL_WITH_API}/assessors/admin/scores/${selectedScore.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editData),
        }
      );
      const data = await response.json();
      if (!data.success)
        throw new Error(data.message || "Failed to update score");

      await fetchAssessorScores(
        pagination.currentPage,
        pagination.itemsPerPage
      );
      setShowEditModal(false);
      setSelectedScore(null);
      setEditData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update score");
    } finally {
      setSaving(false);
    }
  };

  // Removed unused handleViewAssessor

  // --- PDF GENERATION ENGINE (Modern Corporate Theme) ---

  const COLORS = {
    BLACK: [17, 17, 17] as [number, number, number],
    DARK_GRAY: [68, 68, 68] as [number, number, number],
    MID_GRAY: [136, 136, 136] as [number, number, number],
    LIGHT_GRAY: [229, 229, 229] as [number, number, number],
    OFF_WHITE: [249, 249, 249] as [number, number, number],
    WHITE: [255, 255, 255] as [number, number, number],
  };

  // 1. Drawing Helpers
  const drawFooter = (doc: jsPDF, pageNum: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Leadership Competency Assessment Report", 20, pageHeight - 8);
    doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 8, {
      align: "right",
    });
  };

  const drawRingChart = (
    doc: jsPDF,
    x: number,
    y: number,
    score: number,
    maxScore = 10
  ) => {
    const radius = 18;
    const innerRadius = 13;
    const percentage = Math.min(score / maxScore, 1);

    // Gray background circle
    doc.setFillColor(...COLORS.LIGHT_GRAY);
    doc.circle(x, y, radius, "F");

    // Black arc (Simulated with polygon for stability in pure jsPDF)
    if (percentage > 0) {
      doc.setFillColor(...COLORS.BLACK);
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + percentage * 2 * Math.PI;
      const step = Math.PI / 40;
      const pathData = [];
      pathData.push([x, y]); // Center point
      for (let angle = startAngle; angle <= endAngle; angle += step) {
        pathData.push([
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
        ]);
      }
      pathData.push([
        x + Math.cos(endAngle) * radius,
        y + Math.sin(endAngle) * radius,
      ]);
      doc.path(pathData, "F");
    }

    // White inner circle cutout
    doc.setFillColor(...COLORS.WHITE);
    doc.circle(x, y, innerRadius, "F");

    // Text center
    doc.setTextColor(...COLORS.BLACK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(score.toFixed(1), x, y + 4, { align: "center" });
  };

  const drawPatternBar = (
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    // Draw filled rectangle with gray background for pattern effect
    doc.setFillColor(150, 150, 150); // Gray color for Application bars
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(x, y, w, h, "FD");

    // Draw diagonal lines (hatching pattern) for visual distinction
    if (h > 0 && w > 0) {
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.2);

      // Draw diagonal lines from bottom-left to top-right
      const spacing = 2;
      const diagonalLength = Math.sqrt(w * w + h * h);
      const numLines = Math.ceil(diagonalLength / spacing);

      for (let i = 0; i < numLines; i++) {
        const offset = i * spacing;

        // Calculate line endpoints (diagonal from bottom-left to top-right)
        const startX = x - h + offset;
        const startY = y + h;
        const endX = x + offset;
        const endY = y;

        // Check if line intersects with rectangle
        if (endX >= x && startX <= x + w) {
          // Calculate clipped line endpoints within rectangle
          let clippedStartX = Math.max(startX, x);
          let clippedStartY = y + h;
          let clippedEndX = Math.min(endX, x + w);
          let clippedEndY = y;

          // Adjust if line goes outside vertical bounds
          if (clippedStartX < x) {
            const ratio = (x - startX) / (endX - startX);
            clippedStartX = x;
            clippedStartY = startY - (startY - endY) * ratio;
          }
          if (clippedEndX > x + w) {
            const ratio = (x + w - startX) / (endX - startX);
            clippedEndX = x + w;
            clippedEndY = startY - (startY - endY) * ratio;
          }

          // Only draw if line is within bounds
          if (
            clippedStartY >= y &&
            clippedEndY <= y + h &&
            clippedStartX <= clippedEndX
          ) {
            doc.line(clippedStartX, clippedStartY, clippedEndX, clippedEndY);
          }
        }
      }
    }
  };

  const drawModernBarChart = (
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    data: Array<Record<string, unknown>>
  ) => {
    const maxVal = 10;
    const chartHeight = height - 30;
    const startY = y + chartHeight;

    // Grid
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.MID_GRAY);
    doc.setDrawColor(230, 230, 230);

    for (let i = 0; i <= 5; i++) {
      const val = i * 2;
      const lineY = startY - (val / maxVal) * chartHeight;
      doc.text(val.toString(), x - 5, lineY + 1, { align: "right" });
      doc.line(x, lineY, x + width, lineY);
    }

    // Bars
    const groupWidth = width / data.length;
    const barWidth = Math.min(15, groupWidth / 2 - 2);
    const gap = 4;

    data.forEach((item, idx) => {
      const centerX = x + idx * groupWidth + groupWidth / 2;
      const readiness = typeof item.readiness === "number" ? item.readiness : 5;
      const application =
        typeof item.application === "number" ? item.application : 5;
      const rH = (readiness / maxVal) * chartHeight;
      const aH = (application / maxVal) * chartHeight;

      // Readiness (Black Solid)
      doc.setFillColor(...COLORS.BLACK);
      doc.rect(centerX - barWidth - gap / 2, startY - rH, barWidth, rH, "F");
      doc.setTextColor(...COLORS.BLACK);
      doc.setFont("helvetica", "bold");
      doc.text(
        readiness.toString(),
        centerX - barWidth - gap / 2 + barWidth / 2,
        startY - rH - 2,
        { align: "center" }
      );

      // Application (Pattern)
      drawPatternBar(doc, centerX + gap / 2, startY - aH, barWidth, aH);
      doc.text(
        application.toString(),
        centerX + gap / 2 + barWidth / 2,
        startY - aH - 2,
        { align: "center" }
      );

      // X Label
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.BLACK);
      const itemName = typeof item.name === "string" ? item.name : "Competency";
      const label = doc.splitTextToSize(itemName, groupWidth - 5);
      doc.text(label, centerX, startY + 10, { align: "center" });
    });

    // Legend
    const lx = x + width - 60;
    const ly = y - 10;
    doc.setFillColor(...COLORS.BLACK);
    doc.rect(lx, ly, 8, 8, "F");
    doc.text("Readiness", lx + 12, ly + 6);
    drawPatternBar(doc, lx + 35, ly, 8, 8);
    doc.text("Application", lx + 47, ly + 6);
  };

  const loadLogoDataUrlForPdf = (): Promise<{ dataUrl: string; w: number; h: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("canvas"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL("image/png"),
            w: img.naturalWidth,
            h: img.naturalHeight,
          });
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("logo"));
      img.src = "/logo.png";
    });
  };

  // 3. PDF from prepared pages (aligned with on-screen Katalyst preview)
  const buildPdfFromPreparedPages = async (
    stat: AssessorStats,
    preparedPages: Array<{ score: Score; content: FormattedReportContent }>
  ) => {
    let logo: { dataUrl: string; w: number; h: number } | null = null;
    try {
      logo = await loadLogoDataUrlForPdf();
    } catch {
      logo = null;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;
    let pageNum = 1;

    const checkPage = (h: number) => {
      if (yPos + h > pageHeight - margin) {
        drawFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        yPos = margin;
        return true;
      }
      return false;
    };

    for (const { score, content } of preparedPages) {
      if (pageNum > 1) {
        doc.addPage();
        pageNum++;
        yPos = margin;
      }

      // COVER PAGE
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.BLACK);
      doc.text("KATALYST", margin, yPos);
      doc.setFontSize(9);
      doc.text("CONFIDENTIAL", pageWidth - margin, yPos, { align: "right" });
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.MID_GRAY);
      doc.text("Leadership Development Program", margin, yPos);
      doc.setTextColor(...COLORS.BLACK);
      yPos += 5;
        doc.setDrawColor(...COLORS.LIGHT_GRAY);
        doc.setLineWidth(1);
        doc.line(margin, yPos, pageWidth - margin, yPos);

        yPos += 60;
        doc.setFontSize(36);
        doc.setFont("helvetica", "bold");
        doc.text("LEADERSHIP", margin, yPos);
        yPos += 14;
        doc.text("COMPETENCY", margin, yPos);
        yPos += 14;
        doc.text("DIAGNOSTIC REPORT", margin, yPos);
        yPos += 10;
        doc.setDrawColor(...COLORS.BLACK);
        doc.setLineWidth(2);
        doc.line(margin, yPos, margin + 40, yPos);

        yPos += 50;
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(...COLORS.BLACK);
        doc.setLineWidth(1);
        doc.rect(margin, yPos, pageWidth - margin * 2, 50, "F");
        doc.line(margin, yPos, margin, yPos + 50);

        const mid = margin + (pageWidth - margin * 2) / 2;
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.MID_GRAY);
        doc.text("PARTICIPANT", margin + 10, yPos + 15);
        doc.text("DATE", mid + 10, yPos + 15);
        doc.text("ASSESSMENT CENTER", margin + 10, yPos + 35);

        doc.setFontSize(12);
        doc.setTextColor(...COLORS.BLACK);
        doc.text(score.participant.name.toUpperCase(), margin + 10, yPos + 22);
        doc.text(new Date().toLocaleDateString(), mid + 10, yPos + 22);
        doc.text(score.assessmentCenter.name, margin + 10, yPos + 42);

        if (logo) {
          const logoH = 14;
          const logoW = (logo.w / logo.h) * logoH;
          const logoX = pageWidth - margin - logoW;
          const logoY = pageHeight - margin - logoH - 8;
          doc.addImage(logo.dataUrl, "PNG", logoX, logoY, logoW, logoH);
        }

        drawFooter(doc, pageNum);

        // INTRO PAGE
        doc.addPage();
        pageNum++;
        yPos = margin;
        doc.setFontSize(16);
        doc.text("Introduction & Summary", margin, yPos);
        yPos += 10;
        doc.setDrawColor(...COLORS.BLACK);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 15;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.DARK_GRAY);
        const introTxt = doc.splitTextToSize(
          htmlToPlainTextForPdf(
            content.introduction || `Report for ${score.participant.name}.`
          ),
          pageWidth - margin * 2
        );
        doc.text(introTxt, margin, yPos);
        yPos += introTxt.length * 5 + 20;

        // Top Strengths Box
        if (content.comments.strengths.length > 0) {
          checkPage(40);
          doc.setFontSize(12);
          doc.setTextColor(...COLORS.BLACK);
          doc.setFont("helvetica", "bold");
          doc.text("Top Strengths", margin, yPos);
          yPos += 8;
          content.comments.strengths.slice(0, 4).forEach((s) => {
            doc.setFontSize(12);
            doc.text("+", margin, yPos);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(
              doc.splitTextToSize(htmlToPlainTextForPdf(s), pageWidth - margin - 15),
              margin + 10,
              yPos
            );
            yPos += 10;
          });
          yPos += 10;
        }

        // Development Box
        if (content.comments.developmentAreas.length > 0) {
          checkPage(40);
          doc.setFontSize(12);
          doc.setTextColor(...COLORS.BLACK);
          doc.setFont("helvetica", "bold");
          doc.text("Development Priorities", margin, yPos);
          yPos += 8;
          content.comments.developmentAreas.slice(0, 4).forEach((s) => {
            doc.setFontSize(12);
            doc.text("!", margin, yPos);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(
              doc.splitTextToSize(htmlToPlainTextForPdf(s), pageWidth - margin - 15),
              margin + 10,
              yPos
            );
            yPos += 10;
          });
        }
        drawFooter(doc, pageNum);

        // COMPETENCY PAGES
        content.analysis.competencies.forEach(
          (comp: Record<string, unknown>) => {
            doc.addPage();
            pageNum++;
            yPos = margin;

            // Header
            doc.setFillColor(...COLORS.BLACK);
            doc.rect(margin, yPos, pageWidth - margin * 2, 12, "F");
            doc.setTextColor(...COLORS.WHITE);
            doc.setFont("helvetica", "bold");
            const compName =
              typeof comp.name === "string" ? comp.name : "Competency";
            doc.text(compName.toUpperCase(), margin + 5, yPos + 8);
            yPos += 30;

            // Chart Right
            const cx = pageWidth - margin - 40;
            const cy = yPos + 10;
            const compScore = typeof comp.score === "number" ? comp.score : 0;
            drawRingChart(doc, cx, cy, compScore);
            doc.setFontSize(9);
            doc.setTextColor(...COLORS.MID_GRAY);
            doc.text("SCORE", cx, cy + 30, { align: "center" });

            // Text Left
            doc.setFontSize(12);
            doc.setTextColor(...COLORS.BLACK);
            doc.text("Analysis", margin, yPos);
            yPos += 10;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...COLORS.DARK_GRAY);

            // If descriptors exist
            const descriptors = (
              Array.isArray(comp.strengths) ? comp.strengths : []
            ) as Array<string | Record<string, unknown>>;
            if (descriptors.length > 0) {
              descriptors.forEach((d: string | Record<string, unknown>) => {
                let title: string;
                let desc: string;
                if (typeof d === "string") {
                  title = "Observation";
                  desc = d;
                } else {
                  const dObj = d as Record<string, unknown>;
                  title =
                    typeof dObj.title === "string" ? dObj.title : "Observation";
                  desc =
                    typeof dObj.description === "string"
                      ? dObj.description
                      : "";
                }

                checkPage(20);
                // Styled Box
                doc.setDrawColor(...COLORS.LIGHT_GRAY);
                doc.setLineWidth(0.5);
                doc.line(margin, yPos, margin, yPos + 10);

                doc.setFont("helvetica", "bold");
                doc.setTextColor(...COLORS.BLACK);
                doc.text(title, margin + 5, yPos + 4);

                doc.setFont("helvetica", "normal");
                doc.setTextColor(...COLORS.DARK_GRAY);
                const dl = doc.splitTextToSize(
                  htmlToPlainTextForPdf(desc),
                  pageWidth - margin - 90
                );
                doc.text(dl, margin + 5, yPos + 10);
                yPos += dl.length * 5 + 15;
              });
            } else {
              const analysisComment =
                typeof comp.analysisComment === "string"
                  ? comp.analysisComment
                  : "No specific detailed comments.";
              const txt = doc.splitTextToSize(
                htmlToPlainTextForPdf(analysisComment),
                pageWidth - margin - 90
              );
              doc.text(txt, margin, yPos);
            }

            drawFooter(doc, pageNum);
          }
        );

        // FINAL PAGE
        doc.addPage();
        pageNum++;
        yPos = margin;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.BLACK);
        doc.text("Readiness vs Application", margin, yPos);
        yPos += 15;

        // Bar Chart
        const chartData = content.analysis.competencies.map(
          (c: Record<string, unknown>) => ({
            name: typeof c.name === "string" ? c.name : "Competency",
            readiness: typeof c.readiness === "number" ? c.readiness : 5,
            application: typeof c.application === "number" ? c.application : 5,
          })
        );
        if (chartData.length > 0) {
          drawModernBarChart(
            doc,
            margin,
            yPos,
            pageWidth - margin * 2,
            100,
            chartData
          );
          yPos += 120;
        }

        // Table
        checkPage(50);
        doc.setFontSize(12);
        doc.text("Detailed Scores", margin, yPos);
        yPos += 10;

        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
        doc.setFontSize(9);
        doc.text("COMPETENCY", margin + 5, yPos + 5);
        doc.text("R", margin + 100, yPos + 5);
        doc.text("A", margin + 115, yPos + 5);
        doc.text("COMMENT", margin + 130, yPos + 5);
        yPos += 10;

        content.analysis.competencies.forEach(
          (c: Record<string, unknown>, i: number) => {
            const rowH = 15;
            checkPage(rowH);
            if (i % 2 === 1) {
              doc.setFillColor(250, 250, 250);
              doc.rect(margin, yPos - 2, pageWidth - margin * 2, rowH, "F");
            }

            const cName = typeof c.name === "string" ? c.name : "Competency";
            const cReadiness =
              typeof c.readiness === "number" ? c.readiness : 0;
            const cApplication =
              typeof c.application === "number" ? c.application : 0;
            const cComment =
              typeof c.analysisComment === "string" ? c.analysisComment : "";
            doc.text(cName.substring(0, 45), margin + 5, yPos + 3);
            doc.text(cReadiness.toString(), margin + 100, yPos + 3);
            doc.text(cApplication.toString(), margin + 115, yPos + 3);

            const commPlain = htmlToPlainTextForPdf(cComment);
            const comm =
              commPlain.length > 50
                ? `${commPlain.substring(0, 50)}...`
                : commPlain;
            doc.text(comm, margin + 130, yPos + 3);

            yPos += 8;
          }
        );

        drawFooter(doc, pageNum);
    }

    const fileName = `${stat.assessor.name}_Reports.pdf`.replace(/\s+/g, "_");
    doc.save(fileName);
  };

  const handleDownloadAssessorData = async (
    stat: AssessorStats,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (stat.scores.length === 0) {
      setError("No assessments available");
      return;
    }

    setDownloading(stat.assessor.id);
    setError(null);

    try {
      const token = getAuthToken();
      const preparedPages: Array<{
        score: Score;
        content: FormattedReportContent;
      }> = [];

      for (const score of stat.scores) {
        const res = await fetch(
          `${API_BASE_URL_WITH_API}/report-structures/generate-from-assessment-center`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              assessmentCenterId:
                score.assessmentCenter?.id || score.assessmentCenterId,
              participantId: score.participant?.id || score.participantId,
            }),
          }
        );

        let content: FormattedReportContent;
        if (res.ok) {
          const r = await res.json();
          content = formatReportContentForPDF(
            r.data.reportContent,
            score.participant.name,
            score.assessmentCenter.name,
            score
          );
        } else {
          content = formatReportContentForPDF(
            {},
            score.participant.name,
            score.assessmentCenter.name,
            score
          );
        }

        const acIdForSynth =
          score.assessmentCenter?.id || score.assessmentCenterId;
        const participantIdForSynth =
          score.participant?.id || score.participantId;
        const assessorIdForSynth = score.assessorId || score.assessor?.id;
        const csKeys =
          score.competencyScores && typeof score.competencyScores === "object"
            ? Object.keys(score.competencyScores as object)
            : [];
        const needsSynth =
          content.comments.strengths.length === 0 ||
          content.comments.developmentAreas.length === 0;
        const synthBlockedByPlaceholder =
          isSyntheticScoreId(score.id) && csKeys.length === 0;

        console.log("[synthesize] row before API", {
          scoreId: score.id,
          synthetic: isSyntheticScoreId(score.id),
          assessmentCenterId: acIdForSynth,
          participantId: participantIdForSynth,
          assessorId: assessorIdForSynth,
          status: score.status,
          competencyScoreKeys: csKeys.length,
          needsSynth,
          synthBlockedByPlaceholder,
          expectSynthesizeInNetwork:
            needsSynth && !synthBlockedByPlaceholder,
        });

        if (needsSynth && synthBlockedByPlaceholder) {
          console.warn(
            "[synthesize] No POST to synthesize-strengths-and-development (nothing will show in Network for that URL): placeholder score row with no competencyScores. Use a submitted assessor score or rows that include competency data."
          );
        }

        content = await enrichReportContentWithSynthesizedComments(
          token,
          acIdForSynth,
          participantIdForSynth,
          content,
          {
            onlyFillIfEmpty: true,
            maxItemsPerSection: 6,
            locale: "en",
            tone: "professional coaching",
            scoreContext: {
              assessorId: assessorIdForSynth,
              scoreId: score.id,
              status: score.status,
              competencyScores: score.competencyScores as Record<
                string,
                Record<
                  string,
                  | number
                  | { readiness?: number; application?: number }
                >
              >,
              overallComments: score.overallComments,
              individualComments: score.individualComments ?? null,
            },
          }
        );

        preparedPages.push({ score, content });
      }

      setReportPreviewStat(stat);
      setReportPreviewPages(preparedPages);
      setReportPreviewOpen(true);
    } catch (err) {
      console.error(err);
      setError("Failed to load report preview");
    } finally {
      setDownloading(null);
    }
  };

  const handleConfirmReportPdfDownload = async () => {
    if (!reportPreviewStat || !reportPreviewPages?.length) return;
    setDownloadingPdf(true);
    setError(null);
    try {
      await buildPdfFromPreparedPages(reportPreviewStat, reportPreviewPages);
    } catch (err) {
      console.error(err);
      setError("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        background: "#f8fafd",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* --- HEADER --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#1a1a1a",
            margin: 0,
          }}
        >
          {activeTab === "groups" ? "Groups" : "Assessors"}
        </h1>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("groups")}
            style={{
              padding: "10px 20px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              background: activeTab === "groups" ? "#374151" : "#f3f4f6",
              color: activeTab === "groups" ? "#ffffff" : "#1a1a1a",
            }}
          >
            Groups
          </button>
          <button
            onClick={() => setActiveTab("assessors")}
            style={{
              padding: "10px 20px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              background: activeTab === "assessors" ? "#374151" : "#f3f4f6",
              color: activeTab === "assessors" ? "#ffffff" : "#1a1a1a",
            }}
          >
            Assessors
          </button>
        </div>

        {activeTab === "assessors" && (
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search Assessors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                width: "250px",
              }}
            />
          </div>
        )}
      </div>

      {/* --- ERRORS --- */}
      {(error || groupsError) && (
        <div
          style={{
            padding: "16px",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: "8px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{error || groupsError}</span>
          <button
            onClick={() => {
              setError(null);
              setGroupsError(null);
            }}
            style={{ border: "none", background: "none", cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      )}

      {/* --- GROUPS VIEW --- */}
      {activeTab === "groups" &&
        (groupsLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {groupsWithMarks.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                style={{
                  background: "white",
                  padding: "24px",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    margin: "0 0 8px 0",
                  }}
                >
                  {group.name}
                </h3>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  Admin: {group.admin}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  Members:{" "}
                  {group.members?.length || group.participantIds?.length || 0}
                </p>
              </div>
            ))}
          </div>
        ))}

      {/* --- ASSESSORS VIEW --- */}
      {activeTab === "assessors" &&
        (loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {filteredStats.map((stat) => (
              <div
                key={stat.assessor.id}
                onClick={() => setSelectedAssessor(stat)}
                style={{
                  background: "white",
                  padding: "24px",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      margin: "0 0 4px 0",
                    }}
                  >
                    {stat.assessor.name}
                  </h3>
                  <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                    {stat.assessor.email}
                  </p>
                </div>
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      padding: "4px 12px",
                      borderRadius: "12px",
                    }}
                  >
                    Total: {stat.totalAllotted}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      background: "#f0fdf4",
                      color: "#15803d",
                      padding: "4px 12px",
                      borderRadius: "12px",
                    }}
                  >
                    Done: {stat.assessed}
                  </div>
                  <button
                    onClick={(e) => handleDownloadAssessorData(stat, e)}
                    disabled={stat.scores.length === 0 || downloading === stat.assessor.id}
                    style={{
                      padding: "8px 16px",
                      background: stat.scores.length === 0 ? "#f3f4f6" : "#111",
                      color: stat.scores.length === 0 ? "#6b7280" : "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      cursor:
                        stat.scores.length === 0 || downloading === stat.assessor.id
                          ? "not-allowed"
                          : "pointer",
                      opacity: downloading === stat.assessor.id ? 0.85 : 1,
                    }}
                  >
                    {downloading === stat.assessor.id
                      ? "Loading report…"
                      : "View report"}
                  </button>
                </div>
              </div>
            ))}
            {/* Pagination Controls could go here */}
          </div>
        ))}

      {/* --- MODAL: GROUP DETAILS --- */}
      {selectedGroup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedGroup(null)}
        >
          <div
            style={{
              background: "white",
              width: "100%",
              maxWidth: "800px",
              borderRadius: "12px",
              padding: "24px",
              maxHeight: "85vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>
                {selectedGroup.name}
              </h2>
              <button
                onClick={() => setSelectedGroup(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>

            <div
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#f9fafb",
                borderRadius: "8px",
              }}
            >
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Admin:</strong> {selectedGroup.admin} (
                {selectedGroup.adminEmail})
              </p>
              <p style={{ margin: 0 }}>
                <strong>Total Members:</strong>{" "}
                {selectedGroup.members?.length ||
                  selectedGroup.participantIds?.length ||
                  0}
              </p>
            </div>

            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "16px",
              }}
            >
              Participant progress
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: "0 0 16px 0",
              }}
            >
              Activity completion per participant (from their assessment
              assignments).
            </p>
            {participantProgressLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px",
                  color: "#6b7280",
                }}
              >
                Loading participant progress…
              </div>
            ) : participantProgressRows.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px",
                  color: "#6b7280",
                }}
              >
                No participants in this group, or participant list is not
                available yet. Ensure the groups API returns{" "}
                <code style={{ fontSize: "12px" }}>participants</code> or{" "}
                <code style={{ fontSize: "12px" }}>participantIds</code>.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {participantProgressRows.map((row) => (
                  <div
                    key={row.participantId}
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "16px",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontWeight: 600 }}>{row.name}</div>
                      {row.email && (
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {row.email}
                        </div>
                      )}
                      {row.fetchError && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#b45309",
                            marginTop: "4px",
                          }}
                        >
                          {row.fetchError}
                        </div>
                      )}
                    </div>
                    {row.assignments.length === 0 && !row.fetchError ? (
                      <div
                        style={{ fontSize: "13px", color: "#6b7280" }}
                      >
                        No assignments for this participant.
                      </div>
                    ) : (
                      row.assignments.map((a, idx) => {
                        const centerLabel =
                          a.assessmentCenter.displayName ||
                          a.assessmentCenter.name;
                        const done =
                          a.submittedActivities >= a.totalActivities &&
                          a.totalActivities > 0;
                        return (
                          <div
                            key={a.assignmentId}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "8px",
                              paddingTop: idx > 0 ? "8px" : 0,
                              marginTop: idx > 0 ? "8px" : 0,
                              borderTop:
                                idx > 0 ? "1px solid #f3f4f6" : undefined,
                            }}
                          >
                            <div style={{ fontSize: "13px", color: "#374151" }}>
                              {centerLabel}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: done ? "#15803d" : "#c2410c",
                              }}
                            >
                              {a.submittedActivities} / {a.totalActivities}{" "}
                              activities · {a.completionPercentage}%
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: ASSESSOR ASSESSMENTS --- */}
      {selectedAssessor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedAssessor(null)}
        >
          <div
            style={{
              background: "white",
              width: "100%",
              maxWidth: "900px",
              borderRadius: "12px",
              padding: "24px",
              maxHeight: "85vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>
                Assessments: {selectedAssessor.assessor.name}
              </h2>
              <button
                onClick={() => setSelectedAssessor(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {selectedAssessor.scores.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#6b7280",
                  }}
                >
                  No assessments assigned.
                </p>
              ) : (
                selectedAssessor.scores.map((score) => (
                  <div
                    key={score.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "16px",
                      borderRadius: "8px",
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "16px" }}>
                        {score.participant.name}
                      </div>
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>
                        {score.assessmentCenter.name}
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>
                        Status:{" "}
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              score.status === "FINALIZED"
                                ? "green"
                                : score.status === "SUBMITTED"
                                ? "blue"
                                : "orange",
                          }}
                        >
                          {score.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditScore(score)}
                      style={{
                        padding: "8px 16px",
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Edit / View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: KATALYST REPORT PREVIEW --- */}
      {reportPreviewOpen && reportPreviewStat && reportPreviewPages && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            zIndex: 100,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => {
            if (!downloadingPdf) {
              setReportPreviewOpen(false);
              setReportPreviewPages(null);
              setReportPreviewStat(null);
            }
          }}
        >
          <div
            style={{
              background: "#eef2f7",
              width: "100%",
              maxWidth: 920,
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              maxHeight: "100%",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "16px 20px",
                background: "#fff",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    margin: 0,
                    color: "#111",
                  }}
                >
                  Report preview
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  {reportPreviewStat.assessor.name} — matches PDF layout (Katalyst
                  style)
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setReportPreviewOpen(false);
                    setReportPreviewPages(null);
                    setReportPreviewStat(null);
                  }}
                  disabled={downloadingPdf}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    fontSize: 13,
                    cursor: downloadingPdf ? "not-allowed" : "pointer",
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReportPdfDownload}
                  disabled={downloadingPdf}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: downloadingPdf ? "#9ca3af" : "#111",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: downloadingPdf ? "not-allowed" : "pointer",
                  }}
                >
                  {downloadingPdf ? "Preparing PDF…" : "Download PDF"}
                </button>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "20px 16px 28px",
              }}
            >
              <KatalystReportPreview
                assessorName={reportPreviewStat.assessor.name}
                editable
                onPageChange={(pageIdx, next) => {
                  setReportPreviewPages((prev) =>
                    prev?.map((row, i) =>
                      i === pageIdx ? { ...row, content: next } : row
                    ) ?? null
                  );
                }}
                pages={reportPreviewPages.map(({ score, content }) => ({
                  participantName: score.participant.name,
                  assessmentCenterName: score.assessmentCenter.name,
                  content,
                }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT SCORE --- */}
      {showEditModal && selectedScore && editData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => !saving && setShowEditModal(false)}
        >
          <div
            style={{
              background: "white",
              width: "100%",
              maxWidth: "800px",
              borderRadius: "12px",
              padding: "24px",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
                Edit Assessment: {selectedScore.participant.name}
              </h2>
              <button
                onClick={() => !saving && setShowEditModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Assessment Status
              </label>
              <select
                value={editData.status}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    status: e.target.value as
                      | "DRAFT"
                      | "SUBMITTED"
                      | "FINALIZED",
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="FINALIZED">Finalized</option>
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Overall Comments
              </label>
              <textarea
                value={editData.overallComments}
                onChange={(e) =>
                  setEditData({ ...editData, overallComments: e.target.value })
                }
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              />
            </div>

            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "12px",
                borderBottom: "1px solid #eee",
                paddingBottom: "8px",
              }}
            >
              Competency Scores
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {Object.keys(editData.competencyScores).map((compId) => (
                <div
                  key={compId}
                  style={{
                    background: "#f9fafb",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "12px",
                      fontSize: "14px",
                    }}
                  >
                    {compId}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 100px",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    {Object.keys(editData.competencyScores[compId]).map(
                      (subComp) => (
                        <React.Fragment key={subComp}>
                          <div style={{ fontSize: "13px", color: "#374151" }}>
                            {subComp}
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={editData.competencyScores[compId][subComp]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setEditData({
                                ...editData,
                                competencyScores: {
                                  ...editData.competencyScores,
                                  [compId]: {
                                    ...editData.competencyScores[compId],
                                    [subComp]: isNaN(val) ? 0 : val,
                                  },
                                },
                              });
                            }}
                            style={{
                              padding: "6px",
                              borderRadius: "4px",
                              border: "1px solid #d1d5db",
                              width: "100%",
                            }}
                          />
                        </React.Fragment>
                      )
                    )}
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <label
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Specific Comments
                    </label>
                    <input
                      type="text"
                      value={editData.individualComments[compId] || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          individualComments: {
                            ...editData.individualComments,
                            [compId]: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScore}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  background: saving ? "#93c5fd" : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
