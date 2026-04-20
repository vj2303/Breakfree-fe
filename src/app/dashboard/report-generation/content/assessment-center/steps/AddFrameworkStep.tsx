import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Plus, Smile, Trash2, Minus } from 'lucide-react';
import { useAssessmentForm } from '../create/context';

interface Competency {
  id: string;
  name: string;
  subCompetencies: string[];
}

interface Activity {
  id?: string;
  name?: string;
  type?: string;
  displayName?: string;
  displayInstructions?: string;
}

interface ActivityWithCompetencies {
  activity: Activity;
  competencies: Competency[];
}

interface ScoreState {
  [competencyId: string]: {
    [subCompetency: string]: Record<string, string>; // Dynamic scores: { score1: '...', score2: '...', ... }
  };
}

// Add type for items in competencyLibraryList
type CompetencyLibraryItem = {
  id: string;
  subCompetencyNames?: string[];
  // Add other properties if needed
};

const CompetencyFramework = () => {
  const context = useAssessmentForm();
  if (!context) {
    throw new Error('CompetencyFramework must be used within AssessmentFormContext');
  }
  const { formData, updateFormData } = context;
  
  // Get all competencies
  const allCompetencies: Competency[] = useMemo(() => {
    return (formData.selectedCompetenciesData || []).map((comp: {id: string, name: string}) => {
      const competencyLibraryList = (formData as { competencyLibraryList?: CompetencyLibraryItem[] }).competencyLibraryList || [];
      const full = competencyLibraryList.find((c: CompetencyLibraryItem) => c.id === comp.id);
      return {
        id: comp.id,
        name: comp.name,
        subCompetencies: Array.isArray(full?.subCompetencyNames) ? (full as CompetencyLibraryItem).subCompetencyNames || [] : [],
      };
    });
  }, [formData]);

  // Get activities
  const activities: Activity[] = useMemo(() => {
    return formData.activities || [];
  }, [formData.activities]);

  // Get matrix data
  const matrix: boolean[][] = useMemo(() => {
    return formData.matrix || [];
  }, [formData.matrix]);

  // Group competencies by activity based on matrix selections
  const activitiesWithCompetencies: ActivityWithCompetencies[] = useMemo(() => {
    if (!matrix.length || !activities.length || !allCompetencies.length) {
      return [];
    }

    return activities.map((activity, activityIdx) => {
      const selectedCompetencies = allCompetencies.filter((competency, competencyIdx) => {
        // Check if this competency is selected for this activity in the matrix
        return matrix[competencyIdx]?.[activityIdx] === true;
      });

      return {
        activity,
        competencies: selectedCompetencies,
      };
    }).filter(item => item.competencies.length > 0); // Only show activities that have selected competencies
  }, [matrix, activities, allCompetencies]);

  // Helper function to get activity display name
  const getActivityDisplayName = (activity: Activity): string => {
    return activity.displayName || activity.name || activity.type || 'Unknown Activity';
  };

  // Helper function to get activity ID
  const getActivityId = (activity: Activity, index: number): string => {
    return activity.id || `activity-${index}`;
  };

  const [activeTab, setActiveTab] = useState<string>('');
  const [expandedCompetencies, setExpandedCompetencies] = useState<{[key: string]: boolean}>({});
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [activeCompetency, setActiveCompetency] = useState<Competency | null>(null);
  const [selectedSubCompetency, setSelectedSubCompetency] = useState<string>('');

  // Set default active tab when activities are available
  useEffect(() => {
    if (activitiesWithCompetencies.length > 0 && !activeTab) {
      const firstActivityId = getActivityId(activitiesWithCompetencies[0].activity, 0);
      setActiveTab(firstActivityId);
    }
  }, [activitiesWithCompetencies, activeTab]);
  
  // Initialize scoreState - will be populated when activeTab is set
  const [scoreState, setScoreState] = useState<ScoreState>({});

  // Update scoreState when activeTab changes or formData.descriptors changes
  useEffect(() => {
    if (!activeTab) {
      setScoreState({});
      return;
    }
    
    const savedDescriptors = formData.descriptors || {};
    const activityDescriptors = savedDescriptors[activeTab] || {};
    
    const newScoreState: ScoreState = {};
    Object.keys(activityDescriptors).forEach(competencyId => {
      newScoreState[competencyId] = {};
      Object.keys(activityDescriptors[competencyId]).forEach(subCompetency => {
        const descriptor = activityDescriptors[competencyId][subCompetency];
        // Support both old format (score1, score2, score3) and new dynamic format
        if (descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor)) {
          // Check if it's the old format (has exactly score1, score2, score3 and nothing else)
          const keys = Object.keys(descriptor);
          const hasOldFormat = keys.length === 3 && 
            'score1' in descriptor && 
            'score2' in descriptor && 
            'score3' in descriptor &&
            keys.every(key => key.startsWith('score'));
          
          if (hasOldFormat) {
            // Convert old format to new format (preserve existing values)
            newScoreState[competencyId][subCompetency] = {
              score1: descriptor.score1 || '',
              score2: descriptor.score2 || '',
              score3: descriptor.score3 || '',
            };
          } else {
            // Already in dynamic format or has more than 3 scores - load all scores
            newScoreState[competencyId][subCompetency] = descriptor as Record<string, string>;
          }
        } else {
          newScoreState[competencyId][subCompetency] = {};
        }
      });
    });
    setScoreState(newScoreState);
  }, [activeTab, formData.descriptors]);

  const toggleCompetencyExpansion = (activityId: string, competencyId: string) => {
    const key = `${activityId}_${competencyId}`;
    setExpandedCompetencies(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openScoreModal = (competency: Competency) => {
    setActiveCompetency(competency);
    setSelectedSubCompetency('');
    setShowScoreModal(true);
  };

  const openRubricModal = (competency: Competency) => {
    console.log('Open rubric modal for competency:', competency);
    setActiveCompetency(competency);
    setShowRubricModal(true);
  };

  const handleScoreChange = (sub: string, field: string, value: string) => {
    if (!activeCompetency) return;
    setScoreState(prev => ({
      ...prev,
      [activeCompetency.id]: {
        ...(prev[activeCompetency.id] || {}),
        [sub]: {
          ...(prev[activeCompetency.id]?.[sub] || {}),
          [field]: value,
        },
      },
    }));
  };

  const addScoreField = (sub: string) => {
    if (!activeCompetency) return;
    const currentScores = scoreState[activeCompetency.id]?.[sub] || {};
    const scoreKeys = Object.keys(currentScores).filter(key => key.startsWith('score'));
    const maxScoreNum = scoreKeys.length > 0 
      ? Math.max(...scoreKeys.map(key => parseInt(key.replace('score', '')) || 0))
      : 0;
    const newScoreKey = `score${maxScoreNum + 1}`;
    
    setScoreState(prev => ({
      ...prev,
      [activeCompetency.id]: {
        ...(prev[activeCompetency.id] || {}),
        [sub]: {
          ...(prev[activeCompetency.id]?.[sub] || {}),
          [newScoreKey]: '',
        },
      },
    }));
  };

  const removeScoreField = (sub: string, field: string) => {
    if (!activeCompetency) return;
    const currentScores = scoreState[activeCompetency.id]?.[sub] || {};
    const { [field]: removed, ...remainingScores } = currentScores;
    
    setScoreState(prev => ({
      ...prev,
      [activeCompetency.id]: {
        ...(prev[activeCompetency.id] || {}),
        [sub]: remainingScores,
      },
    }));
  };

  const getScoreFields = (sub: string): string[] => {
    if (!activeCompetency) return [];
    const scores = scoreState[activeCompetency.id]?.[sub] || {};
    const scoreKeys = Object.keys(scores).filter(key => key.startsWith('score'));
    // Sort by score number
    return scoreKeys.sort((a, b) => {
      const numA = parseInt(a.replace('score', '')) || 0;
      const numB = parseInt(b.replace('score', '')) || 0;
      return numA - numB;
    });
  };

  // Log when step is saved/next is clicked
  useEffect(() => {
    const handleStepSave = () => {
      try {
        console.log('=== ADD FRAMEWORK STEP SAVED ===');
        console.log('Activities with competencies:', activitiesWithCompetencies.length);
        console.log('Score state:', scoreState);
        console.log('Active tab:', activeTab);
        console.log('Step validation:', {
          hasActivities: activitiesWithCompetencies.length > 0,
          hasScoreData: Object.keys(scoreState).length > 0,
          totalCompetencies: activitiesWithCompetencies.reduce((sum, item) => sum + item.competencies.length, 0),
          competenciesWithScores: Object.keys(scoreState).length
        });
      } catch {}
    };

    // Listen for step save events
    window.addEventListener('step-save', handleStepSave);
    return () => window.removeEventListener('step-save', handleStepSave);
  }, [activitiesWithCompetencies, scoreState, activeTab]);

  // Get current active activity data
  const activeActivityData = useMemo(() => {
    if (!activeTab) return null;
    return activitiesWithCompetencies.find((item, idx) => {
      const activityId = getActivityId(item.activity, idx);
      return activityId === activeTab;
    });
  }, [activeTab, activitiesWithCompetencies]);

  return (
    <div className="bg-white">
      <div className="border-t pt-4">
        <h2 className="text-xl font-bold mb-4 text-black">Competency Framework</h2>
        {activitiesWithCompetencies.length === 0 ? (
          <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
            Please go back to the Subject - Exercise Matrix step and select which competencies apply to each activity.
          </div>
        ) : (
          <div>
            {/* Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {activitiesWithCompetencies.map((item, activityIdx) => {
                const activityId = getActivityId(item.activity, activityIdx);
                const activityName = getActivityDisplayName(item.activity);
                const isActive = activeTab === activityId;

                return (
                  <button
                    key={activityId}
                    onClick={() => setActiveTab(activityId)}
                    className={`px-5 py-2 rounded-full transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                      isActive 
                        ? 'bg-gray-900 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <span className="text-sm font-medium">{activityName}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-gray-700' : 'bg-gray-300'
                    }`}>
                      {item.competencies.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeActivityData && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  {activeActivityData.competencies.map((competency: Competency, compIdx: number) => {
                    const activityId = activeTab; // Use activeTab directly since it's the current activity ID
                    const competencyKey = `${activityId}_${competency.id}`;
                    const isCompetencyExpanded = expandedCompetencies[competencyKey] || false;

                    return (
                      <div key={competency.id} className="border-l-4 border-slate-800 bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {compIdx + 1}
                            </span>
                            <span className="font-semibold text-black text-sm">{competency.name}</span>
                            <button
                              onClick={() => toggleCompetencyExpansion(activityId, competency.id)}
                              className="p-1 text-gray-500 hover:text-gray-700 transition-all duration-200"
                            >
                              <div className={`transform transition-transform duration-300 ${
                                isCompetencyExpanded ? 'rotate-180' : 'rotate-0'
                              }`}>
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </button>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openScoreModal(competency)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              title="Add Descriptor"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openRubricModal(competency)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              title="View Rubric"
                            >
                              <Smile className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors" 
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isCompetencyExpanded 
                              ? 'max-h-96 opacity-100 mt-3' 
                              : 'max-h-0 opacity-0 mt-0'
                          }`}
                        >
                          <div className="space-y-2 bg-gray-50 rounded-lg p-3 ml-9">
                            <div className="font-semibold text-xs text-gray-700 mb-2">Sub competency</div>
                            {competency.subCompetencies.length > 0 ? (
                              <div className="space-y-1.5">
                                {competency.subCompetencies.map((sub: string, index: number) => (
                                  <div key={index} className="text-xs text-black bg-white rounded px-2.5 py-1.5 border border-gray-200">
                                    {sub}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs">No subcompetencies</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Score Modal */}
      {showScoreModal && activeCompetency && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-center text-black">Add Descriptor to the competency</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium text-black mb-1.5">Select Sub competency</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md text-black mb-3 text-sm"
                value={selectedSubCompetency}
                onChange={e => {
                  const selectedSub = e.target.value;
                  setSelectedSubCompetency(selectedSub);
                  // Initialize with at least one score field if none exist
                  if (selectedSub && activeCompetency) {
                    const currentScores = scoreState[activeCompetency.id]?.[selectedSub] || {};
                    const scoreKeys = Object.keys(currentScores).filter(key => key.startsWith('score'));
                    if (scoreKeys.length === 0) {
                      setScoreState(prev => ({
                        ...prev,
                        [activeCompetency.id]: {
                          ...(prev[activeCompetency.id] || {}),
                          [selectedSub]: {
                            score1: '',
                          },
                        },
                      }));
                    }
                  }
                }}
              >
                <option value="">Select Sub competency</option>
                {activeCompetency.subCompetencies.map((sub, idx) => (
                  <option key={idx} value={sub}>{sub}</option>
                ))}
              </select>
              {selectedSubCompetency && (
                <>
                  <div className="space-y-3 mb-3">
                    {getScoreFields(selectedSubCompetency).map((scoreKey) => {
                      const scoreNum = scoreKey.replace('score', '');
                      return (
                        <div key={scoreKey} className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-black">
                              Score -{scoreNum}
                            </label>
                            {getScoreFields(selectedSubCompetency).length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeScoreField(selectedSubCompetency, scoreKey)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Remove score"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <textarea
                            className="w-full p-2.5 border border-gray-300 rounded-md h-20 resize-none text-black text-sm"
                            placeholder="Enter score description..."
                            value={scoreState[activeCompetency.id]?.[selectedSubCompetency]?.[scoreKey] || ''}
                            onChange={e => handleScoreChange(selectedSubCompetency, scoreKey, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => addScoreField(selectedSubCompetency)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors mb-3"
                  >
                    <Plus className="w-4 h-4" />
                    Add Score
                  </button>
                  {getScoreFields(selectedSubCompetency).length === 0 && (
                    <div className="text-sm text-gray-500 mb-3">
                      Click "Add Score" to add your first score description.
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setShowScoreModal(false);
                  setSelectedSubCompetency('');
                }}
                className="px-4 py-2 text-sm text-black border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (activeCompetency && activeTab && selectedSubCompetency) {
                    // Save descriptors to formData per activity
                    const currentDescriptors = formData.descriptors || {};
                    const activityId = activeTab;
                    
                    // Get the current scores for the selected sub-competency
                    const currentScores = scoreState[activeCompetency.id]?.[selectedSubCompetency] || {};
                    
                    console.log('💾 [Add Framework] Saving scores for:', {
                      activityId,
                      competencyId: activeCompetency.id,
                      subCompetency: selectedSubCompetency,
                      currentScores,
                      allScoreKeys: Object.keys(currentScores),
                      scoreState: scoreState[activeCompetency.id]
                    });
                    
                    // Only save non-empty scores
                    const scoresToSave: Record<string, string> = {};
                    Object.keys(currentScores).forEach(key => {
                      const value = currentScores[key];
                      console.log(`💾 [Add Framework] Checking score ${key}:`, {
                        value,
                        trimmed: value?.trim(),
                        isEmpty: !value || value.trim() === '',
                        willSave: value && value.trim() !== ''
                      });
                      if (value && value.trim() !== '') {
                        scoresToSave[key] = value;
                      }
                    });
                    
                    console.log('💾 [Add Framework] Scores to save:', scoresToSave);
                    console.log('💾 [Add Framework] Number of scores to save:', Object.keys(scoresToSave).length);
                    
                    const updatedDescriptors = {
                      ...currentDescriptors,
                      [activityId]: {
                        ...(currentDescriptors[activityId] || {}),
                        [activeCompetency.id]: {
                          ...(currentDescriptors[activityId]?.[activeCompetency.id] || {}),
                          [selectedSubCompetency]: scoresToSave,
                        },
                      },
                    };
                    
                    // Update formData with descriptors
                    updateFormData('descriptors', updatedDescriptors);
                    console.log('💾 [Add Framework] Descriptors saved to formData for activity:', activityId, 'competency:', activeCompetency.id, 'sub-competency:', selectedSubCompetency, 'scores:', scoresToSave);
                    console.log('💾 [Add Framework] Full updated descriptors:', JSON.stringify(updatedDescriptors, null, 2));
                  }
                  setShowScoreModal(false);
                  setSelectedSubCompetency('');
                }}
                className="px-4 py-2 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rubric Modal */}
      {showRubricModal && activeCompetency && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-center text-black">Rubric</h3>
            <div className="space-y-4">
              {activeCompetency.subCompetencies.map((sub, idx) => {
                const scores = scoreState[activeCompetency.id]?.[sub] || {};
                const scoreFields = Object.keys(scores).filter(key => key.startsWith('score'));
                const sortedScoreFields = scoreFields.sort((a, b) => {
                  const numA = parseInt(a.replace('score', '')) || 0;
                  const numB = parseInt(b.replace('score', '')) || 0;
                  return numA - numB;
                });
                
                return (
                  <div key={idx} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
                    <h4 className="text-base font-medium mb-2 text-black">{sub}</h4>
                    {sortedScoreFields.length > 0 ? (
                      <div className="space-y-1.5 text-sm text-black">
                        {sortedScoreFields.map((scoreKey) => {
                          const scoreNum = scoreKey.replace('score', '');
                          const scoreValue = scores[scoreKey] || 'No description added yet';
                          return (
                            <p key={scoreKey} className="text-gray-700">
                              {scoreNum}. {scoreValue}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm italic">No scores added yet</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-5">
              <button
                onClick={() => setShowRubricModal(false)}
                className="px-6 py-2 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetencyFramework;