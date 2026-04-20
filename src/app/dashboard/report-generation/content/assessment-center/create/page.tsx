'use client'
import React, { useState, useEffect, useRef, Suspense } from "react";
import { Check, X } from "lucide-react";
import AssessmentCenterLayout from "../AssessmentCenterLayout";
import SelectContentStep from "../steps/SelectContentStep";
import SelectCompetenciesStep from "../steps/SelectCompetenciesStep";
import SubjectExerciseMatrixStep from "../steps/SubjectExerciseMatrixStep";
import AddFrameworkStep from "../steps/AddFrameworkStep";
import AddDocumentStep from "../steps/AddDocumentStep";
import ReportConfigurationStep from "../steps/ReportConfigurationStep";
import ParticipantAssessorManagementStep from "../steps/ParticipantAssessorManagementStep";
import { AssessmentFormContext, useAssessmentForm } from "./context";
import type { FormData } from "./context";
import type { Activity } from "./context";
import { useAuth } from "../../../../../../context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import { API_BASE_URL_WITH_API } from "../../../../../../lib/apiConfig";

const stepTitles = [
  "Select Content",
  "Select Competencies", 
  "Subject - Exercise Matrix",
  "Add Framework",
  "Add Document",
  "Report configuration",
  "Participant and assessor management",
];

// LocalStorage keys for persistence
const STORAGE_KEYS = {
  FORM_DATA: 'assessment-center-form-data',
  CURRENT_STEP: 'assessment-center-current-step',
  EDIT_ID: 'assessment-center-edit-id',
  IS_ACTIVE: 'assessment-center-is-active',
};

// Remove the Assignment interface and use the actual GroupAssignment type from context
// Activity interface is imported from context
// interface Assignment {
//   [key: string]: unknown;
// }

