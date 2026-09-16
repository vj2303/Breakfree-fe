import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAssessmentForm } from './create/context';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL_WITH_API } from '../../../../../lib/apiConfig';

/**
 * Upload panel for the BARS Excel template.
 *
 * The sheet carries everything the first four wizard steps ask for, so one
 * upload fills in the assessment centre name and activities (step 1), the
 * competencies (step 2), the subject-exercise matrix (step 3) and the score
 * descriptors (step 4). The backend does the name -> id resolution; this
 * component only merges the resulting fragments into the form and reports what
 * could not be resolved.
 */

interface ImportedActivity {
  activityType: string;
  activityContent: string;
  displayName: string;
  displayInstructions: string;
  interactiveActivityType?: string;
  sourceName: string;
  sourceCode: string;
  matched: boolean;
}

interface ImportSummary {
  rowsParsed: number;
  activityCount: number;
  unmatchedActivityCount: number;
  competencyCount: number;
  subCompetencyCount: number;
  anchorCount: number;
  createdCompetencies: string[];
  updatedCompetencies: string[];
}

interface ImportResult {
  name: string;
  activities: ImportedActivity[];
  competencyIds: string[];
  selectedCompetenciesData: Array<{ id: string; name: string }>;
  competencyLibraryList: Array<{ id: string; competencyName: string; subCompetencyNames: string[] }>;
  matrix: boolean[][];
  descriptors: Record<string, unknown>;
  warnings: string[];
  summary: ImportSummary;
}

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls'];

const BarsImportPanel: React.FC = () => {
  const { formData, updateFormData } = useAssessmentForm();
  const { token } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const hasExistingWork =
    Boolean(formData.name) ||
    (formData.activities || []).length > 0 ||
    (formData.competencyIds || []).length > 0;

  const applyImport = (data: ImportResult) => {
    // Field-by-field because the form context exposes a single-field setter;
    // it batches through a functional setState, so the order here is safe.
    updateFormData('name', data.name);
    updateFormData(
      'activities',
      data.activities.map(activity => ({
        activityType: activity.activityType,
        activityContent: activity.activityContent,
        displayName: activity.displayName,
        displayInstructions: activity.displayInstructions,
        interactiveActivityType: activity.interactiveActivityType,
      })),
    );
    updateFormData('competencyIds', data.competencyIds);
    updateFormData('selectedCompetenciesData', data.selectedCompetenciesData);

    // Merge rather than replace: the library list may already hold entries the
    // sheet never mentioned, and step 2 reads sub-competency names from here.
    const existingLibrary = formData.competencyLibraryList || [];
    const importedIds = new Set(data.competencyLibraryList.map(c => c.id));
    updateFormData('competencyLibraryList', [
      ...data.competencyLibraryList,
      ...existingLibrary.filter(c => !importedIds.has(c.id)),
    ]);

    updateFormData('matrix', data.matrix);
    updateFormData('descriptors', data.descriptors);
  };

  const handleFile = async (file: File) => {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      toast.error('Please upload an .xlsx or .xls file');
      return;
    }

    if (hasExistingWork && !window.confirm(
      'Importing will replace the assessment centre name, activities, competencies, matrix and framework you have entered so far. Continue?',
    )) {
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const body = new FormData();
      body.append('file', file);

      const response = await fetch(`${API_BASE_URL_WITH_API}/assessment-centers/import-bars`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body,
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        toast.error(payload?.message || 'Could not read that Excel file');
        if (Array.isArray(payload?.data?.warnings) && payload.data.warnings.length > 0) {
          setResult({
            name: '',
            activities: [],
            competencyIds: [],
            selectedCompetenciesData: [],
            competencyLibraryList: [],
            matrix: [],
            descriptors: {},
            warnings: payload.data.warnings,
            summary: {
              rowsParsed: 0,
              activityCount: 0,
              unmatchedActivityCount: 0,
              competencyCount: 0,
              subCompetencyCount: 0,
              anchorCount: 0,
              createdCompetencies: [],
              updatedCompetencies: [],
            },
          });
        }
        return;
      }

      const data = payload.data as ImportResult;
      applyImport(data);
      setResult(data);
      toast.success(
        `Imported ${data.summary.activityCount} activities, ${data.summary.competencyCount} competencies and ${data.summary.anchorCount} behavioural anchors`,
      );
    } catch (error) {
      console.error('[BarsImportPanel] Import failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const unmatchedActivities = (result?.activities || []).filter(a => !a.matched);

  return (
    <div className="mb-6 p-5 bg-white rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Import from BARS Excel</h3>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
              Upload the BARS template to fill in the assessment centre name, activities, competencies,
              subject-exercise matrix and score descriptors. Columns expected in order: Assessment Center,
              Activity Code, Activity Name, Domain, Sub-Competency, Score, Behavioral Anchor.
            </p>
          </div>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Reading sheet…' : 'Upload Excel'}</span>
          </button>
        </div>
      </div>

      {result && result.summary.rowsParsed > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Imported {result.summary.rowsParsed} rows</span>
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-green-900">
            <div>
              <span className="block font-semibold">{result.summary.activityCount}</span>
              <span className="text-green-700">Activities</span>
            </div>
            <div>
              <span className="block font-semibold">{result.summary.competencyCount}</span>
              <span className="text-green-700">Competencies</span>
            </div>
            <div>
              <span className="block font-semibold">{result.summary.subCompetencyCount}</span>
              <span className="text-green-700">Sub-competencies</span>
            </div>
            <div>
              <span className="block font-semibold">{result.summary.anchorCount}</span>
              <span className="text-green-700">Behavioural anchors</span>
            </div>
          </div>
          {result.summary.createdCompetencies.length > 0 && (
            <p className="mt-3 text-sm text-green-800">
              Added to your competency library: {result.summary.createdCompetencies.join(', ')}
            </p>
          )}
          {result.summary.updatedCompetencies.length > 0 && (
            <p className="mt-1 text-sm text-green-800">
              Extended: {result.summary.updatedCompetencies.join(', ')}
            </p>
          )}
        </div>
      )}

      {unmatchedActivities.length > 0 && (
        <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-900 font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {unmatchedActivities.length} activity name{unmatchedActivities.length > 1 ? 's' : ''} had no
              matching content — pick the content below
            </span>
          </div>
          <ul className="mt-2 list-disc list-inside text-sm text-amber-800">
            {unmatchedActivities.map(activity => (
              <li key={activity.sourceName}>
                {activity.sourceName} <span className="text-amber-600">({activity.sourceCode})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && result.warnings.length > 0 && (
        <details className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <summary className="cursor-pointer text-sm font-medium text-gray-800">
            {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''} from the sheet
          </summary>
          <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
            {result.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default BarsImportPanel;
