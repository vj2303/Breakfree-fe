"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Users, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { API_BASE_URL_WITH_API } from '@/lib/apiConfig';

interface AssessorsReportsProps {
  participantId: string;
  participantName: string;
  assessmentCenterId: string;
  token: string | null;
  activities: Array<{
    activityId: string;
    activityType: string;
    displayName?: string;
    activityDetail?: {
      id: string;
      name: string;
    } | null;
    competency?: {
      id: string;
      competencyName: string;
      subCompetencyNames: string[];
    };
  }>;
  descriptors?: Record<string, any>; // Add descriptors to determine score levels
}

interface AssessorScore {
  id: string;
  assessorId: string;
  participantId: string;
  assessmentCenterId: string;
  competencyScores?: {
    [competencyId: string]: {
      [subCompetency: string]: number;
    };
  };
  activityCompetencyScores?: {
    [activityId: string]: {
      [competencyId: string]: {
        [subCompetency: string]: number;
      };
    };
  };
  overallComments?: string;
  activityComments?: {
    [activityId: string]: string;
  };
  activitySubCompetencyComments?: {
    [activityId: string]: {
      [competencyId: string]: {
        [subCompetency: string]: {
          [scoreKey: string]: string;
        };
      };
    };
  };
  activitySelectedScoreKeys?: {
    [activityId: string]: {
      [competencyId: string]: {
        [subCompetency: string]: string;
      };
    };
  };
  status: 'DRAFT' | 'SUBMITTED' | 'FINALIZED';
  assessor: {
    id: string;
    name: string;
    email: string;
  };
  assessmentCenter?: {
    id: string;
    name: string;
    displayName?: string;
    descriptors?: Record<string, any>;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface ActivityScore {
  activityId: string;
  activityName: string;
  competencyScores: {
    [competencyId: string]: {
      [subCompetency: string]: number;
    };
  };
  averageScore: number;
}

interface CompetencyAverage {
  competencyId: string;
  competencyName: string;
  subCompetencyAverages: {
    [subCompetency: string]: number;
  };
  overallAverage: number;
}

const AssessorsReports: React.FC<AssessorsReportsProps> = ({
  participantId,
  participantName,
  assessmentCenterId,
  token,
  activities,
  descriptors,
}) => {
  console.log('📥 AssessorsReports mounted - descriptors prop:', descriptors);
  console.log('📥 AssessorsReports mounted - descriptors keys:', descriptors ? Object.keys(descriptors) : 'null');
  const [assessorScores, setAssessorScores] = useState<AssessorScore[]>([]);
  const [fetchedDescriptors, setFetchedDescriptors] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  // Use descriptors from prop or from fetched API data
  const effectiveDescriptors = (descriptors && Object.keys(descriptors).length > 0) ? descriptors : fetchedDescriptors;

  // Toggle function for expanding/collapsing activities
  const toggleActivity = (activityId: string) => {
    setExpandedActivities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Helper function to get the number of score levels from descriptors
  const getNumScoreLevels = (activityId: string, competencyId: string, subCompetency: string): number => {
    if (!effectiveDescriptors) return 10; // Default to 10 if no descriptors
    const activityNode = effectiveDescriptors[activityId];
    if (!activityNode || typeof activityNode !== 'object') return 10;

    // Try direct shape: descriptors[activityId][competencyId][subCompetency]
    let compNode = activityNode[competencyId];
    if (!compNode || typeof compNode !== 'object') return 10;

    let subCompNode = compNode[subCompetency];
    if (!subCompNode || typeof subCompNode !== 'object') return 10;

    // Count score keys (score1, score2, etc.)
    const scoreKeys = Object.keys(subCompNode).filter(key => key.startsWith('score'));
    return scoreKeys.length > 0 ? scoreKeys.length : 10;
  };

  // Get the maximum score level across all activities
  const getMaxScoreLevel = (): number => {
    // First, try to determine from activitySelectedScoreKeys in assessorScore
    let maxLevelsFromScores = 0;
    assessorScores.forEach(assessorScore => {
      if (assessorScore.activitySelectedScoreKeys) {
        Object.values(assessorScore.activitySelectedScoreKeys).forEach((compScores: any) => {
          if (compScores && typeof compScores === 'object') {
            Object.values(compScores).forEach((subScores: any) => {
              if (subScores && typeof subScores === 'object') {
                const scoreKeys = Object.keys(subScores).filter(key => key.startsWith('score'));
                scoreKeys.forEach(key => {
                  const level = parseInt(key.replace('score', ''), 10);
                  if (!isNaN(level) && level > maxLevelsFromScores) {
                    maxLevelsFromScores = level;
                  }
                });
              }
            });
          }
        });
      }
    });

    if (maxLevelsFromScores > 0) return maxLevelsFromScores;

    // Fallback to effectiveDescriptors if available
    if (!effectiveDescriptors) return 10;
    let maxLevels = 10;
    activities.forEach(activity => {
      if (activity.competency) {
        activity.competency.subCompetencyNames.forEach(subComp => {
          const levels = getNumScoreLevels(activity.activityId, activity.competency!.id, subComp);
          if (levels > maxLevels) maxLevels = levels;
        });
      }
    });
    return maxLevels;
  };

  // Helper function to get comment for a specific activity, competency, and sub-competency
  const getSubCompetencyComment = (
    assessorScore: AssessorScore,
    activityId: string,
    competencyId: string,
    subCompetency: string
  ): string | null => {
    // Get the selected score key for this sub-competency
    const selectedScoreKey = assessorScore.activitySelectedScoreKeys?.[activityId]?.[competencyId]?.[subCompetency];

    if (!selectedScoreKey) {
      return null;
    }

    // Get the comment for this score key
    const comment = assessorScore.activitySubCompetencyComments?.[activityId]?.[competencyId]?.[subCompetency]?.[selectedScoreKey];

    return comment || null;
  };

  // Helper function to get descriptor text for a specific score
  const getScoreDescriptor = (
    activityId: string,
    competencyId: string,
    subCompetency: string,
    scoreKey: string
  ): string | null => {
    console.log('🔍 getScoreDescriptor called:', { activityId, competencyId, subCompetency, scoreKey });
    console.log('📦 effectiveDescriptors available:', !!effectiveDescriptors);
    if (!effectiveDescriptors) {
      console.log('❌ No descriptor found, returning null');
      return null;
    }

    // Check if effectiveDescriptors has the activityId as top-level key
    const activityData = effectiveDescriptors[activityId];
    console.log('📍 Checking activityData for', activityId, ':', activityData ? 'found' : 'not found');

    if (activityData && typeof activityData === 'object') {
      // The structure is: descriptors[activityId][activity-0|activity-1|...][competencyId][subCompetency][scoreKey]
      const activitySubKeys = Object.keys(activityData);
      console.log('📍 Activity sub-keys found:', activitySubKeys);

      for (const subKey of activitySubKeys) {
        const activityNode = activityData[subKey];
        console.log('📍 Checking subKey', subKey, ':', activityNode ? 'found' : 'not found');

        if (activityNode && typeof activityNode === 'object') {
          const competencyData = activityNode[competencyId];
          console.log('📍 Competency data for', competencyId, ':', competencyData ? 'found' : 'not found');

          if (competencyData && typeof competencyData === 'object') {
            const subCompData = competencyData[subCompetency];
            console.log('📍 SubCompetency data for', subCompetency.substring(0, 30), ':', subCompData ? 'found' : 'not found');

            if (subCompData && typeof subCompData === 'object') {
              const descriptor = subCompData[scoreKey];
              console.log('📍 Descriptor for', scoreKey, ':', descriptor ? 'found' : 'not found');
              if (typeof descriptor === 'string') {
                console.log('✅ SUCCESS - returning descriptor');
                return descriptor;
              }
            }
          }
        }
      }
    }

    console.log('❌ No descriptor found, returning null');
    return null;
  };

  const fetchAssessorScores = useCallback(async () => {
    if (!token || !participantId || !assessmentCenterId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('participantId', participantId);
      queryParams.append('assessmentCenterId', assessmentCenterId);
      queryParams.append('page', '1');
      queryParams.append('limit', '100');

      const response = await fetch(
        `${API_BASE_URL_WITH_API}/assessors/admin/scores?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('AssessorsReports API response:', result);
        if (result.success && result.data) {
          console.log('Assessor scores from API:', result.data.scores);
          if (result.data.scores && result.data.scores.length > 0) {
            console.log('First assessor score activitySelectedScoreKeys:', result.data.scores[0].activitySelectedScoreKeys);
          }
          setAssessorScores(result.data.scores || []);
          // Extract descriptors from the first score's assessmentCenter if available
          if (result.data.scores && result.data.scores.length > 0 && result.data.scores[0].assessmentCenter?.descriptors) {
            console.log('📋 Found descriptors in assessmentCenter:', result.data.scores[0].assessmentCenter.descriptors);
            setFetchedDescriptors(result.data.scores[0].assessmentCenter.descriptors);
          }
        } else {
          setError(result.message || 'Failed to fetch assessor scores');
        }
      } else {
        setError('Failed to fetch assessor scores');
      }
    } catch (err) {
      console.error('Error fetching assessor scores:', err);
      setError('An error occurred while fetching assessor scores');
    } finally {
      setLoading(false);
    }
  }, [token, participantId, assessmentCenterId]);

  useEffect(() => {
    fetchAssessorScores();
  }, [fetchAssessorScores]);

  // Get all unique competencies from activities
  const getAllCompetencies = () => {
    const competencyMap = new Map<string, { name: string; subCompetencies: Set<string> }>();
    
    activities.forEach((activity) => {
      if (activity.competency) {
        const compId = activity.competency.id;
        if (!competencyMap.has(compId)) {
          competencyMap.set(compId, {
            name: activity.competency.competencyName,
            subCompetencies: new Set(),
          });
        }
        activity.competency.subCompetencyNames.forEach((subComp) => {
          competencyMap.get(compId)!.subCompetencies.add(subComp);
        });
      }
    });

    return Array.from(competencyMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      subCompetencies: Array.from(data.subCompetencies),
    }));
  };

  // Calculate activity-wise scores for each assessor
  const getActivityScoresForAssessor = (assessorScore: AssessorScore): ActivityScore[] => {
    const activityScores: ActivityScore[] = [];

    activities.forEach((activity) => {
      const activityId = activity.activityId;
      const activityName = activity.displayName || activity.activityDetail?.name || `Activity ${activityId}`;
      
      // Get scores for this activity from activityCompetencyScores
      const activityScoresData = assessorScore.activityCompetencyScores?.[activityId] || {};
      
      if (Object.keys(activityScoresData).length > 0) {
        // Calculate average for this activity
        let totalScore = 0;
        let scoreCount = 0;

        Object.values(activityScoresData).forEach((compScores) => {
          Object.values(compScores).forEach((score) => {
            totalScore += typeof score === 'number' ? score : 0;
            scoreCount += 1;
          });
        });

        const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

        activityScores.push({
          activityId,
          activityName,
          competencyScores: activityScoresData,
          averageScore,
        });
      }
    });

    return activityScores;
  };

  // Calculate overall averages across all activities and assessors
  const calculateOverallAverages = (): CompetencyAverage[] => {
    const competencies = getAllCompetencies();
    const competencyTotals: Record<string, { totals: Record<string, number>; counts: Record<string, number> }> = {};

    // Initialize totals
    competencies.forEach((comp) => {
      competencyTotals[comp.id] = {
        totals: {},
        counts: {},
      };
      comp.subCompetencies.forEach((subComp) => {
        competencyTotals[comp.id].totals[subComp] = 0;
        competencyTotals[comp.id].counts[subComp] = 0;
      });
    });

    // Sum up scores from all assessors and activities
    assessorScores.forEach((assessorScore) => {
      if (assessorScore.activityCompetencyScores) {
        Object.entries(assessorScore.activityCompetencyScores || {}).forEach(([activityId, compScores]) => {
          Object.entries(compScores || {}).forEach(([compId, subCompScores]) => {
            if (competencyTotals[compId]) {
              Object.entries(subCompScores || {}).forEach(([subComp, score]) => {
                if (competencyTotals[compId].totals[subComp] !== undefined) {
                  competencyTotals[compId].totals[subComp] += typeof score === 'number' ? score : 0;
                  competencyTotals[compId].counts[subComp] += 1;
                }
              });
            }
          });
        });
      }
    });

    // Calculate averages
    return competencies.map((comp) => {
      const totals = competencyTotals[comp.id].totals;
      const counts = competencyTotals[comp.id].counts;
      
      const subCompetencyAverages: Record<string, number> = {};
      let overallTotal = 0;
      let overallCount = 0;

      comp.subCompetencies.forEach((subComp) => {
        const count = counts[subComp] || 0;
        const total = totals[subComp] || 0;
        const average = count > 0 ? total / count : 0;
        subCompetencyAverages[subComp] = average;
        overallTotal += total;
        overallCount += count;
      });

      const overallAverage = overallCount > 0 ? overallTotal / overallCount : 0;

      return {
        competencyId: comp.id,
        competencyName: comp.name,
        subCompetencyAverages,
        overallAverage,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
        <span className="ml-2 text-sm text-gray-600">Loading assessor reports...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (assessorScores.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">No Assessor Reports Available</p>
        <p className="text-xs text-gray-500 mt-1">
          No assessors have submitted scores for this participant yet.
        </p>
      </div>
    );
  }

  const overallAverages = calculateOverallAverages();
  const maxScoreLevel = getMaxScoreLevel();

  console.log('Max score level:', maxScoreLevel);
  console.log('Overall averages:', overallAverages);
  console.log('Activities:', activities);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-bold text-black">All Assessors Reports</h3>
          <p className="text-sm text-gray-600 mt-1">
            Participant: {participantName} • {assessorScores.length} Assessor{assessorScores.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Overall Averages Section */}
        {overallAverages.length > 0 && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-700" />
              <h4 className="text-sm font-semibold text-black">Overall Averages (All Activities & Assessors)</h4>
            </div>
            <div className="space-y-3">
              {overallAverages.map((compAvg) => (
                <div key={compAvg.competencyId} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-black">{compAvg.competencyName}</h5>
                    <span className="text-sm font-bold text-gray-900">
                      Avg: {compAvg.overallAverage.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {Object.entries(compAvg.subCompetencyAverages).map(([subComp, avg]) => (
                      <div key={subComp} className="text-xs">
                        <span className="text-gray-600">{subComp}:</span>
                        <span className="ml-1 font-medium text-black">{avg.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Assessor Reports */}
        <div className="p-4 space-y-4">
          {assessorScores.map((assessorScore) => {
            const activityScores = getActivityScoresForAssessor(assessorScore);
            const assessorName = assessorScore.assessor.name;
            const assessorEmail = assessorScore.assessor.email;

            return (
              <div key={assessorScore.id} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Assessor Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <div>
                    <h4 className="text-sm font-semibold text-black">{assessorName}</h4>
                    <p className="text-xs text-gray-600">{assessorEmail}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded inline-block ${
                        assessorScore.status === 'FINALIZED'
                          ? 'bg-green-100 text-green-700'
                          : assessorScore.status === 'SUBMITTED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {assessorScore.status}
                    </span>
                  </div>
                </div>

                {/* Activity-wise Scores */}
                {activityScores.length > 0 ? (
                  <div className="space-y-3">
                    {activityScores.map((actScore) => {
                      const activity = activities.find((a) => a.activityId === actScore.activityId);
                      const activityCompetency = activity?.competency;

                      return (
                        <div
                          key={`${assessorScore.id}-${actScore.activityId}`}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                        >
                          <div
                            className="flex items-center justify-between mb-2 cursor-pointer"
                            onClick={() => toggleActivity(actScore.activityId)}
                          >
                            <div className="flex items-center gap-2">
                              {expandedActivities.has(actScore.activityId) ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                              <h5 className="text-sm font-semibold text-black">{actScore.activityName}</h5>
                            </div>
                          </div>

                          {/* Competency Scores for this Activity - Collapsible */}
                          {expandedActivities.has(actScore.activityId) && activityCompetency && (
                            <div className="mt-2 space-y-3">
                              <div className="text-xs font-medium text-gray-700 mb-1">
                                {activityCompetency.competencyName}:
                              </div>
                              <div className="space-y-2">
                                {activityCompetency.subCompetencyNames.map((subComp) => {
                                  const comment = getSubCompetencyComment(
                                    assessorScore,
                                    actScore.activityId,
                                    activityCompetency.id,
                                    subComp
                                  );
                                  const selectedScoreKey = assessorScore.activitySelectedScoreKeys?.[actScore.activityId]?.[activityCompetency.id]?.[subComp];
                                  console.log('🎯 Render - selectedScoreKey for', subComp, ':', selectedScoreKey);
                                  // Extract numeric value from selectedScoreKey (e.g., "score5" -> 5)
                                  const scoreValue = selectedScoreKey ? parseInt(selectedScoreKey.replace('score', ''), 10) : null;
                                  // Get the descriptor text for this score
                                  const descriptor = selectedScoreKey ? getScoreDescriptor(
                                    actScore.activityId,
                                    activityCompetency.id,
                                    subComp,
                                    selectedScoreKey
                                  ) : null;
                                  console.log('🎯 Render - descriptor result for', subComp, ':', descriptor);
                                  const subCompKey = `${assessorScore.id}-${actScore.activityId}-${activityCompetency.id}-${subComp}`;
                                  const isSubCompExpanded = expandedActivities.has(subCompKey);
                                  return (
                                    <div key={subComp} className="bg-white border border-gray-200 rounded-lg p-2">
                                      <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleActivity(subCompKey)}
                                      >
                                        <div className="flex items-center gap-2">
                                          {isSubCompExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
                                          )}
                                          <span className="text-xs font-semibold text-black">{subComp}</span>
                                        </div>
                                        <span className="text-xs font-bold text-black">
                                          {scoreValue !== null ? scoreValue : 'N/A'}
                                        </span>
                                      </div>
                                      {isSubCompExpanded && (
                                        <div className="mt-2">
                                          {descriptor && (
                                            <div className="pt-1 border-t border-gray-200">
                                              <p className="text-xs text-black leading-relaxed font-semibold">{descriptor}</p>
                                            </div>
                                          )}
                                          {comment && (
                                            <div className="mt-1 pt-1 border-t border-gray-100">
                                              <p className="text-xs text-gray-800 leading-relaxed">{comment}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Activity Comment */}
                          {assessorScore.activityComments?.[actScore.activityId] && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-700 mb-1">Comment:</p>
                              <p className="text-xs text-gray-600">
                                {assessorScore.activityComments[actScore.activityId]}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    No activity scores available for this assessor
                  </div>
                )}

                {/* Overall Comments */}
                {assessorScore.overallComments && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">Overall Comments:</p>
                    <p className="text-xs text-gray-600">{assessorScore.overallComments}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AssessorsReports;
