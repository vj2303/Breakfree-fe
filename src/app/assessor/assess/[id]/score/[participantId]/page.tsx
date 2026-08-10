"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, CheckCircle, Edit } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import {
  NUMERIC_SCORE_COMMENT_KEY,
  averageSubCompetencyScores,
  formatCompetencyAverage,
  getSortedScoreKeysFromDescriptions,
  mergeActivitySubCompCommentsFromApi,
  mergeAssignmentSubCompCommentsFromApi,
  normalizeStoredToLevel,
} from './lib/rubric';
import type {
  AssessorScore,
  ActivityWithSubmissions,
  EvaluationResponse,
  ParticipantDetails,
  SubmissionRecord,
} from './lib/types';
import CompetencyRail from './components/CompetencyRail';
import EvidencePanel from './components/EvidencePanel';
import CompetencyScoreCard from './components/CompetencyScoreCard';


interface ParticipantScoringProps {
  params: Promise<{ id: string; participantId: string }>;
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

  // Scoring navigation — UI only, never persisted.
  const [activeCompetencyId, setActiveCompetencyId] = useState<string | null>(null);
  const [activeSubCompIndex, setActiveSubCompIndex] = useState(0);
  const [competencyCardCollapsed, setCompetencyCardCollapsed] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

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
        <div className="flex min-h-0 flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-4 xl:h-[min(1200px,calc(100vh-9rem))]">
          {/* Competency Section */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-black">{selectedAssignment.assessmentCenter.displayName}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{selectedAssignment.assessmentCenter.description}</p>
                </div>
                
                {/* Evidence for the selected activity */}
                {selectedActivity && (
                  <div className="mb-4">
                    <EvidencePanel
                      activityLabel={selectedActivity.displayName || selectedActivity.activityDetail.name}
                      activityType={selectedActivity.activityType}
                      submissions={evidenceSubmissions}
                      activeSubmissionId={activeSubmissionId}
                      onSelectSubmission={setActiveSubmissionId}
                    />
                  </div>
                )}

                {/* Single-competency scoring, driven by the activity and competency rails */}
                {activeCompetency ? (
                  <CompetencyScoreCard
                    competency={activeCompetency}
                    competencyIndex={activeCompetencyIndex}
                    competencyCount={activityCompetencies.length}
                    activeSubCompIndex={activeSubCompIndex}
                    onActiveSubCompChange={setActiveSubCompIndex}
                    scoreDescriptionsFor={(sub) =>
                      getScoreDescriptions(selectedActivity!.activityId, activeCompetency.id, sub)
                    }
                    scores={activityCompetencyScores[selectedActivity!.activityId]?.[activeCompetency.id]}
                    selectedKeys={activitySelectedScoreKeys[selectedActivity!.activityId]?.[activeCompetency.id]}
                    notes={activitySubCompComments[selectedActivity!.activityId]?.[activeCompetency.id]}
                    disabled={isScoringDisabled}
                    collapsed={competencyCardCollapsed}
                    onToggleCollapsed={() => setCompetencyCardCollapsed((prev) => !prev)}
                    onSelectLevel={(sub, level, scoreKey) =>
                      handleSelectLevel(
                        selectedActivity!.activityId,
                        activeCompetency.id,
                        sub,
                        level,
                        scoreKey
                      )
                    }
                    onNumericChange={(sub, score) =>
                      handleNumericChange(selectedActivity!.activityId, activeCompetency.id, sub, score)
                    }
                    onNoteChange={(sub, value) =>
                      handleNoteChange(selectedActivity!.activityId, activeCompetency.id, sub, value)
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

          {/* Competencies in this activity */}
          <div className="flex min-h-0 w-full flex-col xl:w-80 xl:flex-shrink-0">
            <CompetencyRail
              competencies={activityCompetencies}
              activeCompetencyId={activeCompetency?.id ?? null}
              activeSubCompIndex={activeSubCompIndex}
              selectedKeys={
                selectedActivity ? activitySelectedScoreKeys[selectedActivity.activityId] : undefined
              }
              scores={
                selectedActivity ? activityCompetencyScores[selectedActivity.activityId] : undefined
              }
              onSelectCompetency={(id) => {
                setActiveCompetencyId(id);
                setActiveSubCompIndex(0);
              }}
              onSelectSubCompetency={(id, index) => {
                setActiveCompetencyId(id);
                setActiveSubCompIndex(index);
              }}
            />
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