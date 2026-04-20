import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { useAssessmentForm } from '../create/context';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL_WITH_API } from '../../../../../../lib/apiConfig';

const activityTypes = [
  { value: "case-study", label: "Interactive Activity" },
  { value: "inbox-activity", label: "Inbox Activity" },
];

const interactiveActivityTypeFilters = [
  { value: "", label: "All Types" },
  { value: "GD", label: "Group Discussion (GD)" },
  { value: "ROLEPLAY", label: "Roleplay" },
  { value: "CASE_STUDY", label: "Case Study" },
];

const getInteractiveActivityTypeLabel = (type?: string) => {
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

const initialActivity = {
  activityType: "",
  activityContent: "",
  displayName: "",
  displayInstructions: "",
};

interface CaseStudy {
  id: string;
  name: string;
  interactiveActivityType?: string;
}

interface InboxActivity {
  id: string;
  name: string;
  interactiveActivityType?: string;
}

const SelectContentStep: React.FC = () => {
  const context = useAssessmentForm();
  if (!context) {
    throw new Error('SelectContentStep must be used within AssessmentFormContext');
  }
  const { formData, updateFormData } = context;

  const { token } = useAuth();

  // Basic assessment center fields - use formData directly to prevent circular updates
  const [contentOptions, setContentOptions] = useState<{ [key: string]: { value: string; label: string; interactiveActivityType?: string }[] }>({});
  const [loading] = useState(false);
  const [error, setError] = useState("");
  // Track filter per activity row
  const [activityFilters, setActivityFilters] = useState<{ [key: number]: string }>({});

  // Use refs to prevent infinite loops
  // const isUpdatingFormData = useRef(false);

  // Memoize activity types to prevent unnecessary re-renders
  const activityTypesString = useMemo(() => {
    return formData.activities?.map(a => a.activityType).filter(Boolean).sort().join(',') || '';
  }, [formData.activities]);

  // Track which activity types are currently being fetched to prevent duplicates
  const fetchingTypes = useRef<Set<string>>(new Set());

  // Log when step is saved/next is clicked
  useEffect(() => {
    const handleStepSave = () => {
      try {
        const currentActivities = formData.activities || [];
        const mapped = currentActivities.map((a, i) => ({
          activityType: a.activityType,
          activityId: a.activityContent,
          displayOrder: i + 1,
          displayName: a.displayName,
          displayInstructions: a.displayInstructions,
        }));
        console.log('=== SELECT CONTENT STEP SAVED ===');
        console.log('Current activities:', mapped);
        console.log('Step validation:', {
          hasActivities: currentActivities.length > 0,
          allTypesSelected: currentActivities.every(a => a.activityType),
          allContentSelected: currentActivities.every(a => a.activityContent),
          allNamesFilled: currentActivities.every(a => a.displayName),
          allInstructionsFilled: currentActivities.every(a => a.displayInstructions)
        });
      } catch {}
    };

    // Listen for step save events
    window.addEventListener('step-save', handleStepSave);
    return () => window.removeEventListener('step-save', handleStepSave);
  }, [formData.activities]);

  // Fetch content options when activity types change - only run when necessary
  useEffect(() => {
    // Only run if we have activities and a token
    const currentActivities = formData.activities || [];
    if (currentActivities.length === 0 || !token) return;

    const fetchContent = async (type: string) => {
      // Prevent duplicate requests for the same type
      if (fetchingTypes.current.has(type)) {
        console.log(`[SelectContentStep] Already fetching for type: ${type}`);
        return;
      }

      // Don't fetch if already have options for this type
      if (contentOptions[type] && contentOptions[type].length > 0) {
        console.log(`[SelectContentStep] Already have options for type: ${type}`);
        return;
      }

      fetchingTypes.current.add(type);
      console.log(`[SelectContentStep] Starting fetch for type: ${type}`);

      try {
        let url = "";
        if (type === "case-study") {
          url = `${API_BASE_URL_WITH_API}/case-studies?page=1&limit=10`;
        } else if (type === "inbox-activity") {
          url = `${API_BASE_URL_WITH_API}/inbox-activities?page=1&limit=10`;
        } else {
          setContentOptions((prev) => ({ ...prev, [type]: [] }));
          fetchingTypes.current.delete(type);
          return;
        }

        const res = await fetch(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        const data = await res.json();
        let options: { value: string; label: string; interactiveActivityType?: string }[] = [];
        if (type === "case-study" && data?.data?.caseStudies) {
          options = data.data.caseStudies.map((cs: CaseStudy) => ({ 
            value: cs.id, 
            label: cs.name,
            interactiveActivityType: cs.interactiveActivityType 
          }));
        } else if (type === "inbox-activity" && data?.data?.inboxActivities) {
          options = data.data.inboxActivities.map((ia: InboxActivity) => ({ 
            value: ia.id, 
            label: ia.name,
            interactiveActivityType: ia.interactiveActivityType
          }));
        }
        setContentOptions((prev) => ({ ...prev, [type]: options }));
        console.log(`[SelectContentStep] Successfully fetched ${options.length} options for ${type}`);
      } catch (error) {
        console.error(`[SelectContentStep] Error fetching ${type}:`, error);
        setError("Failed to fetch content options");
      } finally {
        fetchingTypes.current.delete(type);
      }
    };

    // Get unique activity types that need fetching
    const uniqueTypes = [...new Set(currentActivities.map(a => a.activityType).filter(Boolean))];
    const typesToFetch = uniqueTypes.filter(type => !contentOptions[type]);

    console.log(`[SelectContentStep] Current activity types: [${activityTypesString}]`);
    console.log(`[SelectContentStep] Types to fetch: [${typesToFetch.join(', ')}]`);

    // Fetch content for each unique activity type that hasn't been fetched yet
    if (typesToFetch.length > 0) {
      typesToFetch.forEach(fetchContent);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityTypesString, token, formData.activities]); // Depend on formData.activities

  // Fetch activity details when activity content is selected
  // const fetchActivityDetails = useCallback(async (activityId: string, activityType: string) => {
  //   if (!activityId || !token || loading) {
  //     console.log(`[SelectContentStep] Skipping fetchActivityDetails: activityId=${activityId}, token=${!!token}, loading=${loading}`);
  //     return;
  //   }

  //   console.log(`[SelectContentStep] Fetching activity details for ${activityType}/${activityId}`);
  //   try {
  //     setLoading(true);
  //     const endpoint = activityType === 'case-study'
  //       ? `${API_BASE_URL_WITH_API}/case-studies/${activityId}`
  //       : `${API_BASE_URL_WITH_API}/inbox-activities/${activityId}`;

  //     const response = await fetch(endpoint, {
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //         'Content-Type': 'application/json',
  //       },
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       if (result.success && result.data) {
  //         console.log(`[SelectContentStep] Fetched activity details:`, result.data);
  //         // Don't auto-populate any fields - let user enter manually
  //       }
  //     } else {
  //       console.error(`[SelectContentStep] Failed to fetch activity details: ${response.status}`);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching activity details:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [token, loading]);

  const handleAdd = useCallback(() => {
    const newActivities = [...(formData.activities || []), { ...initialActivity }];
    console.log('[SelectContentStep] Adding new activity:', newActivities);
    updateFormData('activities', newActivities);
  }, [formData.activities, updateFormData]);

  const handleRemove = useCallback((idx: number) => {
    const newActivities = (formData.activities || []).filter((_, i) => i !== idx);
    console.log('[SelectContentStep] Removing activity at index:', idx);
    updateFormData('activities', newActivities);
  }, [formData.activities, updateFormData]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">Assessment Center Details</h2>
      
      {/* Basic Assessment Center Information */}
      <div className="mb-6 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Assessment Center Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => {
                console.log('[SelectContentStep] Name changed:', e.target.value);
                updateFormData('name', e.target.value);
              }}
              placeholder="Enter assessment center name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-5">Select Activity and Content</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4">
        {(formData.activities || []).map((activity, idx) => (
          <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 flex items-center gap-1">
                  Select Activity
                  <span className="text-gray-400 text-xs cursor-help" title="Choose the type of activity">?</span>
                </label>
                <select
                  value={activity.activityType || ''}
                  onChange={e => {
                    console.log(`[SelectContentStep] Activity type changed for idx ${idx}:`, e.target.value);
                    const newActivities = [...(formData.activities || [])];
                    if (newActivities[idx]) {
                      newActivities[idx] = { ...newActivities[idx], activityType: e.target.value, activityContent: '' };
                      updateFormData('activities', newActivities);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                >
                  <option value="">Select Type</option>
                  {activityTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 flex items-center gap-1">
                  Select Activity Content
                  <span className="text-gray-400 text-xs cursor-help" title="Choose the specific content">?</span>
                </label>
                {/* Filter dropdown for Interactive Activities */}
                {activity.activityType === 'case-study' && (
                  <div className="mb-2">
                    <select
                      value={activityFilters[idx] || ''}
                      onChange={e => {
                        console.log(`[SelectContentStep] Filter changed for idx ${idx}:`, e.target.value);
                        setActivityFilters(prev => ({ ...prev, [idx]: e.target.value }));
                      }}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-transparent transition-all"
                    >
                      {interactiveActivityTypeFilters.map(filter => (
                        <option key={filter.value} value={filter.value}>{filter.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <select
                  value={activity.activityContent || ''}
                  onChange={e => {
                    console.log(`[SelectContentStep] Activity content changed for idx ${idx}:`, e.target.value);
                    const newActivities = [...(formData.activities || [])];
                    if (newActivities[idx]) {
                      newActivities[idx] = { ...newActivities[idx], activityContent: e.target.value };
                      updateFormData('activities', newActivities);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!activity.activityType || loading}
                >
                  <option value="">Select Content</option>
                  {(() => {
                    const allOptions = contentOptions[activity.activityType] || [];
                    const currentFilter = activityFilters[idx] || '';
                    
                    // Filter options based on activity type filter
                    const filteredOptions = allOptions.filter(opt => {
                      // Apply filter only for case-study (Interactive Activity)
                      if (activity.activityType !== 'case-study') return true;
                      if (!currentFilter) return true;
                      return opt.interactiveActivityType === currentFilter;
                    });
                    
                    // Always include the currently selected option even if it doesn't match the filter
                    const selectedOption = allOptions.find(opt => opt.value === activity.activityContent);
                    const selectedNotInFiltered = selectedOption && !filteredOptions.some(opt => opt.value === activity.activityContent);
                    
                    // Combine: selected option (if not in filtered) + filtered options
                    const displayOptions = selectedNotInFiltered 
                      ? [selectedOption, ...filteredOptions]
                      : filteredOptions;
                    
                    return displayOptions.map(opt => {
                      const typeLabel = getInteractiveActivityTypeLabel(opt.interactiveActivityType);
                      return (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}{typeLabel ? ` [${typeLabel.label}]` : ''}
                        </option>
                      );
                    });
                  })()}
                </select>
                {/* Show selected activity type badge */}
                {activity.activityContent && activity.activityType === 'case-study' && (() => {
                  const selectedOpt = (contentOptions[activity.activityType] || []).find(opt => opt.value === activity.activityContent);
                  const typeLabel = getInteractiveActivityTypeLabel(selectedOpt?.interactiveActivityType);
                  if (typeLabel) {
                    return (
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeLabel.color}`}>
                          {typeLabel.label}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 flex items-center gap-1">
                  Display Name
                  <span className="text-gray-400 text-xs cursor-help" title="Name shown to participants">?</span>
                </label>
                <input
                  type="text"
                  value={activity.displayName || ''}
                  onChange={e => {
                    console.log(`[SelectContentStep] Display name changed for idx ${idx}:`, e.target.value);
                    const newActivities = [...(formData.activities || [])];
                    if (newActivities[idx]) {
                      newActivities[idx] = { ...newActivities[idx], displayName: e.target.value };
                      updateFormData('activities', newActivities);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="Enter display name"
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Display Instructions</label>
                  <input
                    type="text"
                    value={activity.displayInstructions || ''}
                    onChange={e => {
                      console.log(`[SelectContentStep] Display instructions changed for idx ${idx}:`, e.target.value);
                      const newActivities = [...(formData.activities || [])];
                      if (newActivities[idx]) {
                        newActivities[idx] = { ...newActivities[idx], displayInstructions: e.target.value };
                        updateFormData('activities', newActivities);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Enter instructions"
                  />
                </div>
                {(formData.activities || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="ml-2 text-red-600 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 font-medium bg-white hover:bg-gray-50 hover:border-gray-400 transition-all"
        >
          <span className="text-xl">+</span>
          <span>Add New Activity</span>
        </button>
      </div>
    </div>
  );
};

export default SelectContentStep;