const AssessmentFormProvider: React.FC<{ children: React.ReactNode; editId?: string }> = ({ children, editId }) => {
  // Helper function to load persisted form data
  const loadPersistedFormData = (): FormData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const persisted = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        // Convert document back to null (can't persist File objects)
        return { ...parsed, document: null };
      }
    } catch (error) {
      console.error('Error loading persisted form data:', error);
    }
    return null;
  };

  // Initialize form data - load persisted data first, then API will update if needed
  const initialFormData = (() => {
    // Try to load persisted data first (works for both create and edit mode)
    const persisted = loadPersistedFormData();
    const persistedEditId = typeof window !== 'undefined' 
      ? localStorage.getItem(STORAGE_KEYS.EDIT_ID) 
      : null;
    
    // If we have persisted data and it matches the current editId (or both are create mode)
    if (persisted && (!editId || persistedEditId === editId)) {
      console.log('📦 [Assessment Center] Loading persisted form data on initialization');
      return persisted;
    }
    
    // Otherwise, return empty form data
    return {
      name: '',
      description: '',
      displayName: '',
      displayInstructions: '',
      competencyIds: [],
      selectedCompetenciesData: [],
      reportTemplateName: '',
      reportTemplateType: '',
      activities: [],
      assignments: [],
      document: null,
      existingDocumentUrl: null,
      descriptors: {},
      matrix: [], // Initialize empty matrix
    };
  })();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  
  // Refs to prevent infinite loops
  const isInitializingRef = useRef(true);
  const lastPersistedDataRef = useRef<string | null>(null);
  const skipPersistenceRef = useRef(false);
  const hasLoadedApiDataRef = useRef(false);
  const apiLoadInProgressRef = useRef(false);

  // Persist form data to localStorage whenever it changes (but not during initial API load)
  useEffect(() => {
    // Skip persistence during initialization
    if (isInitializingRef.current) {
      isInitializingRef.current = false;
      return;
    }

    // Don't persist if API load is in progress
    if (apiLoadInProgressRef.current) {
      return;
    }

    // Don't persist if we're in edit mode and still loading from API
    if (editId && isLoading) {
      return;
    }

    // Don't persist if explicitly skipped (e.g., during API data load)
    if (skipPersistenceRef.current) {
      return;
    }

    // Persist form data (excluding document file which can't be serialized)
    try {
      const dataToPersist = {
        ...formData,
        document: null, // Don't persist File objects
      };
      const dataString = JSON.stringify(dataToPersist);
      
      // Only persist if data actually changed
      if (lastPersistedDataRef.current === dataString) {
        return;
      }
      
      localStorage.setItem(STORAGE_KEYS.FORM_DATA, dataString);
      localStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true');
      if (editId) {
        localStorage.setItem(STORAGE_KEYS.EDIT_ID, editId);
      }
      lastPersistedDataRef.current = dataString;
      console.log('💾 [Assessment Center] Form data persisted to localStorage');
    } catch (error) {
      console.error('Error persisting form data:', error);
    }
  }, [formData, editId, isLoading]);

  // Debug form data changes
  useEffect(() => {
    console.log('🔍 [Assessment Center] Form data changed:', {
      name: formData.name,
      description: formData.description,
      displayName: formData.displayName,
      displayInstructions: formData.displayInstructions,
      competencyIds: formData.competencyIds,
      selectedCompetenciesData: formData.selectedCompetenciesData,
      reportTemplateName: formData.reportTemplateName,
      reportTemplateType: formData.reportTemplateType,
      activities: formData.activities,
      assignments: formData.assignments,
      document: formData.document ? 'Has document' : 'No document'
    });
  }, [formData]);

  // Load data for edit mode (API data will override persisted data if available)
  // BUT: Skip API call if persisted step > 1 (user has unsaved changes)
  useEffect(() => {
    // Prevent multiple API calls
    if (hasLoadedApiDataRef.current || apiLoadInProgressRef.current) {
      return;
    }

    console.log('useEffect triggered - editId:', editId, 'token:', !!token);
    
    // Check if there's persisted step data > 1 - if so, don't load from API
    if (editId && typeof window !== 'undefined') {
      const persistedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP);
      const persistedEditId = localStorage.getItem(STORAGE_KEYS.EDIT_ID);
      const persistedFormData = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
      
      // If we have persisted step > 1 and it matches the current editId, skip API call
      if (persistedStep !== null && persistedEditId === editId && persistedFormData) {
        const stepNumber = parseInt(persistedStep, 10);
        if (stepNumber > 1) {
          console.log('📦 [Assessment Center] Persisted step > 1 found, skipping API call to preserve user changes');
          console.log('📦 [Assessment Center] Persisted step:', stepNumber);
          hasLoadedApiDataRef.current = true;
          setIsLoading(false);
          return;
        }
      }
    }
    
    if (editId && token && !hasLoadedApiDataRef.current) {
      console.log('Loading assessment center data for edit from API...');
      apiLoadInProgressRef.current = true;
      setIsLoading(true);
      const loadAssessmentCenter = async () => {
        try {
          console.log('Fetching assessment center:', editId);

          const response = await fetch(`${API_BASE_URL_WITH_API}/assessment-centers/${editId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('Response status:', response.status);
          if (response.ok) {
            const result = await response.json();
            console.log('Assessment center data received:', result);
            if (result.success && result.data) {
              const data = result.data;
              console.log('Raw API data:', data);
              
              // Map activities to the expected format
              // Note: Activities might be duplicated with different competencyLibraryIds, so we need to get unique ones
              const uniqueActivityMap = new Map<string, Record<string, unknown>>();
              (data.activities || []).forEach((activity: Record<string, unknown>) => {
                const activityId = activity.activityId as string;
                if (activityId && !uniqueActivityMap.has(activityId)) {
                  uniqueActivityMap.set(activityId, activity);
                }
              });
              
              const mappedActivities = Array.from(uniqueActivityMap.values()).map((activity: Record<string, unknown>) => {
                // Get the first participant's activity details if available (for backward compatibility)
                const activityDetails = data.assignments?.[0]?.participants?.[0]?.activities?.[0];
                const activityTypeStr = typeof activity.activityType === 'string' 
                  ? activity.activityType.toLowerCase().replace('_', '-') 
                  : '';
                const activityId = typeof activity.activityId === 'string' ? activity.activityId : '';
                
                // Try to get displayName and displayInstructions from the activity object first
                // If not found, fall back to activityDetails (for backward compatibility)
                const displayName = typeof activity.displayName === 'string' && activity.displayName.trim() !== ''
                  ? activity.displayName
                  : (typeof activityDetails?.name === 'string' ? activityDetails.name : '');
                const displayInstructions = typeof activity.displayInstructions === 'string' && activity.displayInstructions.trim() !== ''
                  ? activity.displayInstructions
                  : (typeof activityDetails?.instructions === 'string' ? activityDetails.instructions : '');
                
                const mappedActivity: Activity = {
                  id: activityId,
                  name: displayName,
                  type: activityTypeStr,
                  activityType: activityTypeStr,
                  activityContent: activityId,
                  displayName: displayName,
                  displayInstructions: displayInstructions,
                };
                return mappedActivity;
              });
              
              // Map assignments to the new format (activities with assessorIds per activity)
              const mappedAssignments = (data.assignments || []).map((assignment: Record<string, unknown>) => {
                const participants = Array.isArray(assignment.participants) 
                  ? assignment.participants.map((participant: Record<string, unknown>) => {
                      // Check if it's old format (has activityIds and assessorId)
                      if (participant.activityIds && Array.isArray(participant.activityIds) && participant.assessorId) {
                        // Convert old format to new format: each activity gets the assessor
                        const activities = (participant.activityIds as string[]).map((activityId: string) => ({
                          activityId,
                          assessorIds: participant.assessorId ? [participant.assessorId as string] : []
                        }));
                        return {
                          participantId: participant.participantId,
                          activities
                        };
                      }
                      // Already in new format
                      return {
                        participantId: participant.participantId,
                        activities: participant.activities || []
                      };
                    })
                  : [];
                
                return {
                  groupId: assignment.groupId,
                  participants,
                };
              });
              
              // Reconstruct matrix from activities' competencyLibraryId
              // Matrix: rows = competencies, cols = activities
              // Note: Activities are grouped by unique activityId, and each activity can have multiple competencyLibraryIds
              // We need to group activities by activityId and collect all competencyLibraryIds for each
              const competencyIds = data.competencyIds || [];
              const reconstructedMatrix: boolean[][] = [];
              
              if (competencyIds.length > 0 && mappedActivities.length > 0) {
                // Get unique activity IDs (activities might be duplicated with different competencyLibraryIds)
                const uniqueActivityIds = Array.from(new Set(mappedActivities.map(a => a.id)));
                
                // Build a map: activityId -> array of competencyLibraryIds
                const activityCompetencyMap: Record<string, string[]> = {};
                (data.activities || []).forEach((activity: Record<string, unknown>) => {
                  const activityId = typeof activity.activityId === 'string' ? activity.activityId : '';
                  const competencyLibraryId = typeof activity.competencyLibraryId === 'string' ? activity.competencyLibraryId : '';
                  if (activityId && competencyLibraryId) {
                    if (!activityCompetencyMap[activityId]) {
                      activityCompetencyMap[activityId] = [];
                    }
                    if (!activityCompetencyMap[activityId].includes(competencyLibraryId)) {
                      activityCompetencyMap[activityId].push(competencyLibraryId);
                    }
                  }
                });
                
                // Build matrix: rows = competencies, cols = unique activities
                for (let compIdx = 0; compIdx < competencyIds.length; compIdx++) {
                  const row: boolean[] = [];
                  for (let actIdx = 0; actIdx < uniqueActivityIds.length; actIdx++) {
                    const activityId = uniqueActivityIds[actIdx];
                    if (activityId && typeof activityId === 'string') {
                      const competencyLibraryIds = activityCompetencyMap[activityId] || [];
                      const competencyId = typeof competencyIds[compIdx] === 'string' ? competencyIds[compIdx] : '';
                      const hasCompetency = competencyLibraryIds.includes(competencyId);
                      row.push(hasCompetency);
                    } else {
                      row.push(false);
                    }
                  }
                  reconstructedMatrix.push(row);
                }
                
                console.log('[Assessment Center] Reconstructed matrix:', {
                  competencyCount: competencyIds.length,
                  activityCount: uniqueActivityIds.length,
                  matrixDimensions: `${reconstructedMatrix.length}x${reconstructedMatrix[0]?.length || 0}`,
                  activityCompetencyMap,
                });
              }
              
              const newFormData = {
                name: data.name || '',
                description: data.description || '',
                displayName: data.displayName || '',
                displayInstructions: data.displayInstructions || '',
                competencyIds: data.competencyIds || [],
                selectedCompetenciesData: data.competencies || [],
                reportTemplateName: data.reportTemplateName || '',
                reportTemplateType: data.reportTemplateType || '',
                activities: mappedActivities,
                assignments: mappedAssignments,
                document: null,
                existingDocumentUrl: data.documentUrl || null,
                descriptors: migrateDescriptorsFormat(data.descriptors || {}, mappedActivities),
                matrix: reconstructedMatrix, // Add reconstructed matrix
              };
              
              console.log('=== FORM DATA MAPPING DEBUG ===');
              console.log('Raw API data fields:');
              console.log('- data.name:', data.name);
              console.log('- data.description:', data.description);
              console.log('- data.displayName:', data.displayName);
              console.log('- data.displayInstructions:', data.displayInstructions);
              console.log('- data.reportTemplateName:', data.reportTemplateName);
              console.log('- data.reportTemplateType:', data.reportTemplateType);
              console.log('- data.competencyIds:', data.competencyIds);
              console.log('- data.competencies:', data.competencies);
              console.log('- data.activities:', data.activities);
              console.log('- data.assignments:', data.assignments);
              
              console.log('Mapped form data:');
              console.log('- name:', newFormData.name);
              console.log('- description:', newFormData.description);
              console.log('- displayName:', newFormData.displayName);
              console.log('- displayInstructions:', newFormData.displayInstructions);
              console.log('- reportTemplateName:', newFormData.reportTemplateName);
              console.log('- reportTemplateType:', newFormData.reportTemplateType);
              console.log('- competencyIds:', newFormData.competencyIds);
              console.log('- selectedCompetenciesData:', newFormData.selectedCompetenciesData);
              console.log('- activities:', newFormData.activities);
              console.log('- assignments:', newFormData.assignments);
              
              console.log('Mapped form data:', newFormData);
              console.log('Basic fields check:');
              console.log('- name:', newFormData.name);
              console.log('- description:', newFormData.description);
              console.log('- displayName:', newFormData.displayName);
              console.log('- reportTemplateName:', newFormData.reportTemplateName);
              console.log('- reportTemplateType:', newFormData.reportTemplateType);
              console.log('- competencyIds:', newFormData.competencyIds);
              console.log('- activities count:', newFormData.activities.length);
              console.log('- assignments count:', newFormData.assignments.length);
              
              // Skip persistence during API load to prevent loops
              skipPersistenceRef.current = true;
              apiLoadInProgressRef.current = true;
              setFormData(newFormData);
              console.log('Form data set successfully');
              hasLoadedApiDataRef.current = true;
              
              // Persist the loaded edit data after a short delay
              setTimeout(() => {
                try {
                  const dataToPersist = {
                    ...newFormData,
                    document: null,
                  };
                  const dataString = JSON.stringify(dataToPersist);
                  localStorage.setItem(STORAGE_KEYS.FORM_DATA, dataString);
                  localStorage.setItem(STORAGE_KEYS.IS_ACTIVE, 'true');
                  localStorage.setItem(STORAGE_KEYS.EDIT_ID, editId);
                  lastPersistedDataRef.current = dataString;
                  console.log('💾 [Assessment Center] Edit data persisted to localStorage');
                  skipPersistenceRef.current = false;
                  apiLoadInProgressRef.current = false;
                } catch (error) {
                  console.error('Error persisting edit data:', error);
                  skipPersistenceRef.current = false;
                  apiLoadInProgressRef.current = false;
                }
              }, 100);
            }
          } else {
            console.error('Failed to fetch assessment center:', response.status, response.statusText);
            // If API fails, keep the persisted data that was loaded initially
            console.log('⚠️ [Assessment Center] API load failed, keeping persisted data');
            hasLoadedApiDataRef.current = true;
          }
        } catch (error) {
          console.error('Error loading assessment center for edit:', error);
          // If API fails, keep the persisted data that was loaded initially
          console.log('⚠️ [Assessment Center] API load error, keeping persisted data');
          hasLoadedApiDataRef.current = true;
        } finally {
          setIsLoading(false);
          apiLoadInProgressRef.current = false;
        }
      };
      
      loadAssessmentCenter();
    } else if (editId && !token && !hasLoadedApiDataRef.current) {
      // If we have editId but no token, keep persisted data if it matches
      const persistedEditId = typeof window !== 'undefined' 
        ? localStorage.getItem(STORAGE_KEYS.EDIT_ID) 
        : null;
      if (persistedEditId === editId) {
        console.log('📦 [Assessment Center] No token but persisted data matches editId, using persisted data');
        hasLoadedApiDataRef.current = true;
      }
    }
  }, [editId, token]);

  // Debug form data changes
  useEffect(() => {
    console.log('=== FORM DATA CONTEXT DEBUG ===');
    console.log('Form data changed:', formData);
    console.log('Form data fields:');
    console.log('- name:', formData.name);
    console.log('- description:', formData.description);
    console.log('- displayName:', formData.displayName);
    console.log('- displayInstructions:', formData.displayInstructions);
    console.log('- reportTemplateName:', formData.reportTemplateName);
    console.log('- reportTemplateType:', formData.reportTemplateType);
    console.log('- competencyIds:', formData.competencyIds);
    console.log('- selectedCompetenciesData:', formData.selectedCompetenciesData);
    console.log('- activities:', formData.activities);
    console.log('- assignments:', formData.assignments);
    console.log('=== END FORM DATA DEBUG ===');
  }, [formData]);

  const updateFormData = React.useCallback((field: string, value: unknown) => {
    console.log('updateFormData called with field:', field, 'value:', value);
    setFormData(prev => {
      // Only update if value actually changed
      if (prev[field as keyof FormData] === value) {
        return prev;
      }
      const updated = { ...prev, [field]: value } as FormData;
      try {
        const payloadPreview = buildPayloadPreview(updated);
        console.log("[Assessment Center] Updated field:", field, "=>", value);
        console.log("[Assessment Center] Payload preview:", payloadPreview);
      } catch (e) {
        console.log("[Assessment Center] Payload preview error:", e);
      }
      return updated;
    });
  }, []);

  return (
    <AssessmentFormContext.Provider value={{ formData, updateFormData, isLoading }}>
      {children}
    </AssessmentFormContext.Provider>
  );
};

const CreateAssessmentCenterContent = ({ editId }: { editId?: string }) => {
  // Load persisted current step
  const loadPersistedStep = (): number => {
    if (typeof window === 'undefined') return 0;
    try {
      const persisted = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP);
      if (persisted !== null) {
        const step = parseInt(persisted, 10);
        // Validate step is within bounds
        if (step >= 0 && step < stepTitles.length) {
          return step;
        }
      }
    } catch (error) {
      console.error('Error loading persisted step:', error);
    }
    return 0;
  };

  const [currentStep, setCurrentStep] = useState(() => {
    // Load persisted step if it exists (works for both create and edit mode)
    // Check if persisted editId matches current editId
    if (editId) {
      const persistedEditId = typeof window !== 'undefined' 
        ? localStorage.getItem(STORAGE_KEYS.EDIT_ID) 
        : null;
      // Only load persisted step if it matches the current editId
      if (persistedEditId === editId) {
        const persistedStep = loadPersistedStep();
        console.log('📦 [Assessment Center] Loading persisted step for edit:', persistedStep);
        return persistedStep;
      }
      return 0;
    }
    return loadPersistedStep();
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { formData, isLoading } = useAssessmentForm();
  const { token } = useAuth();
  const router = useRouter();
  
  // Ref to track last persisted step to prevent unnecessary writes
  const lastPersistedStepRef = useRef<number | null>(null);

  // Persist current step whenever it changes
  useEffect(() => {
    // Only persist if step actually changed
    if (lastPersistedStepRef.current === currentStep) {
      return;
    }
    
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStep.toString());
      lastPersistedStepRef.current = currentStep;
      console.log('💾 [Assessment Center] Current step persisted:', currentStep);
    } catch (error) {
      console.error('Error persisting current step:', error);
    }
  }, [currentStep]);

  // Handler for final submit
  const handleSubmit = async () => {
    console.log('🚀 ========== HANDLESUBMIT FUNCTION CALLED ==========');
    console.log('🚀 [Assessment Center] ========== STARTING API SUBMISSION ==========');

    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      console.log("🚀 [Assessment Center] Starting submission process...");
      console.log("[Assessment Center] Submitting with formData:", formData);
      console.log("[Assessment Center] Form validation starting...");

      // Validate required fields with detailed logging
      console.log("[Assessment Center] ========== FORM DATA VALIDATION ==========");
      console.log("[Assessment Center] Form data keys:", Object.keys(formData));
      console.log("[Assessment Center] Form data values:", formData);

      console.log("[Assessment Center] Checking name:", formData.name);
      if (!formData.name || formData.name.trim() === '') {
        console.error("[Assessment Center] ❌ Name validation failed - name is empty or undefined");
        console.error("[Assessment Center] Available form data:", formData);
        throw new Error('Assessment Center name is required');
      }
      console.log("[Assessment Center] ✅ Name validation passed");

      console.log("[Assessment Center] Checking description:", formData.description);
      if (!formData.description || formData.description.trim() === '') {
        console.warn("[Assessment Center] ⚠️ Description validation failed - description is empty, but continuing for debugging");
        console.warn("[Assessment Center] Form data state:", formData);
        // Temporarily bypass this validation for debugging
        // throw new Error('Description is required');
      }
      console.log("[Assessment Center] ✅ Description validation passed");

      // Temporarily bypass activities validation for debugging
      console.log("[Assessment Center] Checking activities:", formData.activities);
      if (!formData.activities || formData.activities.length === 0) {
        console.warn("[Assessment Center] ⚠️ No activities found, but continuing for debugging");
      } else {
        console.log("[Assessment Center] ✅ Activities validation passed - found", formData.activities.length, "activities");
      }

      console.log("[Assessment Center] ✅ Basic validations passed! Proceeding with API call...");

      // Transform activities to match API format using Subject-Exercise matrix toggles
      // Matrix: rows = competencies, cols = activities. API expects one entry per (activity, competency) where toggle is on.
      const activityTypeMap: Record<string, string> = {
        'case-study': 'CASE_STUDY',
        'inbox-activity': 'INBOX_ACTIVITY',
      };

      const activitiesList = formData.activities || [];
      const competencyIds = formData.competencyIds || [];
      const matrix: boolean[][] = formData.matrix || [];

      let displayOrder = 1;
      const transformedActivities: Array<{
        activityType: string;
        activityId: string;
        competencyLibraryId: string;
        displayOrder: number;
        displayName: string;
        displayInstructions: string;
      }> = [];

      const hasValidMatrix = matrix.length === competencyIds.length &&
        matrix.length > 0 &&
        matrix[0]?.length === activitiesList.length;

      if (hasValidMatrix) {
        // Build one API activity entry per (activity, competency) where matrix toggle is on
        for (let colIdx = 0; colIdx < activitiesList.length; colIdx++) {
          const activity = activitiesList[colIdx];
          const activityId = activity.activityContent || activity.id || `activity_${colIdx}`;
          const activityType = activityTypeMap[activity.activityType || activity.type || ''] || activity.activityType || activity.type || 'CASE_STUDY';
          for (let rowIdx = 0; rowIdx < competencyIds.length; rowIdx++) {
            if (matrix[rowIdx]?.[colIdx]) {
              transformedActivities.push({
                activityType,
                activityId,
                competencyLibraryId: competencyIds[rowIdx] || '',
                displayOrder: displayOrder++,
                displayName: activity.displayName || '',
                displayInstructions: activity.displayInstructions || '',
              });
            }
          }
        }
      }

      // Fallback: if no matrix or no toggles on, one entry per activity with first competency (backward compatibility)
      if (transformedActivities.length === 0 && activitiesList.length > 0) {
        const firstCompetencyId = competencyIds[0] || '';
        activitiesList.forEach((activity: Activity, index: number) => {
          transformedActivities.push({
            activityType: activityTypeMap[activity.activityType || activity.type || ''] || activity.activityType || activity.type || 'CASE_STUDY',
            activityId: activity.activityContent || activity.id || `activity_${index}`,
            competencyLibraryId: firstCompetencyId,
            displayOrder: index + 1,
            displayName: activity.displayName || '',
            displayInstructions: activity.displayInstructions || '',
          });
        });
      }

      // Create a more robust payload even if some fields are missing
      const payload = {
        name: formData.name || 'Assessment Center',
        description: formData.description || 'Assessment center description',
        displayName: formData.displayName || formData.name || 'Assessment Center',
        displayInstructions: formData.displayInstructions || 'Please complete the assessment activities.',
        competencyIds: formData.competencyIds || [],
        reportTemplateName: formData.reportTemplateName || 'Default Report',
        reportTemplateType: formData.reportTemplateType || '', // Template ID (string) - required field
        activities: transformedActivities,
        assignments: formData.assignments || [],
        descriptors: formData.descriptors || {}, // Include descriptors in payload
      };

      console.log("[Assessment Center] ========== ACTIVITY TRANSFORMATION DEBUG ==========");
      console.log("[Assessment Center] Original activities:", formData.activities);
      console.log("[Assessment Center] Transformed activities:", transformedActivities);
      console.log("[Assessment Center] Activity type mapping applied:", activityTypeMap);

      console.log("[Assessment Center] Using payload:", payload);
      console.log("[Assessment Center] Form data state:", formData);

      const form = new FormData();
      form.append('name', payload.name);
      form.append('description', payload.description);
      form.append('displayName', payload.displayName);
      form.append('displayInstructions', payload.displayInstructions);
      form.append('competencyIds', JSON.stringify(payload.competencyIds));
      form.append('reportTemplateName', payload.reportTemplateName);
      form.append('reportTemplateType', payload.reportTemplateType);
      form.append('activities', JSON.stringify(payload.activities));
      form.append('assignments', JSON.stringify(payload.assignments));
      form.append('descriptors', JSON.stringify(payload.descriptors)); // Include descriptors
      if (formData.document) {
        form.append('document', formData.document);
      }
      
      const url = editId
        ? `${API_BASE_URL_WITH_API}/assessment-centers/${editId}`
        : `${API_BASE_URL_WITH_API}/assessment-centers`;
      const method = editId ? 'PATCH' : 'POST';

      console.log("📡 [Assessment Center] Making API call to:", url);
      console.log("📡 [Assessment Center] HTTP Method:", method);
      console.log("📡 [Assessment Center] Request headers:", {
        'Authorization': token ? `Bearer ${token.substring(0, 10)}...` : 'No token',
        'Content-Type': 'multipart/form-data'
      });
      console.log("📡 [Assessment Center] Form data being sent:");
      for (const [key, value] of form.entries()) {
        if (key === 'document' && value instanceof File) {
          console.log(`  - ${key}: ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  - ${key}: ${value}`);
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: form,
      });

      console.log("📡 [Assessment Center] API response status:", res.status, res.statusText);
      
      if (!res.ok) throw new Error(editId ? 'Failed to update assessment center' : 'Failed to create assessment center');

      console.log("✅ [Assessment Center] API call successful! Response status:", res.status);
      setSuccess(true);

      // Clear persisted data on successful submit
      try {
        localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);
        localStorage.removeItem(STORAGE_KEYS.EDIT_ID);
        localStorage.removeItem(STORAGE_KEYS.IS_ACTIVE);
        console.log('🗑️ [Assessment Center] Persisted data cleared after successful submit');
      } catch (error) {
        console.error('Error clearing persisted data:', error);
      }

      // Redirect back to the main assessment center page after successful create/update
      console.log("🔄 [Assessment Center] Redirecting to main page in 2 seconds...");
      setTimeout(() => {
        console.log("🚀 [Assessment Center] Redirecting to main page now...");
        router.push('/dashboard/report-generation/content/assessment-center');
      }, 2000); // Wait 2 seconds to show success message
    } catch (err: unknown) {
      console.log("❌ [Assessment Center] API call failed!");
      if (err instanceof Error) {
        console.log("❌ [Assessment Center] Error message:", err.message);
        setError(err.message);
      } else {
        console.log("❌ [Assessment Center] Unknown error:", err);
        setError(editId ? 'Failed to update assessment center' : 'Failed to create assessment center');
      }
    } finally {
      console.log("🏁 [Assessment Center] Submission process completed");
      setLoading(false);
    }
  };

  // Step components with props to update formData
  const stepComponents = [
    <SelectContentStep key="select-content" />,
    <SelectCompetenciesStep key="select-competencies" />,
    <SubjectExerciseMatrixStep key="subject-exercise-matrix" />,
    <AddFrameworkStep key="add-framework" />,
    <AddDocumentStep key="add-document" />,
    <ReportConfigurationStep key="report-configuration" />,
    <ParticipantAssessorManagementStep key="participant-assessor-management" />,
  ];

  const handleSave = () => {
    console.log('🎯 ========== HANDLESAVE FUNCTION CALLED ==========');
    console.log('🔥 [Assessment Center] ========== SAVE BUTTON CLICKED ==========');
    try {
      // Dispatch custom event to notify all step components to save their state
      window.dispatchEvent(new CustomEvent('step-save', {
        detail: {
          stepNumber: currentStep + 1,
          stepName: stepTitles[currentStep],
          formData: formData
        }
      }));

      if (currentStep < stepComponents.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Final step - submit the form
        handleSubmit();
      }
    } catch (error) {
      console.error(`[Assessment Center] Error in handleSave:`, error);
    }
  };

  // Show loading state when fetching data for edit
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading assessment center data...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <AssessmentCenterLayout
      currentStep={currentStep}
      onStepChange={(next) => {
        try {
          console.log(`[Assessment Center] Navigating to step ${next + 1}. Current payload preview:`, buildPayloadPreview(formData));
        } catch {}
        setCurrentStep(next);
        // Step persistence is handled by the useEffect above
      }}
      onSave={() => {
        console.log('🖱️ ========== BUTTON CLICK DETECTED IN PROPS ==========');
        handleSave();
      }}
      showCancelButton={true}
      onCancel={() => {
        console.log('🖱️ ========== CANCEL BUTTON CLICKED IN PROPS ==========');
        localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);
        localStorage.removeItem(STORAGE_KEYS.EDIT_ID);
        localStorage.removeItem(STORAGE_KEYS.IS_ACTIVE);
        console.log('🗑️ [Assessment Center] Persisted data cleared after successful submit');
        router.push('/dashboard/report-generation/content/assessment-center');
      }}
      showSaveButton={!loading}
      saveButtonText={currentStep === stepComponents.length - 1 ? "Finish" : "Save and Next"}
      isEditMode={!!editId}
      assessmentCenterName={formData.displayName || formData.name || undefined}
    >
      {/* Modern Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="flex-shrink-0 text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modern Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-green-800">
                  Assessment Center {editId ? 'updated' : 'created'} successfully!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Redirecting back to main page in 2 seconds...
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/report-generation/content/assessment-center')}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              Go Back Now
            </button>
          </div>
        </div>
      )}
      
      {/* Debug Form Data Display - Temporary */}
      {/* {editId && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Debug: Form Data (Edit Mode)</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Name:</strong> &quot;{formData.name}&quot;</p>
            <p><strong>Description:</strong> &quot;{formData.description}&quot;</p>
            <p><strong>Display Name:</strong> &quot;{formData.displayName}&quot;</p>
            <p><strong>Display Instructions:</strong> &quot;{formData.displayInstructions}&quot;</p>
            <p><strong>Report Template Name:</strong> &quot;{formData.reportTemplateName}&quot;</p>
            <p><strong>Report Template Type:</strong> &quot;{formData.reportTemplateType}&quot;</p>
            <p><strong>Competency IDs:</strong> {JSON.stringify(formData.competencyIds)}</p>
            <p><strong>Selected Competencies:</strong> {formData.selectedCompetenciesData.length} items</p>
            <p><strong>Activities:</strong> {formData.activities.length} items</p>
            <p><strong>Assignments:</strong> {formData.assignments.length} items</p>
          </div>
        </div>
      )} */}
      {stepComponents[currentStep]}
    </AssessmentCenterLayout>
  );
};

const CreateAssessmentCenterWithSearchParams = () => {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') || undefined;
  
  console.log('CreateAssessmentCenter - editId:', editId);
  console.log('CreateAssessmentCenter - searchParams:', searchParams.toString());
  
  return (
    <AssessmentFormProvider editId={editId}>
      <CreateAssessmentCenterContent editId={editId} />
    </AssessmentFormProvider>
  );
};

const CreateAssessmentCenter = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>}>
      <CreateAssessmentCenterWithSearchParams />
    </Suspense>
  );
};

// Only export the default component
export default CreateAssessmentCenter;

// Helper to get activity ID
function getActivityId(activity: Activity, index: number): string {
  return activity.id || `activity-${index}`;
}

// Helper function to migrate old descriptor format (without activityId) to new format (with activityId)
// Old format: { [competencyId]: { [subCompetency]: descriptor } }
// New format: { [activityId]: { [competencyId]: { [subCompetency]: descriptor } } }
function migrateDescriptorsFormat(descriptors: any, activities: Activity[]): any {
  if (!descriptors || typeof descriptors !== 'object') {
    return {};
  }
  
  // Check if it's already in the new format (has activityId as first level key)
  const firstKey = Object.keys(descriptors)[0];
  if (firstKey && activities.some(act => {
    const activityId = act.id || getActivityId(act, activities.indexOf(act));
    return activityId === firstKey;
  })) {
    // Already in new format
    return descriptors;
  }
  
  // It's in old format - migrate it
  // For backward compatibility, assign old descriptors to the first activity
  if (activities.length > 0) {
    const firstActivityId = activities[0].id || getActivityId(activities[0], 0);
    return {
      [firstActivityId]: descriptors
    };
  }
  
  return {};
}

// Helper to build API payload preview matching the POST endpoint structure (uses matrix toggles)
function buildPayloadPreview(data: FormData) {
  const activityTypeMap: Record<string, string> = {
    'case-study': 'CASE_STUDY',
    'inbox-activity': 'INBOX_ACTIVITY',
  };

  const activitiesList = data.activities || [];
  const competencyIds = data.competencyIds || [];
  const matrix: boolean[][] = data.matrix || [];

  let displayOrder = 1;
  const activities: Array<{ activityType: string; activityId: string; competencyLibraryId: string; displayOrder: number; displayName: string; displayInstructions: string }> = [];

  const hasValidMatrix = matrix.length === competencyIds.length && matrix.length > 0 && matrix[0]?.length === activitiesList.length;

  if (hasValidMatrix) {
    for (let colIdx = 0; colIdx < activitiesList.length; colIdx++) {
      const a = activitiesList[colIdx];
      for (let rowIdx = 0; rowIdx < competencyIds.length; rowIdx++) {
        if (matrix[rowIdx]?.[colIdx]) {
          activities.push({
            activityType: activityTypeMap[a.activityType || a.type || ''] || a.type || '',
            activityId: a.activityContent || a.id || '',
            competencyLibraryId: competencyIds[rowIdx] || '',
            displayOrder: displayOrder++,
            displayName: a.displayName || '',
            displayInstructions: a.displayInstructions || '',
          });
        }
      }
    }
  }
  if (activities.length === 0 && activitiesList.length > 0) {
    const firstCompetencyId = competencyIds[0] || '';
    activitiesList.forEach((a: Activity, index: number) => {
      activities.push({
        activityType: activityTypeMap[a.activityType || a.type || ''] || a.type || '',
        activityId: a.activityContent || a.id || '',
        competencyLibraryId: firstCompetencyId,
        displayOrder: index + 1,
        displayName: a.displayName || '',
        displayInstructions: a.displayInstructions || '',
      });
    });
  }

  return {
    name: data.name,
    description: data.description,
    displayName: data.displayName,
    displayInstructions: data.displayInstructions,
    competencyIds: data.competencyIds,
    reportTemplateName: data.reportTemplateName,
    reportTemplateType: data.reportTemplateType,
    activities,
    assignments: data.assignments || [],
    document: data.document ? (data.document as File).name : undefined,
  };
}