"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { downloadParticipantReportPdf } from '@/lib/reports/participantReportPdf';

import {
  NUMERIC_SCORE_COMMENT_KEY,
  averageSubCompetencyScores,
  deriveProgressStatus,
  getActivityProgress,
  getCompetencyProgress,
  getCompetencyScoreTotals,
  getSortedScoreKeysFromDescriptions,
  getSubCompetencyScore,
  mergeActivitySubCompCommentsFromApi,
  mergeAssignmentSubCompCommentsFromApi,
  normalizeStoredToLevel,
  sumScoreTotals,
  toPercent,
} from './lib/rubric';
import {
  createObservationId,
  observationsForSubCompetency,
  summarizeObservations,
} from './lib/observations';
import type { Observation, ObservationsByActivity } from './lib/observations';
import type {
  AssessorScore,
  ActivityWithSubmissions,
  EvaluationResponse,
  ParticipantDetails,
  SubmissionRecord,
} from './lib/types';
import EvaluationResults from './components/EvaluationResults';
import EvidencePanel from './components/EvidencePanel';
import FinalSummaryModal from './components/FinalSummaryModal';
import type { FinalSummaryRow } from './components/FinalSummaryModal';
import ProgressSidebar from './components/ProgressSidebar';
import type { ProgressCompetency } from './components/ProgressSidebar';
import ScoringForm from './components/ScoringForm';
import type { ReportDescriptorState } from './components/ScoringForm';
import ScoringTopBar from './components/ScoringTopBar';
import type { TopBarActivity } from './components/ScoringTopBar';


interface ParticipantScoringProps {
  params: Promise<{ id: string; participantId: string }>;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  GD: 'Group Discussion',
  GROUP_DISCUSSION: 'Group Discussion',
  ROLEPLAY: 'Roleplay',
  ROLE_PLAY: 'Roleplay',
  CASE_STUDY: 'Case Study',
  INBOX_ACTIVITY: 'Inbox Activity',
  INTERVIEW: 'Interview',
  PRESENTATION: 'Presentation',
};

/** "GROUP_DISCUSSION" -> "Group Discussion", for the activity picker subtitle. */
function readableActivityType(activityType: string, interactiveActivityType?: string): string {
  const raw = interactiveActivityType || activityType || '';
  if (!raw) return 'Activity';
  return (
    ACTIVITY_TYPE_LABELS[raw] ??
    raw
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function readableSubmissionType(submissionType?: string): string {
  switch (submissionType) {
    case 'VIDEO':
      return 'Video';
    case 'DOCUMENT':
      return 'Document';
    case 'TEXT':
      return 'Text';
    default:
      return 'Submission';
  }
}


const AssessmentDetail = ({ params }: ParticipantScoringProps) => {
  const { participantId } = React.use(params);
  const router = useRouter();
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

  // Scoring navigation — UI only, never persisted.
  const [activeCompetencyId, setActiveCompetencyId] = useState<string | null>(null);
  const [activeSubCompIndex, setActiveSubCompIndex] = useState(0);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'DRAFT' | 'SUBMITTED' | null>(null);

  /** Assessor observations against the evidence. Held in the UI only — never sent to the API. */
  const [observations, setObservations] = useState<ObservationsByActivity>({});
  /**
   * Report descriptor overrides, keyed `activityId|competencyId|subCompetency`.
   * UI only: with no override the text mirrors the selected rubric descriptor.
   */
  const [reportDescriptors, setReportDescriptors] = useState<
    Record<string, { text: string; include: boolean; edited: boolean }>
  >({});

  useEffect(() => {
    setActiveCompetencyId(null);
    setActiveSubCompIndex(0);
    setActiveSubmissionId(null);
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

  const handleSelectLevel = (
    activityId: string,
    competencyId: string,
    subComp: string,
    level: number,
    scoreKey: string
  ) => {
    // Carry a note typed before any level was picked over to the level now chosen,
    // but never overwrite a note that level already has.
    const existing = activitySubCompComments[activityId]?.[competencyId]?.[subComp];
    const pending = existing?.[NUMERIC_SCORE_COMMENT_KEY];
    if (pending && !existing?.[scoreKey]) {
      setActivitySubCompComment(activityId, competencyId, subComp, scoreKey, pending);
    }
    updateActivityCompetencyScore(activityId, competencyId, subComp, level, scoreKey);
  };

  const handleNumericChange = (
    activityId: string,
    competencyId: string,
    subComp: string,
    score: number
  ) => {
    updateActivityCompetencyScore(activityId, competencyId, subComp, score);
  };

  /** Notes key off the selected level; with nothing selected yet they land on the
   *  numeric key and get carried over by handleSelectLevel. */
  const handleNoteChange = (
    activityId: string,
    competencyId: string,
    subComp: string,
    value: string
  ) => {
    const scoreKey =
      activitySelectedScoreKeys[activityId]?.[competencyId]?.[subComp] ??
      NUMERIC_SCORE_COMMENT_KEY;
    setActivitySubCompComment(activityId, competencyId, subComp, scoreKey, value);
  };

  // ---------------------------------------------------------------------------
  // Observations — client-side only, so nothing below touches the score payload.
  // ---------------------------------------------------------------------------

  const addObservation = (
    activityId: string,
    text: string,
    timeSec: number | null,
    mapping: { competencyId: string; subCompetency: string } | null
  ) => {
    const observation: Observation = {
      id: createObservationId(),
      activityId,
      timeSec,
      text,
      competencyId: mapping?.competencyId ?? null,
      subCompetency: mapping?.subCompetency ?? null,
      createdAt: Date.now(),
    };
    setObservations((prev) => ({
      ...prev,
      [activityId]: [...(prev[activityId] || []), observation],
    }));
  };

  const editObservation = (activityId: string, observationId: string, text: string) => {
    setObservations((prev) => ({
      ...prev,
      [activityId]: (prev[activityId] || []).map((o) =>
        o.id === observationId ? { ...o, text } : o
      ),
    }));
  };

  const deleteObservation = (activityId: string, observationId: string) => {
    setObservations((prev) => ({
      ...prev,
      [activityId]: (prev[activityId] || []).filter((o) => o.id !== observationId),
    }));
  };

  const mapObservation = (
    activityId: string,
    observationId: string,
    mapping: { competencyId: string; subCompetency: string }
  ) => {
    setObservations((prev) => ({
      ...prev,
      [activityId]: (prev[activityId] || []).map((o) =>
        o.id === observationId
          ? { ...o, competencyId: mapping.competencyId, subCompetency: mapping.subCompetency }
          : o
      ),
    }));
  };

  const reportDescriptorKey = (activityId: string, competencyId: string, subComp: string) =>
    `${activityId}|${competencyId}|${subComp}`;

  const setReportDescriptor = (
    key: string,
    patch: Partial<{ text: string; include: boolean; edited: boolean }>
  ) => {
    setReportDescriptors((prev) => {
      const current = prev[key] ?? { text: '', include: true, edited: false };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  };

  const submitScores = async (assignmentId: string, status: 'DRAFT' | 'SUBMITTED') => {
    if (!participantDetails?.data || !assessorId || !token) {
      setError('Missing required data for score submission');
      return;
    }

    setIsSubmittingScore(true);
    setDraftStatus(status);
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
      setDraftStatus(null);
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

      // This endpoint returns report *content* as JSON, not a PDF binary — the previous
      // `.blob()` wrote the raw API envelope to disk. Render it with the same builder the
      // admin download uses so both produce an identical document.
      const reportResult = await reportResponse.json();

      if (!reportResult.success || !reportResult.data) {
        throw new Error(reportResult.message || 'Failed to generate report');
      }

      const centerName =
        reportResult.data.assessmentCenter?.name ||
        reportResult.data.assessmentCenter?.displayName ||
        assignment.assessmentCenter.displayName ||
        assignment.assessmentCenter.name ||
        '';

      downloadParticipantReportPdf({
        reportContent: reportResult.data.reportContent,
        participantName:
          reportResult.data.participant?.name || participantDetails.data.participant.name,
        participantEmail:
          reportResult.data.participant?.email || participantDetails.data.participant.email,
        assessmentCenterName: centerName || 'N/A',
        assessmentCenterFileNamePart: centerName,
        reportName:
          reportResult.data.reportStructure?.reportName ||
          assignment.assessmentCenter.reportTemplateName ||
          'Report',
      });

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

  return (
    // Fills the assessor shell's padded main area so each column scrolls on its own.
    <div className="-m-6 flex h-screen flex-col overflow-hidden bg-gray-50">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Only show assignment selector if assessmentCenterId not provided and multiple assignments exist */}
        {!assessmentCenterId && participantDetails.data.assignments.length > 1 && (
          <div className="m-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
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

          const selectedActivity = selectedActivityId
            ? selectedAssignment.activities.find((a) => a.activityId === selectedActivityId)
            : undefined;

          // Some activities carry more than one competency.
          const activityCompetencies = selectedActivity
            ? getCompetenciesForActivity(
                selectedActivity.activityId,
                selectedActivity.competency,
                selectedAssignment.competencies
              )
            : [];
          const activeCompetencyIndex = Math.max(
            0,
            activityCompetencies.findIndex((c) => c.id === activeCompetencyId)
          );
          const activeCompetency = activityCompetencies[activeCompetencyIndex] ?? null;

          // Sorted copy — the state array must not be mutated during render.
          const activityOptions: TopBarActivity[] = [...selectedAssignment.activities]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((activity) => {
              const competencies = getCompetenciesForActivity(
                activity.activityId,
                activity.competency,
                selectedAssignment.competencies
              );
              const { scored, total } = getActivityProgress(
                competencies,
                activitySelectedScoreKeys[activity.activityId],
                activityCompetencyScores[activity.activityId]
              );
              return {
                activityId: activity.activityId,
                label: activity.displayName || activity.activityDetail.name,
                sublabel: `${readableActivityType(
                  activity.activityType,
                  activity.activityDetail.interactiveActivityType
                )} · ${scored}/${total} competencies scored`,
              };
            });

          const selectedActivityWithSubs = selectedActivity as ActivityWithSubmissions | undefined;
          // Fall back to the single `submission` when the API omitted `allSubmissions`, so an
          // activity can't read "Submitted" in the rail and "No submissions yet" here.
          const evidenceSubmissions: SubmissionRecord[] =
            selectedActivityWithSubs?.allSubmissions &&
            selectedActivityWithSubs.allSubmissions.length > 0
              ? (selectedActivityWithSubs.allSubmissions as SubmissionRecord[])
              : selectedActivity?.submission
                ? [selectedActivity.submission as SubmissionRecord]
                : [];

          const assignmentProgress = getActivityProgress(
            activityCompetencies,
            selectedActivity ? activitySelectedScoreKeys[selectedActivity.activityId] : undefined,
            selectedActivity ? activityCompetencyScores[selectedActivity.activityId] : undefined
          );
          const lifecycleStatus = scoreStatus[selectedAssignmentId] ?? 'DRAFT';

          const isScoringDisabled =
            (scoreStatus[selectedAssignmentId] === 'SUBMITTED' ||
              scoreStatus[selectedAssignmentId] === 'FINALIZED') &&
            !editMode;

          // Next walks sub-competencies, then rolls into the next competency.
          const advanceSubCompetency = () => {
            if (!activeCompetency) return;
            const lastSub = activeCompetency.subCompetencyNames.length - 1;
            if (activeSubCompIndex < lastSub) {
              setActiveSubCompIndex(activeSubCompIndex + 1);
              return;
            }
            const nextCompetency = activityCompetencies[activeCompetencyIndex + 1];
            if (nextCompetency) {
              setActiveCompetencyId(nextCompetency.id);
              setActiveSubCompIndex(0);
            }
          };
          const isFinalSubCompetency =
            !!activeCompetency &&
            activeCompetencyIndex === activityCompetencies.length - 1 &&
            activeSubCompIndex === activeCompetency.subCompetencyNames.length - 1;
          const nextSubCompetencyLabel =
            activeCompetency &&
            activeSubCompIndex < activeCompetency.subCompetencyNames.length - 1
              ? 'Next Sub-Competency'
              : 'Next Competency';

          // ---- Scoring form + right rail figures (all derived from existing state) ----
          const activityId = selectedActivity?.activityId ?? '';
          const selectedKeysForActivity = selectedActivity
            ? activitySelectedScoreKeys[activityId]
            : undefined;
          const scoresForActivity = selectedActivity
            ? activityCompetencyScores[activityId]
            : undefined;

          const descriptionsFor = (competencyId: string) => (subComp: string) =>
            selectedActivity ? getScoreDescriptions(activityId, competencyId, subComp) : {};

          const competencyTotals = activityCompetencies.map((competency) => ({
            competency,
            totals: getCompetencyScoreTotals(
              competency,
              descriptionsFor(competency.id),
              selectedKeysForActivity?.[competency.id],
              scoresForActivity?.[competency.id]
            ),
          }));
          const overallTotals = sumScoreTotals(competencyTotals.map((c) => c.totals));
          const overallScore = toPercent(overallTotals.value, overallTotals.max);
          const subCompetencyProgress =
            overallTotals.total > 0 ? (overallTotals.scored / overallTotals.total) * 100 : 0;

          const progressCompetencies: ProgressCompetency[] = competencyTotals.map(
            ({ competency, totals }) => ({
              id: competency.id,
              name: competency.competencyName.split('\t')[0] || competency.competencyName,
              value: totals.value,
              max: totals.max,
            })
          );

          // ---- Observations (UI-only state) ----
          const activityObservations = selectedActivity ? observations[activityId] || [] : [];
          const observationSummary = summarizeObservations(activityObservations);
          const activeSubCompetency =
            activeCompetency?.subCompetencyNames[activeSubCompIndex] ?? null;
          const activeMapping =
            activeCompetency && activeSubCompetency
              ? { competencyId: activeCompetency.id, subCompetency: activeSubCompetency }
              : null;
          const activeMappingLabel = activeMapping
            ? `${activeCompetencyIndex + 1}.${activeSubCompIndex + 1} ${
                activeSubCompetency!.split('\t')[0] || activeSubCompetency
              }`
            : null;
          const observationLabels = (observation: Observation) => {
            if (!observation.competencyId || !observation.subCompetency) return null;
            const competency = activityCompetencies.find((c) => c.id === observation.competencyId);
            if (!competency) return null;
            return {
              competency: competency.competencyName.split('\t')[0] || competency.competencyName,
              subCompetency:
                observation.subCompetency.split('\t')[0] || observation.subCompetency,
            };
          };

          // ---- Report descriptors (UI-only; defaults to the selected rubric descriptor) ----
          const reportDescriptorFor = (subComp: string): ReportDescriptorState => {
            if (!selectedActivity || !activeCompetency) {
              return { text: '', include: true, edited: false };
            }
            const key = reportDescriptorKey(activityId, activeCompetency.id, subComp);
            const stored = reportDescriptors[key];
            const scoreKey = selectedKeysForActivity?.[activeCompetency.id]?.[subComp];
            const generated = scoreKey
              ? getScoreDescriptions(activityId, activeCompetency.id, subComp)[scoreKey] || ''
              : '';
            if (!stored) return { text: generated, include: true, edited: false };
            return {
              text: stored.edited ? stored.text : generated,
              include: stored.include,
              edited: stored.edited,
            };
          };

          // ---- Evidence header details ----
          const activeSubmission =
            evidenceSubmissions.find((s) => s.id === activeSubmissionId) ?? evidenceSubmissions[0];
          const submissionStamp = activeSubmission?.submittedAt || activeSubmission?.createdAt;
          const submissionDate = submissionStamp ? new Date(submissionStamp) : null;
          const submissionLabel = activeSubmission
            ? `${readableSubmissionType(activeSubmission.submissionType)}${
                evidenceSubmissions.length > 1 ? ` (${evidenceSubmissions.length})` : ''
              }`
            : 'Not submitted';
          const submissionSubLabel = activeSubmission
            ? submissionDate && !Number.isNaN(submissionDate.getTime())
              ? `Submitted ${submissionDate.toLocaleString()}`
              : activeSubmission.fileName || '—'
            : 'Awaiting participant submission';

          // ---- Final summary modal rows ----
          const storedAverages = competencyAverages[selectedAssignmentId] || {};
          const summaryRows: FinalSummaryRow[] = selectedAssignment.competencies.map(
            (competency) => {
              const [name, ...descriptionParts] = competency.competencyName.split('\t');
              const carryingActivities = selectedAssignment.activities.filter((activity) =>
                getCompetenciesForActivity(
                  activity.activityId,
                  activity.competency,
                  selectedAssignment.competencies
                ).some((c) => c.id === competency.id)
              );

              let average: number | null = storedAverages[competency.id] ?? null;
              if (average === null) {
                let sum = 0;
                let count = 0;
                carryingActivities.forEach((activity) => {
                  const avg = averageSubCompetencyScores(
                    competency.subCompetencyNames,
                    activityCompetencyScores[activity.activityId]?.[competency.id]
                  );
                  if (avg !== null) {
                    sum += avg;
                    count++;
                  }
                });
                average = count > 0 ? sum / count : null;
              }

              // Points available per sub-competency, so the bar scales to the rubric in use.
              const maxes = competency.subCompetencyNames.map((subComp) => {
                const rubricActivityId =
                  getFirstActivityIdWithRubric(selectedAssignment, competency.id, subComp) ??
                  carryingActivities[0]?.activityId;
                const descriptions = rubricActivityId
                  ? getScoreDescriptions(rubricActivityId, competency.id, subComp)
                  : {};
                return getSubCompetencyScore(descriptions, undefined, undefined).max;
              });
              const max =
                maxes.length > 0 ? maxes.reduce((a, b) => a + b, 0) / maxes.length : 0;

              const complete =
                carryingActivities.length > 0 &&
                carryingActivities.every(
                  (activity) =>
                    getCompetencyProgress(
                      competency,
                      activitySelectedScoreKeys[activity.activityId],
                      activityCompetencyScores[activity.activityId]
                    ).complete
                );

              return {
                id: competency.id,
                name: name || competency.competencyName,
                description: descriptionParts.join(' ').trim(),
                complete,
                activityCount: carryingActivities.length,
                average,
                max,
              };
            }
          );

          return (
        <div className="flex min-h-0 flex-1 flex-col">
                <ScoringTopBar
                  centerName={
                    selectedAssignment.assessmentCenter.displayName ||
                    selectedAssignment.assessmentCenter.name
                  }
                  assessorName={participantDetails.data.assessor?.name || ''}
                  participantName={participantDetails.data.participant.name}
                  participantId={participantDetails.data.participant.id}
                  activities={activityOptions}
                  selectedActivityId={selectedActivityId}
                  onSelectActivity={setSelectedActivityId}
                  activityTitle={
                    selectedActivity
                      ? selectedActivity.displayName || selectedActivity.activityDetail.name
                      : ''
                  }
                  activityTypeLabel={
                    selectedActivity
                      ? `Type: ${readableActivityType(
                          selectedActivity.activityType,
                          selectedActivity.activityDetail.interactiveActivityType
                        )}`
                      : 'Select an activity'
                  }
                  submissionLabel={submissionLabel}
                  submissionSubLabel={submissionSubLabel}
                  lifecycleStatus={lifecycleStatus}
                  progressStatus={deriveProgressStatus(
                    assignmentProgress.scored,
                    assignmentProgress.total
                  )}
                  scoredCompetencies={assignmentProgress.scored}
                  totalCompetencies={assignmentProgress.total}
                  readOnly={isScoringDisabled}
                  editMode={editMode}
                  editReason={editReason}
                  onEditReasonChange={setEditReason}
                  isSubmitting={isSubmittingScore && draftStatus === 'SUBMITTED'}
                  isSavingDraft={isSubmittingScore && draftStatus === 'DRAFT'}
                  onBack={() => router.back()}
                  onSaveDraft={() => submitScores(selectedAssignmentId, 'DRAFT')}
                  onSubmit={() => submitScores(selectedAssignmentId, 'SUBMITTED')}
                />

                {error && (
                  <div className="border-b border-red-200 bg-red-50 px-4 py-2.5">
                    <p className="text-xs text-red-800">{error}</p>
                  </div>
                )}

                {/* Evidence · Scoring form · Progress */}
                <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 xl:flex-row xl:items-stretch xl:overflow-hidden">
                  {/* Evidence + observations */}
                  <div className="flex min-h-[420px] w-full flex-col xl:min-h-0 xl:w-[36%] xl:flex-shrink-0">
                    {selectedActivity ? (
                      <EvidencePanel
                        activityLabel={
                          selectedActivity.displayName || selectedActivity.activityDetail.name
                        }
                        activityType={selectedActivity.activityType}
                        submissions={evidenceSubmissions}
                        activeSubmissionId={activeSubmissionId}
                        onSelectSubmission={setActiveSubmissionId}
                        observations={activityObservations}
                        disabled={isScoringDisabled}
                        activeMappingLabel={activeMappingLabel}
                        labelsFor={observationLabels}
                        onAddObservation={(text, timeSec, mapToActive) =>
                          addObservation(
                            activityId,
                            text,
                            timeSec,
                            mapToActive ? activeMapping : null
                          )
                        }
                        onEditObservation={(id, text) => editObservation(activityId, id, text)}
                        onDeleteObservation={(id) => deleteObservation(activityId, id)}
                        onMapObservationToActive={(id) => {
                          if (activeMapping) mapObservation(activityId, id, activeMapping);
                        }}
                      />
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                        Select an activity to review its evidence.
                      </div>
                    )}
                  </div>

                  {/* Scoring form */}
                  <div className="flex min-h-[420px] min-w-0 flex-1 flex-col xl:min-h-0">
                    {activeCompetency && selectedActivity ? (
                      <ScoringForm
                        competency={activeCompetency}
                        competencyIndex={activeCompetencyIndex}
                        competencyCount={activityCompetencies.length}
                        activeSubCompIndex={activeSubCompIndex}
                        onActiveSubCompChange={setActiveSubCompIndex}
                        scoreDescriptionsFor={descriptionsFor(activeCompetency.id)}
                        scores={scoresForActivity?.[activeCompetency.id]}
                        selectedKeys={selectedKeysForActivity?.[activeCompetency.id]}
                        notes={activitySubCompComments[activityId]?.[activeCompetency.id]}
                        disabled={isScoringDisabled}
                        observationsFor={(sub) =>
                          observationsForSubCompetency(
                            activityObservations,
                            activeCompetency.id,
                            sub
                          )
                        }
                        reportDescriptorFor={reportDescriptorFor}
                        onReportDescriptorChange={(sub, text) =>
                          setReportDescriptor(
                            reportDescriptorKey(activityId, activeCompetency.id, sub),
                            { text, edited: true }
                          )
                        }
                        onReportDescriptorReset={(sub) =>
                          setReportDescriptor(
                            reportDescriptorKey(activityId, activeCompetency.id, sub),
                            { text: '', edited: false }
                          )
                        }
                        onReportDescriptorIncludeChange={(sub, include) =>
                          setReportDescriptor(
                            reportDescriptorKey(activityId, activeCompetency.id, sub),
                            { include }
                          )
                        }
                        onSelectLevel={(sub, level, scoreKey) =>
                          handleSelectLevel(activityId, activeCompetency.id, sub, level, scoreKey)
                        }
                        onNumericChange={(sub, score) =>
                          handleNumericChange(activityId, activeCompetency.id, sub, score)
                        }
                        onNoteChange={(sub, value) =>
                          handleNoteChange(activityId, activeCompetency.id, sub, value)
                        }
                        onNext={advanceSubCompetency}
                        nextLabel={nextSubCompetencyLabel}
                        nextDisabled={isFinalSubCompetency}
                      />
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                        No competencies are configured for this activity.
                      </div>
                    )}
                  </div>

                  {/* Overall progress */}
                  <div className="flex min-h-[360px] w-full flex-col xl:min-h-0 xl:w-72 xl:flex-shrink-0">
                    <ProgressSidebar
                      progressPercent={subCompetencyProgress}
                      overallScore={overallScore}
                      competencies={progressCompetencies}
                      activeCompetencyId={activeCompetency?.id ?? null}
                      onSelectCompetency={(id) => {
                        setActiveCompetencyId(id);
                        setActiveSubCompIndex(0);
                      }}
                      observationSummary={observationSummary}
                      onViewFinalSummary={() => setSummaryOpen(true)}
                      isGenerating={isGenerating}
                      isEvaluating={isEvaluating}
                      onGenerateReport={generateReport}
                      onEvaluate={evaluateInterview}
                    />
                  </div>
                </div>

                {evaluationData && (
                  <div className="scrollbar-thin max-h-[40vh] flex-shrink-0 overflow-y-auto border-t border-gray-200 bg-gray-50 px-4 pb-4">
                    <EvaluationResults data={evaluationData} />
                  </div>
                )}

                <FinalSummaryModal
                  open={summaryOpen}
                  participantName={participantDetails.data.participant.name}
                  rows={summaryRows}
                  isGenerating={isGenerating}
                  onClose={() => setSummaryOpen(false)}
                  onGenerateReport={generateReport}
                />
        </div>
          );
        })()}
      </div>
    </div>
  );
};

export default AssessmentDetail;