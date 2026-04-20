"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ArrowLeft, CheckCircle, Edit } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const getInteractiveActivityTypeBadge = (type?: string) => {
  switch (type) {
    case 'GD':
      return { label: 'GD', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'ROLEPLAY':
      return { label: 'Roleplay', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'CASE_STUDY':
      return { label: 'Case Study', color: 'bg-green-50 text-green-700 border-green-200' };
    default:
      return null;
  }
};

/** Single comment for numeric (non-rubric) sub-competency rows */
const NUMERIC_SCORE_COMMENT_KEY = '__numeric';
/** Legacy flat string migrated from older API shape */
const LEGACY_SCORE_COMMENT_KEY = '__legacy';

function parseScoreKeyLevel(key: string): number {
  const n = parseInt(key.replace(/^score/i, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function getSortedScoreKeysFromDescriptions(scoreDescriptions: Record<string, string>): string[] {
  return Object.keys(scoreDescriptions)
    .filter((key) => key.startsWith('score'))
    .sort((a, b) => parseScoreKeyLevel(a) - parseScoreKeyLevel(b));
}

function legacyTenPointToLevel(score: number, numLevels: number): number {
  if (numLevels < 1) return 1;
  const clamped = Math.max(0, Math.min(10, score));
  const level = Math.round((clamped / 10) * numLevels);
  return Math.min(numLevels, Math.max(1, level || 1));
}

/** Maps stored value to rubric level: 0 = none, 1..N = explicit level; legacy 0–10 maps into levels. */
function normalizeStoredToLevel(stored: number, numLevels: number): number {
  if (numLevels < 1) return 0;
  if (stored === 0 || stored === null || stored === undefined || Number.isNaN(Number(stored))) return 0;
  const n = Number(stored);
  if (Number.isInteger(n) && n >= 1 && n <= numLevels) return n;
  return legacyTenPointToLevel(n, numLevels);
}

function averageSubCompetencyScores(
  subNames: string[],
  scoresBySub: Record<string, number> | undefined
): number | null {
  if (subNames.length === 0) return null;
  let sum = 0;
  for (const name of subNames) {
    const v = scoresBySub?.[name];
    sum += typeof v === 'number' && !Number.isNaN(v) ? v : 0;
  }
  return sum / subNames.length;
}

function formatCompetencyAverage(avg: number | null): string {
  if (avg === null) return '—';
  const rounded = Math.round(avg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Normalize API value to per–score-key comment map (handles legacy string). */
function normalizeScoreCommentMap(
  val: string | Record<string, string> | undefined
): Record<string, string> {
  if (val === undefined || val === null) return {};
  if (typeof val === 'string') return { [LEGACY_SCORE_COMMENT_KEY]: val };
  return { ...val };
}

function mergeActivitySubCompCommentsFromApi(
  raw: Record<string, Record<string, Record<string, unknown>>>
): Record<string, Record<string, Record<string, Record<string, string>>>> {
  const out: Record<string, Record<string, Record<string, Record<string, string>>>> = {};
  Object.entries(raw).forEach(([aid, compMap]) => {
    out[aid] = {};
    Object.entries(compMap).forEach(([cid, subMap]) => {
      out[aid][cid] = {};
      Object.entries(subMap).forEach(([sub, val]) => {
        out[aid][cid][sub] = normalizeScoreCommentMap(val as string | Record<string, string>);
      });
    });
  });
  return out;
}

function mergeAssignmentSubCompCommentsFromApi(
  raw: Record<string, Record<string, unknown>>
): Record<string, Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, Record<string, string>>> = {};
  Object.entries(raw).forEach(([cid, subMap]) => {
    out[cid] = {};
    Object.entries(subMap as Record<string, unknown>).forEach(([sub, val]) => {
      out[cid][sub] = normalizeScoreCommentMap(val as string | Record<string, string>);
    });
  });
  return out;
}

function getCommentForScoreKey(
  map: Record<string, string> | undefined,
  scoreKey: string,
  opts?: { isFirstScoreKey?: boolean }
): string {
  if (!map) return '';
  if (map[scoreKey]) return map[scoreKey];
  if (opts?.isFirstScoreKey && map[LEGACY_SCORE_COMMENT_KEY]) return map[LEGACY_SCORE_COMMENT_KEY];
  if (scoreKey === NUMERIC_SCORE_COMMENT_KEY && map[LEGACY_SCORE_COMMENT_KEY]) return map[LEGACY_SCORE_COMMENT_KEY];
  return '';
}

/** Mean of each activity’s sub-competency average (one value per activity). */
function averageAcrossAllActivities(
  activities: Array<{ activityId: string }>,
  competencies: Array<{ id: string; competencyName: string; subCompetencyNames: string[] }>,
  activityCompetencyScores: Record<string, Record<string, Record<string, number>>>,
  getCompetencyForActivity: (
    activityId: string,
    available: Array<{ id: string; competencyName: string; subCompetencyNames: string[] }>
  ) => { id: string; competencyName: string; subCompetencyNames: string[] } | null
): number | null {
  const avgs: number[] = [];
  for (const activity of activities) {
    const ac = getCompetencyForActivity(activity.activityId, competencies);
    if (!ac || ac.subCompetencyNames.length === 0) continue;
    const a = averageSubCompetencyScores(
      ac.subCompetencyNames,
      activityCompetencyScores[activity.activityId]?.[ac.id]
    );
    if (a !== null) avgs.push(a);
  }
  if (avgs.length === 0) return null;
  return avgs.reduce((x, y) => x + y, 0) / avgs.length;
}

function RubricScorePicker({
  scoreDescriptions,
  currentScore,
  onSelectLevel,
  subCompLabel,
  scoreCommentsByKey,
  onScoreCommentChange,
  selectedScoreKey,
  disabled,
}: {
  scoreDescriptions: Record<string, string>;
  currentScore: number;
  onSelectLevel: (level: number, scoreKey: string) => void;
  subCompLabel: string;
  /** Comments keyed by descriptor keys: score1, score2, … (same keys as rubric) */
  scoreCommentsByKey: Record<string, string>;
  onScoreCommentChange?: (scoreKey: string, value: string) => void;
  selectedScoreKey?: string; // The stored tick mark (e.g., "score1", "score2")
  disabled?: boolean; // Disable editing
}) {
  const scoreKeys = getSortedScoreKeysFromDescriptions(scoreDescriptions);
  const numLevels = scoreKeys.length;
  if (numLevels === 0) return null;
  // Use the selectedScoreKey if available, otherwise calculate from numeric score
  const highlightKey = selectedScoreKey && scoreKeys.includes(selectedScoreKey)
    ? selectedScoreKey
    : (() => {
        const level = normalizeStoredToLevel(currentScore, numLevels);
        return level >= 1 ? scoreKeys[level - 1] : undefined;
      })();
  // Calculate selectedLevel for display
  const selectedLevel = highlightKey ? scoreKeys.indexOf(highlightKey) + 1 : normalizeStoredToLevel(currentScore, numLevels);

  return (
    <div className="bg-white p-2 rounded border border-gray-200">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-black">{subCompLabel}</label>
        <div className="flex items-center gap-1.5 text-xs text-gray-700">
          <span className="font-medium text-black tabular-nums">
            {selectedLevel === 0 ? '—' : selectedLevel}
          </span>
          <span className="text-gray-500">/ {numLevels}</span>
        </div>
      </div>
      <div className="mt-1.5 space-y-2">
        <p className="text-xs font-medium text-gray-900 mb-1">Select score (click a level). Add a comment per level below.</p>
        {scoreKeys.map((key) => {
          const level = parseScoreKeyLevel(key);
          const isSelected = highlightKey === key;
          const scoreNum = key.replace('score', '');
          return (
            <div
              key={key}
              className={`rounded border text-xs transition-colors ${
                isSelected
                  ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectLevel(level, key)}
                disabled={disabled}
                className={`w-full p-1.5 text-left hover:bg-white/50 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <p className="text-gray-700">
                  <span className="font-medium text-gray-900">Score {scoreNum}: </span>
                  {scoreDescriptions[key] || 'No description'}
                </p>
              </button>
              {onScoreCommentChange !== undefined && (
                <div className="border-t border-gray-200/80 bg-white px-1.5 pb-1.5 pt-1">
                  <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Comment for Score {scoreNum}
                  </label>
                  <textarea
                    rows={2}
                    value={getCommentForScoreKey(scoreCommentsByKey, key, {
                      isFirstScoreKey: key === scoreKeys[0],
                    })}
                    onChange={(e) => onScoreCommentChange(key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded border border-gray-300 p-1.5 text-xs text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder={`Notes for ${subCompLabel} — Score ${scoreNum}…`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ParticipantScoringProps {
  params: Promise<{ id: string; participantId: string }>;
}

interface ParticipantDetails {
  success: boolean;
  message: string;
  data: {
    assessor: {
      id: string;
      name: string;
      email: string;
      designation: string;
      accessLevel: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
    participant: {
      id: string;
      name: string;
      email: string;
      designation: string;
      managerName: string;
      createdAt: string;
      updatedAt: string;
    };
    assignments: Array<{
      assignmentId: string;
      assessmentCenter: {
        id: string;
        name: string;
        description: string;
        displayName: string;
        displayInstructions: string;
        competencyIds: string[];
        documentUrl?: string;
        reportTemplateName: string;
        reportTemplateType: string;
        createdBy: string;
        createdAt: string;
        updatedAt: string;
      };
      group: {
        id: string;
        name: string;
        admin: string;
        adminEmail: string;
        participantIds: string[];
        createdAt: string;
        updatedAt: string;
      };
      activities: Array<{
        activityId: string;
        activityType: string;
        displayOrder: number;
        displayName?: string | null;
        displayInstructions?: string | null;
        competency: {
          id: string;
          competencyName: string;
          subCompetencyNames: string[];
          createdAt: string;
          updatedAt: string;
        };
        activityDetail: {
          id: string;
          name: string;
          description: string;
          instructions: string;
          videoUrl?: string;
          interactiveActivityType?: string;
        };
        submission: unknown;
      }>;
      assessorScore: unknown;
      submissionCount: number;
      totalActivities: number;
      competencies: Array<{
        id: string;
        competencyName: string;
        subCompetencyNames: string[];
        createdAt: string;
        updatedAt: string;
      }>;
    }>;
  };
}

interface Evaluation {
  metric: string;
  reasoning: string;
  score: string;
}

interface EvaluationResponse {
  evaluations: Evaluation[];
  filename: string;
  overall_score: string;
  success: boolean;
  summary: {
    average_score: string;
    total_metrics: number;
  };
}

interface AssessorScore {
  status?: 'DRAFT' | 'SUBMITTED' | 'FINALIZED';
  competencyScores?: Record<string, Record<string, number>>;
  overallComments?: string;
  activityComments?: Record<string, string>; // activityId -> comment
  /**
   * activityId -> competencyId -> subCompetency -> scoreKey -> comment
   * scoreKey matches rubric descriptors: `score1`, `score2`, … For numeric-only rows use `__numeric`.
   */
  activitySubCompetencyComments?: Record<string, Record<string, Record<string, Record<string, string>>>>;
  /**
   * competencyId -> subCompetency -> scoreKey -> comment (overall section, per assignment document)
   */
  assignmentSubCompetencyComments?: Record<string, Record<string, Record<string, string>>>;
  /**
   * competencyId -> average score across all activities for that competency
   */
  competencyAverages?: Record<string, number>;
  /**
   * activityId -> competencyId -> subCompetency -> selectedScoreKey
   * Stores which rubric level/tick mark was selected (e.g., "score1", "score2")
   */
  activitySelectedScoreKeys?: Record<string, Record<string, Record<string, string>>>;
  /**
   * competencyId -> subCompetency -> selectedScoreKey
   * Stores which rubric level/tick mark was selected for assignment-level scores
   */
  assignmentSelectedScoreKeys?: Record<string, Record<string, string>>;
}

interface ActivityWithSubmissions {
  activityId: string;
  activityType: string;
  displayOrder: number;
  displayName?: string | null;
  displayInstructions?: string | null;
  competency?: {
    id: string;
    competencyName: string;
    subCompetencyNames: string[];
    createdAt: string;
    updatedAt: string;
  };
  activityDetail: {
    id: string;
    name: string;
    description: string;
    instructions: string;
    videoUrl?: string;
    interactiveActivityType?: string;
  };
  submission: unknown;
  allSubmissions?: Array<{
    id: string;
    parentSubmissionId?: string;
    textContent?: string;
    submissionType?: string;
    submissionStatus?: string;
    submittedAt?: string;
    createdAt?: string;
    notes?: string;
    fileUrl?: string;
    fileName?: string;
  }>;
}

function getFileExtensionFromNameOrUrl(nameOrUrl: string): string {
  const path = (nameOrUrl.split(/[?#]/)[0] ?? '').trim();
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : '';
}

type DocumentPreviewMode = 'pdf' | 'image' | 'office' | 'text' | 'generic';

function inferDocumentPreviewMode(fileUrl: string, fileName?: string): DocumentPreviewMode {
  const extFromName = fileName ? getFileExtensionFromNameOrUrl(fileName) : '';
  const extFromUrl = getFileExtensionFromNameOrUrl(fileUrl);
  const ext = extFromName || extFromUrl;
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext)) return 'office';
  if (['txt', 'csv', 'md', 'json', 'xml'].includes(ext)) return 'text';
  if (/\.pdf(\?|#|$)/i.test(fileUrl)) return 'pdf';
  if (/\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(fileUrl)) return 'image';
  return 'generic';
}

function TextSubmissionPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.text();
      })
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <p className="p-3 text-xs text-gray-500">
        Text preview is unavailable (network or CORS). Use &quot;Open file&quot; below.
      </p>
    );
  }
  if (text === null) {
    return <p className="p-3 text-xs text-gray-500">Loading text preview…</p>;
  }
  return (
    <pre className="max-h-[min(70vh,560px)] overflow-auto whitespace-pre-wrap break-words bg-white p-3 text-xs text-gray-900">
      {text}
    </pre>
  );
}

function DocumentSubmissionPreview({
  fileUrl,
  fileName,
  fileSize,
}: {
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
}) {
  const mode = inferDocumentPreviewMode(fileUrl, fileName);
  const officeEmbedSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  return (
    <div className="mt-2 space-y-2">
      <div className="overflow-hidden rounded border border-gray-200 bg-gray-50">
        <p className="border-b border-gray-200 bg-gray-100 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
          Preview
        </p>
        {mode === 'pdf' && (
          <iframe
            title={fileName || 'Document preview'}
            src={fileUrl}
            className="h-[min(70vh,560px)] w-full border-0 bg-white"
          />
        )}
        {mode === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element -- external participant submission URL
          <img
            src={fileUrl}
            alt={fileName || 'Submission document'}
            className="max-h-[min(70vh,560px)] w-full bg-neutral-100 object-contain"
          />
        )}
        {mode === 'office' && (
          <iframe
            title={fileName || 'Document preview'}
            src={officeEmbedSrc}
            className="h-[min(70vh,560px)] w-full border-0 bg-white"
          />
        )}
        {mode === 'text' && <TextSubmissionPreview url={fileUrl} />}
        {mode === 'generic' && (
          <iframe
            title={fileName || 'Document preview'}
            src={fileUrl}
            className="h-[min(70vh,560px)] w-full border-0 bg-white"
          />
        )}
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-black"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a2 2 0 00-2.828-2.828L9 10.172 7.586 8.586a2 2 0 10-2.828 2.828l4 4a2 2 0 002.828 0L16.828 9.828a2 2 0 000-2.828z"
          />
        </svg>
        {fileName || 'Open file in new tab'}
        {fileSize != null && fileSize > 0 && (
          <span className="text-gray-500">({(fileSize / 1024).toFixed(2)} KB)</span>
        )}
        <span className="text-gray-500">· download / full view</span>
      </a>
    </div>
  );
}

const AssessmentDetail = ({ params }: ParticipantScoringProps) => {
  const { participantId } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { assessorId, token } = useAuth();
  const [participantDetails, setParticipantDetails] = useState<ParticipantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationData, setEvaluationData] = useState<EvaluationResponse | null>(null);
  // Removed unused averageScore state
  const [comments, setComments] = useState<Record<string, string>>({}); // assignmentId -> comments
  const [activityComments, setActivityComments] = useState<Record<string, string>>({}); // activityId -> comments
  /** activity -> competency -> subComp -> scoreKey (score1 | __numeric | …) -> comment */
  const [activitySubCompComments, setActivitySubCompComments] = useState<
    Record<string, Record<string, Record<string, Record<string, string>>>>
  >({});
  /** assignment -> competency -> subComp -> scoreKey -> comment */
  const [assignmentSubCompComments, setAssignmentSubCompComments] = useState<
    Record<string, Record<string, Record<string, Record<string, string>>>>
  >({});
  const [competencyScores, setCompetencyScores] = useState<Record<string, Record<string, Record<string, number>>>>({}); // assignmentId -> competencyId -> subCompetency -> score
  const [activityCompetencyScores, setActivityCompetencyScores] = useState<Record<string, Record<string, Record<string, number>>>>({}); // activityId -> competencyId -> subCompetency -> score
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [scoreStatus, setScoreStatus] = useState<Record<string, 'DRAFT' | 'SUBMITTED' | 'FINALIZED'>>({}); // assignmentId -> status
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assessmentCenterId, setAssessmentCenterId] = useState<string | null>(null);
  const [descriptors, setDescriptors] = useState<Record<string, Record<string, Record<string, Record<string, string>>>>>({}); // activityId -> competencyId -> subCompetency -> scoreKey -> description
  // activityId -> competencies toggled for that activity in the assessment-center config.
  // Lets the UI render all selected competencies even when rubric descriptors for some competencies are missing.
  const [activityCompetencyMap, setActivityCompetencyMap] = useState<
    Record<string, Array<{ id: string; competencyName: string; subCompetencyNames: string[] }>>
  >({});
  const [competencyAverages, setCompetencyAverages] = useState<Record<string, Record<string, number>>>({}); // assignmentId -> competencyId -> average
  const [activitySelectedScoreKeys, setActivitySelectedScoreKeys] = useState<Record<string, Record<string, Record<string, string>>>>({}); // activityId -> competencyId -> subCompetency -> scoreKey
  const [assignmentSelectedScoreKeys, setAssignmentSelectedScoreKeys] = useState<Record<string, Record<string, Record<string, string>>>>({}); // assignmentId -> competencyId -> subCompetency -> scoreKey
  const [editMode, setEditMode] = useState(false); // Whether in edit mode
  const [editReason, setEditReason] = useState(''); // Reason for editing

  const skipNextLeftActivityScrollRef = useRef(true);

  useEffect(() => {
    skipNextLeftActivityScrollRef.current = true;
  }, [selectedAssignmentId]);

  useEffect(() => {
    if (!selectedActivityId) return;
    const el = document.getElementById(`score-activity-${selectedActivityId}`);
    if (!el) return;
    if (skipNextLeftActivityScrollRef.current) {
      skipNextLeftActivityScrollRef.current = false;
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedActivityId]);

  // Get assessmentCenterId and edit mode from URL query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const centerId = params.get('assessmentCenterId');
      setAssessmentCenterId(centerId);
      const mode = params.get('mode');
      setEditMode(mode === 'edit');
    }
  }, []);

  useEffect(() => {
    const fetchParticipantDetails = async () => {
      if (!assessorId || !token) {
        setError('Assessor ID or token not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/assessors/${assessorId}/participants/${participantId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (result.success) {
          setParticipantDetails(result);
        } else {
          setError(result.message || 'Failed to fetch participant details');
        }
      } catch (err) {
        console.error('Error fetching participant details:', err);
        setError('An error occurred while fetching participant details');
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantDetails();
  }, [assessorId, token, participantId]);

  // Fetch assessment center descriptors when participant details are loaded
  useEffect(() => {
    const fetchAllDescriptors = async () => {
      if (!participantDetails?.data.assignments || !token) return;
      
      // Fetch descriptors for all unique assessment centers
      const uniqueAssessmentCenters = new Map<string, string>();
      participantDetails.data.assignments.forEach(assignment => {
        uniqueAssessmentCenters.set(assignment.assessmentCenter.id, assignment.assessmentCenter.id);
      });
      
      try {
        // Fetch descriptors for all assessment centers in parallel
        const descriptorPromises = Array.from(uniqueAssessmentCenters.values()).map(async (centerId) => {
          try {
            const response = await fetch(`/api/assessment-centers/${centerId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
              return {
                centerId,
                descriptors: result.data.descriptors || {},
                competencies: result.data.competencies || [],
                activities: result.data.activities || [],
              };
            }
            return null;
          } catch (err) {
            console.error(`Error fetching descriptors for center ${centerId}:`, err);
            return null;
          }
        });
        
        const results = await Promise.all(descriptorPromises);
        
        // Merge all descriptors into a single object + build activity -> competencies map
        const allDescriptors: Record<string, Record<string, Record<string, Record<string, string>>>> = {};
        const activityCompetencyAccumulator: Record<
          string,
          Array<{ id: string; competencyName: string; subCompetencyNames: string[] }>
        > = {};

        results.forEach(result => {
          if (result && result.descriptors) {
            Object.assign(allDescriptors, result.descriptors);
          }

          if (result && result.competencies && result.activities) {
            const competencyById = new Map<string, { id: string; competencyName: string; subCompetencyNames: string[] }>();
            (result.competencies as Array<any>).forEach((c) => {
              if (c && typeof c.id === 'string') {
                competencyById.set(c.id, {
                  id: c.id,
                  competencyName: c.competencyName,
                  subCompetencyNames: c.subCompetencyNames || [],
                });
              }
            });

            (result.activities as Array<any>).forEach((a) => {
              const activityId = a?.activityId;
              const competencyLibraryId = a?.competencyLibraryId;
              if (typeof activityId !== 'string' || typeof competencyLibraryId !== 'string') return;

              const comp = competencyById.get(competencyLibraryId);
              if (!comp) return;

              if (!activityCompetencyAccumulator[activityId]) {
                activityCompetencyAccumulator[activityId] = [];
              }

              const already = activityCompetencyAccumulator[activityId].some((x) => x.id === comp.id);
              if (!already) activityCompetencyAccumulator[activityId].push(comp);
            });
          }
        });

        setDescriptors(allDescriptors);
        setActivityCompetencyMap(activityCompetencyAccumulator);
      } catch (err) {
        console.error('Error fetching descriptors:', err);
      }
    };
    
    fetchAllDescriptors();
  }, [participantDetails, token]);

  // Helper function to get the correct competency for an activity based on descriptors
  const getCompetencyForActivity = (activityId: string, availableCompetencies: Array<{ id: string; competencyName: string; subCompetencyNames: string[] }>) => {
    // Check descriptors to find which competency is assigned to this activity
    const activityDescriptors = descriptors[activityId];
    if (activityDescriptors) {
      // Find the competency that has descriptors for this activity
      for (const competency of availableCompetencies) {
        if (activityDescriptors[competency.id]) {
          return competency;
        }
      }
    }
    // Fallback to first available competency if no descriptors found
    return availableCompetencies[0] || null;
  };

  // Some activities can have multiple competencies.
  // This returns all competencies that exist in `descriptors[activityId]` (plus the activity's own `competency`, if present).
  const getCompetenciesForActivity = (
    activityId: string,
    activityCompetency: { id: string; competencyName: string; subCompetencyNames: string[] } | undefined,
    availableCompetencies: Array<{ id: string; competencyName: string; subCompetencyNames: string[] }>
  ) => {
    const out: Array<{ id: string; competencyName: string; subCompetencyNames: string[] }> = [];
    const seen = new Set<string>();

    // Primary: show all competencies toggled for this activity in the assessment-center config.
    const mapped = activityCompetencyMap[activityId];
    if (mapped && mapped.length > 0) return mapped;

    if (activityCompetency?.id) {
      out.push(activityCompetency);
      seen.add(activityCompetency.id);
    }

    const activityDescriptors = descriptors[activityId];
    if (activityDescriptors) {
      for (const competency of availableCompetencies) {
        // Descriptors can be shaped either as:
        // 1) descriptors[activityId][competencyId]...
        // 2) descriptors[activityId]["activity-0"][competencyId]...
        const directHit = activityDescriptors[competency.id];

        const nestedHit =
          !directHit &&
          Object.values(activityDescriptors).some((v) => {
            if (!v || typeof v !== 'object') return false;
            return Object.prototype.hasOwnProperty.call(v, competency.id);
          });

        if (directHit || nestedHit) {
          if (!seen.has(competency.id)) {
            out.push(competency);
            seen.add(competency.id);
          }
        }
      }
    }

    if (out.length > 0) return out;
    const fallback = getCompetencyForActivity(activityId, availableCompetencies);
    return fallback ? [fallback] : [];
  };

  // Helper function to get score descriptions for a competency and sub-competency.
  // The backend descriptors can be nested like:
  // - descriptors[activityId][competencyId][subCompetency] = { score1..scoreN: string }
  // - descriptors[activityId]["activity-0"][competencyId][subCompetency] = { score1..scoreN: string }
  const getScoreDescriptions = (activityId: string, competencyId: string, subCompetency: string): Record<string, string> => {
    const activityNode = descriptors[activityId];
    if (!activityNode || typeof activityNode !== 'object') return {};

    // Direct shape: descriptors[activityId][competencyId][subCompetency]
    const direct = (activityNode as any)[competencyId]?.[subCompetency];
    if (direct && typeof direct === 'object') return direct as Record<string, string>;

    // Nested shape: descriptors[activityId]["activity-0" | ...][competencyId][subCompetency]
    for (const v of Object.values(activityNode as any)) {
      if (!v || typeof v !== 'object') continue;
      const nested = (v as any)[competencyId]?.[subCompetency];
      if (nested && typeof nested === 'object') return nested as Record<string, string>;
    }

    return {};
  };

  const getFirstActivityIdWithRubric = (
    assignment: NonNullable<ParticipantDetails['data']['assignments'][number]>,
    competencyId: string,
    subComp: string
  ): string | null => {
    for (const act of assignment.activities) {
      const d = getScoreDescriptions(act.activityId, competencyId, subComp);
      if (getSortedScoreKeysFromDescriptions(d).length > 0) return act.activityId;
    }
    return null;
  };

  // Initialize competency scores when participant details are loaded
  useEffect(() => {
    if (participantDetails?.data.assignments) {
      const initialScores: Record<string, Record<string, Record<string, number>>> = {};
      const initialActivityScores: Record<string, Record<string, Record<string, number>>> = {};
      const initialStatus: Record<string, 'DRAFT' | 'SUBMITTED' | 'FINALIZED'> = {};
      
      // Initialize scores for each assignment
      const initialActivityComments: Record<string, string> = {};
      const initialActivitySubComp: Record<string, Record<string, Record<string, Record<string, string>>>> = {};
      const initialAssignmentSubComp: Record<string, Record<string, Record<string, Record<string, string>>>> = {};

      participantDetails.data.assignments.forEach(assignment => {
        const assignmentId = assignment.assignmentId;
        initialScores[assignmentId] = {};
        const assessorScore = assignment.assessorScore as AssessorScore | null;
        initialStatus[assignmentId] = assessorScore?.status || 'DRAFT';
        
        // Load existing scores if available
        if (assessorScore) {
          const existingScores = assessorScore.competencyScores || {};
          Object.keys(existingScores).forEach(competencyId => {
            initialScores[assignmentId][competencyId] = {};
            Object.keys(existingScores[competencyId]).forEach(subComp => {
              initialScores[assignmentId][competencyId][subComp] = existingScores[competencyId][subComp];
            });
          });
          // Load existing comments
          if (assessorScore.overallComments) {
            setComments(prev => ({
              ...prev,
              [assignmentId]: assessorScore.overallComments || ''
            }));
          }
          // Load existing activity comments
          if (assessorScore.activityComments) {
            Object.keys(assessorScore.activityComments).forEach(activityId => {
              initialActivityComments[activityId] = assessorScore.activityComments![activityId];
            });
          }
          if (assessorScore.activitySubCompetencyComments) {
            const parsed = JSON.parse(
              JSON.stringify(assessorScore.activitySubCompetencyComments)
            ) as Record<string, Record<string, Record<string, unknown>>>;
            const merged = mergeActivitySubCompCommentsFromApi(parsed);
            Object.entries(merged).forEach(([aid, compMap]) => {
              if (!initialActivitySubComp[aid]) initialActivitySubComp[aid] = {};
              Object.entries(compMap).forEach(([cid, subMap]) => {
                if (!initialActivitySubComp[aid][cid]) initialActivitySubComp[aid][cid] = {};
                Object.entries(subMap).forEach(([sub, skMap]) => {
                  initialActivitySubComp[aid][cid][sub] = {
                    ...initialActivitySubComp[aid][cid][sub],
                    ...skMap
                  };
                });
              });
            });
          }
          if (assessorScore.assignmentSubCompetencyComments) {
            const parsed = JSON.parse(
              JSON.stringify(assessorScore.assignmentSubCompetencyComments)
            ) as Record<string, Record<string, unknown>>;
            initialAssignmentSubComp[assignmentId] = {
              ...initialAssignmentSubComp[assignmentId],
              ...mergeAssignmentSubCompCommentsFromApi(parsed)
            };
          }
          // Load competency averages if available
          if (assessorScore.competencyAverages) {
            console.log('Loading competencyAverages from API for assignment:', assignmentId, assessorScore.competencyAverages);
            setCompetencyAverages(prev => ({
              ...prev,
              [assignmentId]: assessorScore.competencyAverages || {}
            }));
          } else {
            console.log('No competencyAverages in API response for assignment:', assignmentId);
          }
          // Load activity selected score keys if available
          if (assessorScore.activitySelectedScoreKeys) {
            setActivitySelectedScoreKeys(prev => ({
              ...prev,
              ...assessorScore.activitySelectedScoreKeys
            }));
          }
          // Load assignment selected score keys if available
          if (assessorScore.assignmentSelectedScoreKeys) {
            setAssignmentSelectedScoreKeys(prev => ({
              ...prev,
              [assignmentId]: assessorScore.assignmentSelectedScoreKeys || {}
            }));
          }
        }
        
        // Initialize default scores for competencies not yet scored
        assignment.competencies.forEach(competency => {
          if (!initialScores[assignmentId][competency.id]) {
            initialScores[assignmentId][competency.id] = {};
          }
        competency.subCompetencyNames.forEach(subComp => {
            if (!initialScores[assignmentId][competency.id][subComp]) {
              initialScores[assignmentId][competency.id][subComp] = 0; // Default score
            }
        });
        competency.subCompetencyNames.forEach(subComp => {
            const rubricActivityId = getFirstActivityIdWithRubric(assignment, competency.id, subComp);
            if (!rubricActivityId) return;
            const keys = getSortedScoreKeysFromDescriptions(
              getScoreDescriptions(rubricActivityId, competency.id, subComp)
            );
            if (keys.length === 0) return;
            const v = initialScores[assignmentId][competency.id][subComp];
            initialScores[assignmentId][competency.id][subComp] = normalizeStoredToLevel(v ?? 0, keys.length);
        });
      });

        // Initialize per-activity competency scores
        // Some activities can have multiple competencies; initialize them all.
        assignment.activities.forEach(activity => {
          if (!initialActivityScores[activity.activityId]) {
            initialActivityScores[activity.activityId] = {};
          }
          const assignedCompetencies = getCompetenciesForActivity(
            activity.activityId,
            activity.competency,
            assignment.competencies
          );

          assignedCompetencies.forEach((assignedCompetency) => {
            if (!initialActivityScores[activity.activityId][assignedCompetency.id]) {
              initialActivityScores[activity.activityId][assignedCompetency.id] = {};
            }

            assignedCompetency.subCompetencyNames.forEach(subComp => {
              const d = getScoreDescriptions(activity.activityId, assignedCompetency.id, subComp);
              const keys = getSortedScoreKeysFromDescriptions(d);
              const existing = initialActivityScores[activity.activityId][assignedCompetency.id][subComp];

              if (keys.length > 0) {
                if (existing === undefined || existing === null) {
                  initialActivityScores[activity.activityId][assignedCompetency.id][subComp] = 0;
                } else if (existing === 5.0) {
                  initialActivityScores[activity.activityId][assignedCompetency.id][subComp] = 0;
                } else {
                  initialActivityScores[activity.activityId][assignedCompetency.id][subComp] = normalizeStoredToLevel(
                    existing,
                    keys.length
                  );
                }
              } else if (!initialActivityScores[activity.activityId][assignedCompetency.id][subComp]) {
                // No rubric descriptors => numeric scoring fallback should default to 0.
                initialActivityScores[activity.activityId][assignedCompetency.id][subComp] = 0;
              }
            });
          });
        });
      });

      setCompetencyScores(initialScores);
      setActivityCompetencyScores(initialActivityScores);
      setActivityComments(initialActivityComments);
      setActivitySubCompComments(initialActivitySubComp);
      setAssignmentSubCompComments(initialAssignmentSubComp);
      setScoreStatus(initialStatus);
      
      // Set assignment based on assessmentCenterId from URL, or first assignment
      if (participantDetails.data.assignments.length > 0) {
        let targetAssignment = participantDetails.data.assignments[0];
        
        // If assessmentCenterId is provided, find matching assignment
        if (assessmentCenterId) {
          const matchingAssignment = participantDetails.data.assignments.find(
            a => a.assessmentCenter.id === assessmentCenterId
          );
          if (matchingAssignment) {
            targetAssignment = matchingAssignment;
          }
        }
        
        setSelectedAssignmentId(targetAssignment.assignmentId);
        if (targetAssignment.activities.length > 0) {
          setSelectedActivityId(targetAssignment.activities[0].activityId);
        }
      }
    }
  }, [participantDetails, assessmentCenterId, descriptors]);

  const updateCompetencyScore = (assignmentId: string, competencyId: string, subCompetency: string, score: number) => {
    setCompetencyScores(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId] || {},
      [competencyId]: {
          ...(prev[assignmentId]?.[competencyId] || {}),
        [subCompetency]: score
        }
      }
    }));
  };

  const updateActivityCompetencyScore = (activityId: string, competencyId: string, subCompetency: string, score: number, scoreKey?: string) => {
    console.log('updateActivityCompetencyScore called:', { activityId, competencyId, subCompetency, score, scoreKey });
    setActivityCompetencyScores(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId] || {},
      [competencyId]: {
          ...(prev[activityId]?.[competencyId] || {}),
        [subCompetency]: score
        }
      }
    }));
    if (scoreKey) {
      console.log('Setting activitySelectedScoreKey:', { activityId, competencyId, subCompetency, scoreKey });
      setActivitySelectedScoreKeys(prev => ({
        ...prev,
        [activityId]: {
          ...(prev[activityId] || {}),
          [competencyId]: {
            ...(prev[activityId]?.[competencyId] || {}),
            [subCompetency]: scoreKey
          }
        }
      }));
    } else {
      console.log('No scoreKey provided for:', { activityId, competencyId, subCompetency });
    }
  };

  const setActivitySubCompComment = (
    activityId: string,
    competencyId: string,
    subComp: string,
    scoreKey: string,
    text: string
  ) => {
    setActivitySubCompComments(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [competencyId]: {
          ...prev[activityId]?.[competencyId],
          [subComp]: {
            ...(prev[activityId]?.[competencyId]?.[subComp] || {}),
            [scoreKey]: text
          }
        }
      }
    }));
  };

  const setAssignmentSubCompComment = (
    assignmentId: string,
    competencyId: string,
    subComp: string,
    scoreKey: string,
    text: string
  ) => {
    setAssignmentSubCompComments(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [competencyId]: {
          ...prev[assignmentId]?.[competencyId],
          [subComp]: {
            ...(prev[assignmentId]?.[competencyId]?.[subComp] || {}),
            [scoreKey]: text
          }
        }
      }
    }));
  };

  const submitScores = async (assignmentId: string, status: 'DRAFT' | 'SUBMITTED') => {
    if (!participantDetails?.data || !assessorId || !token) {
      setError('Missing required data for score submission');
      return;
    }

    setIsSubmittingScore(true);
    setError(null);

    try {
      const assignment = participantDetails.data.assignments.find(a => a.assignmentId === assignmentId);
      if (!assignment) {
        throw new Error('No assignment data available');
      }

      // Calculate competency-level averages
      const competencyAverages: Record<string, number> = {};
      console.log('Calculating competencyAverages for assignment:', assignmentId);
      console.log('activityCompetencyScores:', activityCompetencyScores);
      assignment.competencies.forEach(competency => {
        let sum = 0;
        let count = 0;
        assignment.activities.forEach(activity => {
          const assignedCompetencies = getCompetenciesForActivity(
            activity.activityId,
            activity.competency,
            assignment.competencies
          );
          const isCompetencyAssigned = assignedCompetencies.some(c => c.id === competency.id);
          if (isCompetencyAssigned) {
            const avg = averageSubCompetencyScores(
              competency.subCompetencyNames,
              activityCompetencyScores[activity.activityId]?.[competency.id]
            );
            console.log(`Competency ${competency.id} (${competency.competencyName}), Activity ${activity.activityId}, avg:`, avg);
            if (avg !== null) {
              sum += avg;
              count++;
            }
          }
        });
        if (count > 0) {
          competencyAverages[competency.id] = sum / count;
          console.log(`Final average for competency ${competency.id}:`, competencyAverages[competency.id]);
        } else {
          console.log(`No scores for competency ${competency.id}`);
        }
      });
      console.log('Final competencyAverages object:', competencyAverages);

      const payload = {
        participantId: participantDetails.data.participant.id,
        assessorId: assessorId,
        assessmentCenterId: assignment.assessmentCenter.id,
        competencyScores: competencyScores[assignmentId] || {},
        activityCompetencyScores: activityCompetencyScores, // Include per-activity scores
        activityComments: activityComments, // Include per-activity comments
        activitySubCompetencyComments: activitySubCompComments,
        assignmentSubCompetencyComments: assignmentSubCompComments[assignmentId] || {},
        overallComments: comments[assignmentId] || '',
        competencyAverages: competencyAverages, // Include competency-level averages
        activitySelectedScoreKeys: activitySelectedScoreKeys, // Include selected tick marks for activities
        assignmentSelectedScoreKeys: assignmentSelectedScoreKeys[assignmentId] || {}, // Include selected tick marks for assignment
        editReason: editMode ? editReason : undefined, // Include edit reason if in edit mode
        status: status
      };

      console.log('Submitting scores payload:', payload);

      // POST will auto-create or auto-update existing scores
      const response = await fetch('/api/assessors/scores', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('API response after score submission:', result);

      if (result.success) {
        setScoreStatus(prev => ({ ...prev, [assignmentId]: status }));
        alert(`Scores ${status === 'DRAFT' ? 'saved as draft' : 'submitted'} successfully for ${assignment.assessmentCenter.displayName}!`);
        // Redirect to /assessor/assess after submission
        router.push('/assessor/assess');
      } else {
        throw new Error(result.message || 'Failed to submit scores');
      }
    } catch (err) {
      console.error('Error submitting scores:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while submitting scores');
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      if (!participantDetails?.data || !assessorId || !token) {
        throw new Error('Missing required data for report generation');
      }

      const assignment = participantDetails.data.assignments[0];
      if (!assignment) {
        throw new Error('No assignment data available');
      }

      console.log('Generating PDF report...');
      
      // Call the report generation API with actual data
      const reportResponse = await fetch('/api/report-structures/generate-from-assessment-center', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: participantDetails.data.participant.id,
          assessorId: assessorId,
          assessmentCenterId: assignment.assessmentCenter.id,
          reportTemplateName: assignment.assessmentCenter.reportTemplateName,
          reportTemplateType: assignment.assessmentCenter.reportTemplateType,
        }),
      });

      if (!reportResponse.ok) {
        const errorData = await reportResponse.json().catch(() => ({ message: 'Failed to generate report' }));
        throw new Error(errorData.message || `Failed to generate report: ${reportResponse.status}`);
      }

      const reportBlob = await reportResponse.blob();
      
      // Create a download link and trigger download
      const downloadUrl = window.URL.createObjectURL(reportBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      const reportFileName = `${assignment.assessmentCenter.displayName || assignment.assessmentCenter.name}_${participantDetails.data.participant.name}_Report.pdf`.replace(/[^a-z0-9]/gi, '_');
      downloadLink.download = reportFileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(downloadUrl);
      console.log('PDF report downloaded successfully');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating the report');
      console.error('Error generating report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateInterview = async () => {
    setIsEvaluating(true);
    setError(null);
    
    try {
      // Create a FormData object to send the video file
      const formData = new FormData();
      
      // Get the first video submission from activities
      const videoActivity = participantDetails?.data.assignments[0]?.activities.find(
        a => Boolean(a.submission) && (a.submission as { submissionType?: string })?.submissionType === 'VIDEO'
      );
      
      if (!videoActivity || !videoActivity.submission) {
        throw new Error('No video submission found for evaluation');
      }
      
      const submission = videoActivity.submission as { fileUrl?: string; fileName?: string };
      
      if (!submission.fileUrl) {
        throw new Error('Video file URL not available');
      }
      
      console.log('Fetching video file for evaluation from:', submission.fileUrl);
      
      // Fetch the video file from the submission URL
      const response = await fetch(submission.fileUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video file: ${response.status} ${response.statusText}`);
      }
      
      const videoBlob = await response.blob();
      console.log('Video blob size:', videoBlob.size, 'bytes');
      console.log('Video blob type:', videoBlob.type);
      
      // Create a proper File object with the correct name and type
      const videoFile = new File([videoBlob], submission.fileName || 'video.mp4', { 
        type: videoBlob.type || 'video/mp4',
        lastModified: Date.now()
      });
      
      console.log('Created video file:', videoFile.name, videoFile.size, 'bytes');
      
      // Append the video file to FormData
      formData.append('video', videoFile);
      
      console.log('FormData entries:');
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      console.log('Making API call for evaluation...');
      
      // Use environment variable for API URL or default to localhost
      const evaluationApiUrl = process.env.NEXT_PUBLIC_EVALUATION_API_URL || 'http://127.0.0.1:5001/evaluate-interview';
      
      // Make the API call with proper headers
      const apiResponse = await fetch(evaluationApiUrl, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it with boundary for FormData
      });

      console.log('API Response status:', apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`API call failed: ${apiResponse.status} ${apiResponse.statusText} - ${errorText}`);
      }

      const result: EvaluationResponse = await apiResponse.json();
      console.log('API Response:', result);
      setEvaluationData(result);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while evaluating the interview');
      console.error('Error evaluating interview:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading participant details...</p>
        </div>
      </div>
    );
  }

  if (error || !participantDetails || !participantDetails.data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold mb-3 text-black">Error Loading Participant</h1>
          <p className="text-sm text-red-600 mb-4">{error || 'Invalid participant data received'}</p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-black text-sm"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const ParticipantCard = () => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-black">
            {participantDetails.data.participant.name}
          </h2>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-600 hover:text-black text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
        <p className="text-xs text-gray-600 mb-0.5">Email: {participantDetails.data.participant.email}</p>
        <p className="text-xs text-gray-600 mb-0.5">
          {participantDetails.data.participant.designation} • Manager: {participantDetails.data.participant.managerName}
        </p>
        {selectedAssignmentId && (() => {
          const selectedAssignment = participantDetails.data.assignments.find(a => a.assignmentId === selectedAssignmentId);
          if (!selectedAssignment) return null;
          return (
          <p className="text-xs text-gray-600 mt-1">
              Assessment: {selectedAssignment.assessmentCenter.displayName} • 
              Activities: {selectedAssignment.activities.map(a => a.displayName || a.activityDetail.name).join(', ')}
          </p>
          );
        })()}
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
        <div className="flex gap-2">
          <button 
            onClick={generateReport}
            disabled={isGenerating || isEvaluating}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate report'
            )}
          </button>
          <button 
            onClick={evaluateInterview}
            disabled={isGenerating || isEvaluating}
            className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Evaluating...
              </>
            ) : (
              'Evaluate'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const EvaluationResults = () => {
    if (!evaluationData) return null;

    return (
      <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-black">Interview Evaluation Report</h3>
          <div className="text-right">
            <p className="text-sm font-bold text-black">Overall Score: {evaluationData.overall_score}</p>
            <p className="text-xs text-gray-600">Average: {evaluationData.summary.average_score}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {evaluationData.evaluations.map((evaluation, index) => (
            <div key={index} className="border border-gray-200 rounded p-3">
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="font-medium text-sm text-black">{evaluation.metric}</h4>
                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded text-black border border-gray-200">
                  {evaluation.score}
                </span>
              </div>
              <p className="text-xs text-gray-700">{evaluation.reasoning}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs text-gray-600 pt-3 border-t border-gray-200">
          <p>Report generated for: {evaluationData.filename}</p>
          <p>Total metrics evaluated: {evaluationData.summary.total_metrics}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Title & Participant */}
        <ParticipantCard />

        {/* Error Display */}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800 text-xs">{error}</p>
          </div>
        )}

        {/* Only show assignment selector if assessmentCenterId not provided and multiple assignments exist */}
        {!assessmentCenterId && participantDetails.data.assignments.length > 1 && (
          <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <h3 className="text-sm font-semibold mb-2 text-black">Select Assessment Center</h3>
            <div className="flex gap-2 flex-wrap">
              {participantDetails.data.assignments.map((assignment) => (
                <button
                  key={assignment.assignmentId}
                  onClick={() => {
                    setSelectedAssignmentId(assignment.assignmentId);
                    if (assignment.activities.length > 0) {
                      setSelectedActivityId(assignment.activities[0].activityId);
                    }
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    selectedAssignmentId === assignment.assignmentId
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {assignment.assessmentCenter.displayName}
                  <span className="ml-1.5 text-xs opacity-75">
                    ({assignment.submissionCount}/{assignment.totalActivities})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Two-column layout */}
        {selectedAssignmentId && (() => {
          const selectedAssignment = participantDetails.data.assignments.find(
            a => a.assignmentId === selectedAssignmentId
          );
          
          if (!selectedAssignment) return null;

          // Use stored competencyAverages if available, otherwise calculate on the fly
          const competencyAveragesList: Array<{ id: string; name: string; average: number | null }> = [];
          console.log('Displaying competency averages for assignment:', selectedAssignmentId);
          console.log('Current competencyAverages state:', competencyAverages);
          console.log('Current activityCompetencyScores:', activityCompetencyScores);

          const storedAverages = competencyAverages[selectedAssignmentId] || {};

          selectedAssignment.competencies.forEach(competency => {
            // Use stored average if available
            if (storedAverages[competency.id] !== undefined) {
              competencyAveragesList.push({
                id: competency.id,
                name: competency.competencyName.split('\t')[0] || competency.competencyName,
                average: storedAverages[competency.id]
              });
            } else {
              // Fallback to calculation if not stored
              let sum = 0;
              let count = 0;
              selectedAssignment.activities.forEach(activity => {
                const assignedCompetencies = getCompetenciesForActivity(
                  activity.activityId,
                  activity.competency,
                  selectedAssignment.competencies
                );
                const isCompetencyAssigned = assignedCompetencies.some(c => c.id === competency.id);
                if (isCompetencyAssigned) {
                  const avg = averageSubCompetencyScores(
                    competency.subCompetencyNames,
                    activityCompetencyScores[activity.activityId]?.[competency.id]
                  );
                  if (avg !== null) {
                    sum += avg;
                    count++;
                  }
                }
              });
              competencyAveragesList.push({
                id: competency.id,
                name: competency.competencyName.split('\t')[0] || competency.competencyName,
                average: count > 0 ? sum / count : null
              });
            }
          });
          console.log('Final competencyAveragesList for display:', competencyAveragesList);

          return (
        <div className="mt-4 flex flex-col gap-3">
                {competencyAveragesList.length > 0 && competencyAveragesList.some(c => c.average !== null) && (
                  <div className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-3">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Competency Averages</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {competencyAveragesList.map(comp => (
                        <div key={comp.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">{comp.name}</span>
                          <span className="font-semibold tabular-nums text-black">
                            {formatCompetencyAverage(comp.average)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
        <div className="flex min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4 lg:h-[min(1200px,calc(100vh-9rem))]">
          {/* Competency Section */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-black">{selectedAssignment.assessmentCenter.displayName}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{selectedAssignment.assessmentCenter.description}</p>
                </div>
                
                {/* Activity-based Competency Scoring */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-black mb-2">Score by Activity</h4>
                  {selectedAssignment.activities
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((activity) => {
                      // Some activities can have multiple competencies (e.g. both C5 and C1).
                      const assignedCompetencies = getCompetenciesForActivity(
                        activity.activityId,
                        activity.competency,
                        selectedAssignment.competencies
                      );
                      const firstCompetency = assignedCompetencies[0];
                      const activityCompAvg =
                        firstCompetency &&
                        averageSubCompetencyScores(
                          firstCompetency.subCompetencyNames,
                          activityCompetencyScores[activity.activityId]?.[firstCompetency.id]
                        );
                      const isActivitySelected = selectedActivityId === activity.activityId;

                      return (
                      <div
                        key={activity.activityId}
                        id={`score-activity-${activity.activityId}`}
                        className={`mb-3 rounded p-2.5 transition-colors ${
                          isActivitySelected
                            ? 'border border-gray-300 bg-gray-50/90 shadow-sm'
                            : 'border border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div
                          className="mb-1.5 flex cursor-pointer items-center justify-between rounded-sm outline-none hover:bg-black/5"
                          onClick={() => setSelectedActivityId(activity.activityId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedActivityId(activity.activityId);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isActivitySelected}
                          aria-label={`Select activity ${activity.displayName || activity.activityDetail.name}`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm text-black">{activity.displayName || activity.activityDetail.name}</p>
                              {(() => {
                                const badge = getInteractiveActivityTypeBadge(activity.activityDetail.interactiveActivityType);
                                return badge ? (
                                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <p className="text-xs text-gray-600">
                              {assignedCompetencies.length > 0 ? (
                                <span className="font-medium text-black">
                                  {assignedCompetencies.map((c) => {
                                    const compAvg = averageSubCompetencyScores(
                                      c.subCompetencyNames,
                                      activityCompetencyScores[activity.activityId]?.[c.id]
                                    );
                                    return (
                                      <span key={c.id}>
                                        {c.competencyName.split('\t')[0]}
                                        {compAvg !== null && (
                                          <span className="ml-1.5 tabular-nums text-gray-800">
                                            ({formatCompetencyAverage(compAvg)})
                                          </span>
                                        )}
                                      </span>
                                    );
                                  }).reduce((prev, curr) => (
                                    <>
                                      {prev}
                                      <span className="mx-1 text-gray-400">·</span>
                                      {curr}
                                    </>
                                  ))}
                                </span>
                              ) : (
                                <span className="font-medium text-black">No Competency</span>
                              )}
                            </p>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${
                            Boolean(activity.submission) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {Boolean(activity.submission) ? 'Submitted' : 'Pending'}
                          </span>
                        </div>
                            {assignedCompetencies.length > 0 && (
                          <div className="mt-2 space-y-3">
                            {assignedCompetencies.map((assignedCompetency) => (
                              <div key={assignedCompetency.id} className="space-y-1.5">
                                <p className="text-xs font-semibold text-black">
                                  {assignedCompetency.competencyName.split('\t')[0] || assignedCompetency.competencyName}
                                </p>
                                <div className="mt-2 space-y-1.5">
                            {assignedCompetency.subCompetencyNames.map((subComp, idx) => {
                              // subCompetencyName strings may include "\t<description>".
                              // For the UI summary we show only the title portion.
                              const subCompTitle = subComp.split('\t')[0] || subComp;
                              const scoreDescriptions = getScoreDescriptions(activity.activityId, assignedCompetency.id, subComp);
                              const scoreKeys = getSortedScoreKeysFromDescriptions(scoreDescriptions);
                              const currentScore = activityCompetencyScores[activity.activityId]?.[assignedCompetency.id]?.[subComp] ?? 0;
                              const selectedScoreKey = activitySelectedScoreKeys[activity.activityId]?.[assignedCompetency.id]?.[subComp];
                              // Disable editing if score is submitted/finalized and not in edit mode
                              const isScoreSubmitted = scoreStatus[selectedAssignmentId] === 'SUBMITTED' || scoreStatus[selectedAssignmentId] === 'FINALIZED';
                              const isDisabled = isScoreSubmitted && !editMode;

                              if (scoreKeys.length > 0) {
                                return (
                                  <details key={idx} open={idx === 0} className="group">
                                    <summary className="cursor-pointer select-none text-xs font-medium text-black hover:text-gray-900">
                                      {subCompTitle}
                                    </summary>
                                    <div className="mt-2">
                                      <RubricScorePicker
                                        scoreDescriptions={scoreDescriptions}
                                        currentScore={currentScore}
                                        subCompLabel={subCompTitle}
                                        selectedScoreKey={selectedScoreKey}
                                        disabled={isDisabled}
                                        onSelectLevel={(level, scoreKey) =>
                                          updateActivityCompetencyScore(
                                            activity.activityId,
                                            assignedCompetency.id,
                                            subComp,
                                            level,
                                            scoreKey
                                          )
                                        }
                                        scoreCommentsByKey={
                                          activitySubCompComments[activity.activityId]?.[assignedCompetency.id]?.[subComp] ??
                                          {}
                                        }
                                        onScoreCommentChange={(scoreKey, text) =>
                                          setActivitySubCompComment(
                                            activity.activityId,
                                            assignedCompetency.id,
                                            subComp,
                                            scoreKey,
                                            text
                                          )
                                        }
                                      />
                                    </div>
                                  </details>
                                );
                              }

                              return (
                                <details key={idx} open={idx === 0} className="group">
                                  <summary className="cursor-pointer select-none text-xs font-medium text-black hover:text-gray-900">
                                    {subCompTitle}
                                  </summary>
                                  <div className="mt-2 bg-white p-2 rounded border border-gray-200">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs font-medium text-black">{subCompTitle}</label>
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          min="0"
                                          max="10"
                                          step="0.5"
                                          value={currentScore || 0}
                                          onChange={(e) => updateActivityCompetencyScore(
                                            activity.activityId,
                                            assignedCompetency.id,
                                            subComp,
                                            parseFloat(e.target.value) || 0
                                          )}
                                          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                        />
                                        <span className="text-xs text-gray-600">/10</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 border-t border-gray-200 pt-2">
                                      <label className="mb-1 block text-xs font-medium text-gray-700">
                                        Comment for “{subCompTitle}” <span className="font-normal text-gray-500">(numeric score)</span>
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={getCommentForScoreKey(
                                          activitySubCompComments[activity.activityId]?.[assignedCompetency.id]?.[subComp],
                                          NUMERIC_SCORE_COMMENT_KEY
                                        )}
                                        onChange={(e) =>
                                          setActivitySubCompComment(
                                            activity.activityId,
                                            assignedCompetency.id,
                                            subComp,
                                            NUMERIC_SCORE_COMMENT_KEY,
                                            e.target.value
                                          )
                                        }
                                        className="w-full rounded border border-gray-300 p-2 text-xs text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                                        placeholder={`Comment for this 0–10 score (“${subCompTitle}”)…`}
                                      />
                                    </div>
                                  </div>
                                </details>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      </div>
                    )}
                      </div>
                    );
                    })}
                </div>

                <div className="border-t border-gray-200 pt-3">
                  {selectedAssignmentId && (scoreStatus[selectedAssignmentId] === 'SUBMITTED' || scoreStatus[selectedAssignmentId] === 'FINALIZED') ? (
                    editMode ? (
                      <div className="space-y-2">
                        <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded text-xs flex items-center justify-center gap-1.5 font-medium">
                          <Edit className="h-3.5 w-3.5" />
                          Edit Mode - Make your changes below
                        </div>
                        <textarea
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="Please explain why you are editing this score..."
                          className="w-full border border-gray-300 rounded px-3 py-2 text-xs text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                          rows={3}
                        />
                        <button
                          onClick={() => submitScores(selectedAssignmentId, 'SUBMITTED')}
                          disabled={isSubmittingScore || !editReason}
                          className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-3 py-2 rounded text-xs flex items-center justify-center gap-1.5 font-medium"
                        >
                          {isSubmittingScore ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Submitting Edit...
                            </>
                          ) : (
                            'Submit Edited Score'
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="w-full bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs flex items-center justify-center gap-1.5 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Score {scoreStatus[selectedAssignmentId] === 'FINALIZED' ? 'Finalized' : 'Submitted'}
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => submitScores(selectedAssignmentId, 'SUBMITTED')}
                      disabled={isSubmittingScore}
                      className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white px-3 py-2 rounded text-xs flex items-center justify-center gap-1.5 font-medium"
                    >
                      {isSubmittingScore ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Submitting Final...
                        </>
                      ) : (
                        'Submit Final Score'
                      )}
                    </button>
                  )}
                </div>

                </div>
          </div>
          </div>

          {/* Submissions Section */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-semibold text-black">Submissions</h3>
              <p className="text-xs text-black">
                    {selectedAssignment.submissionCount || 0}/{selectedAssignment.totalActivities || 0} Submitted
              </p>
            </div>
            
                {/* Activity Tabs */}
                <div className="mb-3 border-b border-gray-300">
                  <div className="flex gap-0 overflow-x-auto">
                    {selectedAssignment.activities
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((activity, index) => {
                        const activityWithSubs = activity as ActivityWithSubmissions;
                        const allSubmissions = activityWithSubs.allSubmissions || [];
                        const hasSubmissions = allSubmissions.length > 0 || Boolean(activity.submission);
                        const isSelected = selectedActivityId === activity.activityId;
                        
                        return (
                          <button
                            key={activity.activityId}
                            onClick={() => setSelectedActivityId(activity.activityId)}
                            className={`relative px-3 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                              isSelected
                                ? 'text-black border-b-2 border-black bg-white'
                                : 'text-gray-600 hover:text-black hover:bg-gray-50'
                            } ${index === 0 ? 'ml-0' : ''}`}
                          >
                            {activity.displayName || activity.activityDetail.name}
                            {hasSubmissions && (
                              <span className="ml-1.5 text-xs bg-gray-800 text-white px-1 py-0.5 rounded">
                                {allSubmissions.length || 1}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Selected Activity Content */}
                {selectedActivityId && (() => {
                  const selectedActivity = selectedAssignment.activities.find(
                    a => a.activityId === selectedActivityId
                  );
              
              if (!selectedActivity) return null;
              
              const selectedActivityWithSubs = selectedActivity as ActivityWithSubmissions;
              const allSubmissions = selectedActivityWithSubs.allSubmissions || [];
              
              interface Submission {
                id: string;
                parentSubmissionId?: string;
                createdAt?: string;
                submittedAt?: string;
                replies?: Submission[];
              }
              
              const sortedSubmissions = [...allSubmissions].sort((a: Submission, b: Submission) => 
                new Date(a.createdAt || a.submittedAt || 0).getTime() - new Date(b.createdAt || b.submittedAt || 0).getTime()
              );

              // Build thread hierarchy
              const buildThread = (submissions: Submission[]): Submission[] => {
                const submissionMap = new Map<string, Submission>();
                const rootSubmissions: Submission[] = [];

                submissions.forEach(sub => {
                  submissionMap.set(sub.id, sub);
                });

                submissions.forEach(sub => {
                  if (!sub.parentSubmissionId) {
                    rootSubmissions.push(sub);
                  }
                });

                const addChildren = (parent: Submission): Submission => {
                  const children = submissions.filter(s => s.parentSubmissionId === parent.id);
                  return {
                    ...parent,
                    replies: children.map(child => addChildren(child))
                  };
                };

                return rootSubmissions.map(root => addChildren(root));
              };

              const threadStructure = buildThread(sortedSubmissions);

              return (
                <div className="space-y-3">
                  {/* Submissions only (activity context is on the left) */}
                  {sortedSubmissions.length > 0 ? (
                <div className="space-y-3">
                      <h5 className="font-medium text-sm text-black">Submissions ({sortedSubmissions.length})</h5>
                      
                      {selectedActivity.activityType === 'INBOX_ACTIVITY' ? (
                        /* Email Thread View */
                        <div className="space-y-3">
                          {threadStructure.map((thread: Submission) => {
                            interface EmailSubmission extends Submission {
                              notes?: string;
                              textContent?: string;
                              submissionStatus?: string;
                              fileName?: string;
                            }
                            
                            const renderSubmission = (sub: EmailSubmission, depth: number = 0) => {
                              try {
                                const notes = sub.notes ? JSON.parse(sub.notes) : {};
                                const subject = notes.subject || 'Email Reply';
                                const to = notes.to || [];
                                const cc = notes.cc || [];
                                
                                return (
                                  <div key={sub.id} className={`bg-white border border-gray-200 rounded p-3 ${depth > 0 ? 'ml-6 border-l-2 border-l-gray-300' : ''}`}>
                                    <div className="flex justify-between items-start mb-1.5">
                    <div>
                                        <p className="font-semibold text-sm text-black">{subject}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">
                                          {Array.isArray(to) ? to.join(', ') : to}
                                          {cc && cc.length > 0 && ` | CC: ${Array.isArray(cc) ? cc.join(', ') : cc}`}
                                        </p>
                      </div>
                                      <div className="text-right">
                                        <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                          sub.submissionStatus === 'SUBMITTED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                          {sub.submissionStatus || 'SUBMITTED'}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {new Date(sub.submittedAt || sub.createdAt || Date.now()).toLocaleString()}
                                        </p>
                            </div>
                          </div>
                                    <div 
                                      className="prose prose-sm max-w-none text-xs text-gray-800 mt-2 p-2 bg-gray-50 rounded border border-gray-200"
                                      dangerouslySetInnerHTML={{ __html: sub.textContent || '<p>No content</p>' }}
                                    />
                                    {sub.fileName && (
                                      <div className="mt-1.5 text-xs text-gray-700 flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a2 2 0 00-2.828-2.828L9 10.172 7.586 8.586a2 2 0 10-2.828 2.828l4 4a2 2 0 002.828 0L16.828 9.828a2 2 0 000-2.828z" />
                                        </svg>
                                        {sub.fileName}
                                      </div>
                                    )}
                                    {sub.replies && sub.replies.length > 0 && (
                                      <div className="mt-3">
                                        {sub.replies.map((reply: EmailSubmission) => renderSubmission(reply, depth + 1))}
                                      </div>
                                    )}
                                  </div>
                                );
                              } catch {
                                return (
                                  <div key={sub.id} className={`bg-white border border-gray-200 rounded p-3 ${depth > 0 ? 'ml-6 border-l-2 border-l-gray-300' : ''}`}>
                                    <div className="flex justify-between items-start mb-1.5">
                                      <p className="font-semibold text-sm text-black">Submission</p>
                                      <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                        sub.submissionStatus === 'SUBMITTED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                      }`}>
                                        {sub.submissionStatus || 'SUBMITTED'}
                                      </span>
                                    </div>
                                    <div 
                                      className="prose prose-sm max-w-none text-xs text-gray-800 mt-2"
                                      dangerouslySetInnerHTML={{ __html: sub.textContent || '<p>No content</p>' }}
                                    />
                                  </div>
                                );
                              }
                            };
                            
                            return renderSubmission(thread);
                          })}
                    </div>
                  ) : (
                        /* Case Study or Other Activity Types */
                        <div className="space-y-2.5">
                          {sortedSubmissions.map((sub: Submission & { submissionType?: string; submissionStatus?: string; fileUrl?: string; fileName?: string; fileSize?: number; textContent?: string; notes?: string }) => (
                            <div key={sub.id} className="bg-white border border-gray-200 rounded p-3">
                              <div className="flex justify-between items-start mb-1.5">
                                <div>
                                  <p className="font-semibold text-sm text-black">{selectedActivity.displayName || selectedActivity.activityDetail.name}</p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    Type: {sub.submissionType || 'TEXT'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                    sub.submissionStatus === 'SUBMITTED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  }`}>
                                    {sub.submissionStatus || 'SUBMITTED'}
                                  </span>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {new Date(sub.submittedAt || sub.createdAt || Date.now()).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              {sub.submissionType === 'VIDEO' && sub.fileUrl && (
                                <div className="mt-2">
                                  <video controls className="w-full h-48 bg-black rounded" preload="metadata">
                                    <source src={sub.fileUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                  </video>
                                  {sub.fileName && <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a2 2 0 00-2.828-2.828L9 10.172 7.586 8.586a2 2 0 10-2.828 2.828l4 4a2 2 0 002.828 0L16.828 9.828a2 2 0 000-2.828z" />
                                    </svg>
                                    {sub.fileName}
                                  </p>}
                    </div>
                  )}
                              
                              {sub.submissionType === 'DOCUMENT' && sub.fileUrl && (
                                <DocumentSubmissionPreview
                                  fileUrl={sub.fileUrl}
                                  fileName={sub.fileName}
                                  fileSize={sub.fileSize}
                                />
                              )}
                              
                              {sub.submissionType === 'TEXT' && sub.textContent && (
                                <div 
                                  className="prose prose-sm max-w-none text-xs text-gray-800 mt-2 p-2 bg-gray-50 rounded border border-gray-200"
                                  dangerouslySetInnerHTML={{ __html: sub.textContent }}
                                />
                              )}
                              
                              {sub.notes && (
                            <div className="mt-1.5 text-xs text-gray-600">
                                  <p><strong className="text-black">Notes:</strong> {sub.notes}</p>
                            </div>
                          )}
                        </div>
                          ))}
                    </div>
                  )}
                </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-gray-500">
                      <p>No submissions yet for this activity</p>
                </div>
              )}
            </div>
              );
            })()}
                </div>
          </div>
          </div>
        </div>
        </div>
          );
        })()}

        {/* Evaluation Results */}
        <EvaluationResults />
      </div>
    </div>
  );
};

export default AssessmentDetail;