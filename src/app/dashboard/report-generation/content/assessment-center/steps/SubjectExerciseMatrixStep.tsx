import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAssessmentForm } from '../create/context';

const activityTypeLabel = (type: string) => {
  if (type === 'case-study') return 'Case Study';
  if (type === 'inbox-activity') return 'Inbox Activity';
  return type;
};

// Use the Activity type from FormData (id, name, type)
interface Activity {
  id: string;
  name: string;
  type: string;
  displayName?: string;
  displayInstructions?: string;
}

interface Competency {
  name: string;
  id: string;
  subCompetencyNames: string[];
}

interface CompetencyLibraryItem {
  id: string;
  name: string;
  subCompetencyNames?: string[];
}

interface SubCompetencyScore {
  [subCompetency: string]: string;
}

// Type for mapped activities used in rendering
interface RenderActivity {
  label: string;
  instruction: string;
  activityType: string;
  activityContent: string;
}

// Add interface for form data structure
interface FormData {
  activities?: Activity[];
  selectedCompetenciesData?: Array<{id: string, name: string}>;
  competencyLibraryList?: CompetencyLibraryItem[];
  competencyIds?: string[];
}

const SubjectExerciseMatrixStep: React.FC = () => {
  const context = useAssessmentForm();
  if (!context) {
    throw new Error('SubjectExerciseMatrixStep must be used within AssessmentFormContext');
  }
  const { formData, updateFormData } = context;

  // Activities and competencies from formData - memoized for performance
  const activities: RenderActivity[] = useMemo(() => {
    const formDataActivities = formData.activities || [];
    return formDataActivities.map((a: Activity) => ({
      label: a.displayName || a.name || a.type,
      instruction: a.displayInstructions || '',
      activityType: a.type,
      activityContent: a.id,
    }));
  }, [formData.activities]);

  // Get competency names and subcompetencies from formData (store both id and name)
  const competencies = useMemo(() => {
    const formDataSelectedCompetencies = formData.selectedCompetenciesData || [];
    const formDataCompetencyLibraryList = (formData as FormData).competencyLibraryList || [];
    
    return formDataSelectedCompetencies.map((comp: {id: string, name: string}) => {
      // Find full competency object for subCompetencies
      const full = formDataCompetencyLibraryList.find((c: CompetencyLibraryItem) => c.id === comp.id);
      return {
        name: comp.name,
        id: comp.id,
        subCompetencyNames: full?.subCompetencyNames || [],
      };
    });
  }, [formData]);

  // Fallback for backward compatibility if selectedCompetenciesData is not set
  const fallbackCompetencies = useMemo(() => {
    const formDataCompetencyIds = formData.competencyIds || [];
    return formDataCompetencyIds.map((id: string, idx: number) => ({
      name: `Competency ${idx + 1}`,
      id,
      subCompetencyNames: [],
    }));
  }, [formData.competencyIds]);

  const finalCompetencies = competencies.length > 0 ? competencies : fallbackCompetencies;

  // Matrix state: rows = competencies, cols = activities, default OFF
  const [matrix, setMatrix] = useState<boolean[][]>([]);
  // Scores: { [rowIdx_colIdx]: { [subCompetency]: score } }
  const [scores] = useState<{ [key: string]: SubCompetencyScore }>({});

  // Wrap updateFormData in useCallback to stabilize its reference
  const stableUpdateFormData = useCallback((field: string, value: unknown) => {
    updateFormData(field, value);
  }, [updateFormData]);

  // Initialize matrix - load from formData.matrix if available, otherwise initialize to all false
  // Use same reference when loading from formData to avoid sync loop with the "store in context" effect
  useEffect(() => {
    if (activities.length > 0 && finalCompetencies.length > 0) {
      setMatrix(prev => {
        const expectedRows = finalCompetencies.length;
        const expectedCols = activities.length;

        // Prefer existing matrix from formData (e.g. from API when editing) when dimensions match
        const existingMatrix = formData.matrix;
        if (existingMatrix &&
            Array.isArray(existingMatrix) &&
            existingMatrix.length === expectedRows &&
            existingMatrix[0]?.length === expectedCols) {
          console.log('[SubjectExerciseMatrixStep] Loading existing matrix from formData');
          // Return same reference to avoid triggering sync effect → formData update → this effect loop
          return existingMatrix;
        }

        // If dimensions match and we have valid local state, keep it (user toggles)
        if (prev.length === expectedRows && prev[0]?.length === expectedCols) {
          return prev;
        }

        // Otherwise, initialize new matrix to all false
        console.log('[SubjectExerciseMatrixStep] Initializing new matrix (all false)');
        return finalCompetencies.map((): boolean[] => activities.map((): boolean => false));
      });
    }
  }, [activities, finalCompetencies, formData.matrix]);

  // Store matrix and scores in context only when matrix actually changes (by reference)
  // Avoid writing on every render to prevent update loop with init effect above
  const prevMatrixRef = useRef<boolean[][]>(matrix);
  const prevScoresRef = useRef<typeof scores>(scores);
  useEffect(() => {
    const matrixChanged = prevMatrixRef.current !== matrix;
    const scoresChanged = prevScoresRef.current !== scores;
    if (matrixChanged) {
      prevMatrixRef.current = matrix;
      stableUpdateFormData('matrix', matrix);
    }
    if (scoresChanged) {
      prevScoresRef.current = scores;
      stableUpdateFormData('matrixScores', scores);
    }
  }, [matrix, scores, stableUpdateFormData]);

  // Log when step is saved/next is clicked
  useEffect(() => {
    const handleStepSave = () => {
      try {
        console.log('=== SUBJECT EXERCISE MATRIX STEP SAVED ===');
        console.log('Matrix state:', matrix);
        console.log('Activities count:', activities.length);
        console.log('Competencies count:', finalCompetencies.length);
        console.log('Step validation:', {
          hasMatrix: matrix.length > 0,
          hasActivities: activities.length > 0,
          hasCompetencies: finalCompetencies.length > 0,
          matrixDimensions: `${matrix.length}x${matrix[0]?.length || 0}`
        });
      } catch {}
    };

    // Listen for step save events
    window.addEventListener('step-save', handleStepSave);
    return () => window.removeEventListener('step-save', handleStepSave);
  }, [matrix, activities, finalCompetencies]);

  const handleToggle = (rowIdx: number, colIdx: number) => {
    setMatrix(prev => {
      // Ensure matrix is properly initialized
      if (!prev[rowIdx] || prev[rowIdx].length <= colIdx) {
        console.warn('Matrix not properly initialized for toggle operation');
        return prev;
      }
      
      const newMatrix = prev.map((row: boolean[], r: number) =>
        row.map((val: boolean, c: number) =>
          r === rowIdx && c === colIdx ? !val : val
        )
      );
      
      // Log toggle action for debugging
      console.log(`[Matrix Toggle] Competency ${rowIdx} - Activity ${colIdx}: ${!prev[rowIdx][colIdx]}`);
      return newMatrix;
    });
  };

  if (!activities.length || !finalCompetencies.length) {
    return <div className="text-gray-500">Please select activities and competencies in previous steps.</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-xl font-bold text-gray-900">Subject - Exercise Matrix</h2>
        <span className="text-gray-400 text-sm cursor-help" title="Map competencies to activities">?</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">Competencies</th>
              {activities.map((activity: RenderActivity, idx: number) => (
                <th key={idx} className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                  {activity.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Competency Rows */}
            {finalCompetencies.map((comp: Competency, rowIdx: number) => (
              <tr key={comp.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-gray-900 border-b border-gray-200">{comp.name}</td>
                {activities.map((activity: RenderActivity, colIdx: number) => {
                  const isOn = matrix[rowIdx]?.[colIdx] || false;
                  return (
                    <td key={colIdx} className="px-6 py-4 border-b border-gray-200 text-center align-top">
                      <div className="flex flex-col items-center justify-center">
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isOn}
                            onChange={() => handleToggle(rowIdx, colIdx)}
                            className="sr-only peer"
                            aria-label={`Toggle ${comp.name} for ${activityTypeLabel(activity.activityType)}`}
                          />
                          <div className={`w-11 h-6 rounded-full transition-all duration-300 ease-in-out shadow-inner ${
                            isOn 
                              ? 'bg-gray-900' 
                              : 'bg-gray-200 group-hover:bg-gray-300'
                          }`}></div>
                          <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ease-in-out shadow-md ${
                            isOn ? 'translate-x-5' : 'translate-x-0'
                          }`}></div>
                        </label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubjectExerciseMatrixStep;