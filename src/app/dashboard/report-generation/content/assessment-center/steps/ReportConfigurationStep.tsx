import React, { useEffect, useState } from "react";
import { useAssessmentForm } from '../create/context';
import type { AssessmentStage } from '../create/context';
import { useAuth } from '@/context/AuthContext';
import { ReportStructureApi } from '@/lib/reportStructureApi';
import { API_BASE_URL_WITH_API } from '@/lib/apiConfig';

const STAGE_OPTIONS: { value: AssessmentStage; label: string; hint: string }[] = [
  { value: 'STANDALONE', label: 'Standalone', hint: 'A one-off assessment (default).' },
  { value: 'PRE', label: 'Pre-assessment', hint: 'A baseline that a later Post-assessment is compared against.' },
  { value: 'POST', label: 'Post-assessment', hint: 'A follow-up that measures progress against a Pre-assessment.' },
];

interface PreCentreOption { id: string; name: string }

interface ReportTemplate {
  id: string;
  reportName: string;
  description: string;
  reportTemplate: string;
  aiProfile: string;
  createdDate?: string;
  createdAt?: string;
}

const ReportConfigurationStep = () => {
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const context = useAssessmentForm();
  const { token } = useAuth();
  
  if (!context) {
    throw new Error('ReportConfigurationStep must be used within AssessmentFormContext');
  }
  const { formData, updateFormData } = context;

  // ── Pre/Post stage (BREAK-9) ──────────────────────────────────────────
  const stage: AssessmentStage = (formData.stage as AssessmentStage) || 'STANDALONE';
  const [preCentres, setPreCentres] = useState<PreCentreOption[]>([]);

  // Load existing Pre-assessment centres to link a Post against.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL_WITH_API}/assessment-centers?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        const list = json?.data?.assessmentCenters || json?.assessmentCenters || [];
        if (cancelled) return;
        setPreCentres(
          list
            .filter((c: { stage?: string }) => c.stage === 'PRE')
            .map((c: { id: string; displayName?: string; name?: string }) => ({
              id: c.id,
              name: c.displayName || c.name || 'Untitled',
            }))
        );
      } catch (err) {
        console.error('Error loading pre-assessment centres:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const setStage = (next: AssessmentStage) => {
    updateFormData('stage', next);
    // A link only makes sense for a Post centre; clear it otherwise.
    if (next !== 'POST') updateFormData('comparesToAssessmentCenterId', null);
  };

  // Fetch report structures from API
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!token) {
        setError('Authentication token not available');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await ReportStructureApi.getReportStructures(token, {
          page: 1,
          limit: 100, // Fetch all templates
        });

        if (response.success && response.data) {
          const reportStructures = response.data.reportStructures.map((report) => ({
            id: report.id,
            reportName: report.reportName,
            description: report.description,
            reportTemplate: report.reportTemplate || '',
            aiProfile: report.aiProfile || '',
            createdDate: report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '',
            createdAt: report.createdAt,
          }));
          setTemplates(reportStructures);
        } else {
          setError(response.message || 'Failed to fetch report structures');
        }
      } catch (err) {
        console.error('Error fetching report structures:', err);
        setError('An unexpected error occurred while fetching templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [token]);

  // Update local state when form data changes (for edit mode)
  useEffect(() => {
    if (formData.reportTemplateName) {
      setName(formData.reportTemplateName);
    }
    if (formData.reportTemplateType) {
      // Check if it's a template ID (string) or old format (TEMPLATE1, TEMPLATE2)
      if (formData.reportTemplateType.startsWith('TEMPLATE')) {
        const templateNumber = formData.reportTemplateType.replace('TEMPLATE', '');
        // Try to find template by index (for backward compatibility)
        const templateIndex = parseInt(templateNumber) - 1;
        if (templates[templateIndex]) {
          setSelectedTemplate(templates[templateIndex].id);
        }
      } else {
        // It's a template ID
        setSelectedTemplate(formData.reportTemplateType);
      }
    }
  }, [formData.reportTemplateName, formData.reportTemplateType, templates]);

  useEffect(() => {
    updateFormData('reportTemplateName', name);
    // Store the template ID instead of TEMPLATE1, TEMPLATE2 format
    updateFormData('reportTemplateType', selectedTemplate || '');
    try {
      console.log('[Assessment Center][ReportConfiguration] reportTemplateName:', name, 'reportTemplateType:', selectedTemplate || '');
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, selectedTemplate]);

  // Log when step is saved/next is clicked
  useEffect(() => {
    const handleStepSave = () => {
      try {
        const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
        console.log('=== REPORT CONFIGURATION STEP SAVED ===');
        console.log('Report template name:', name);
        console.log('Selected template ID:', selectedTemplate);
        console.log('Selected template data:', selectedTemplateData);
        console.log('Step validation:', {
          hasTemplateName: name.trim().length > 0,
          hasTemplateSelected: selectedTemplate !== null,
          templateName: name || 'None',
          templateId: selectedTemplate || 'None'
        });
      } catch {}
    };

    // Listen for step save events
    window.addEventListener('step-save', handleStepSave);
    return () => window.removeEventListener('step-save', handleStepSave);
  }, [name, selectedTemplate, templates]);

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-black">Report Configuration</h2>
      </div>
      <div className="bg-white rounded-2xl p-8 max-w-xl">
        <div className="font-bold text-lg text-black mb-4">Report Template</div>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-20 rounded-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
            {error && (
              <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
            <div
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-black bg-white cursor-pointer flex items-center justify-between hover:border-blue-400 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !loading && setDropdownOpen(open => !open)}
            >
              <span className={selectedTemplate ? "text-black" : "text-gray-400"}>
                {selectedTemplate && selectedTemplateData
                  ? selectedTemplateData.reportName
                  : loading
                  ? "Loading templates..."
                  : "Select Template"}
              </span>
              <span className={`text-gray-400 transform transition-transform duration-300 ease-in-out ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}>&#8964;</span>
            </div>
            <div className={`absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden transition-all duration-300 ease-in-out ${
              dropdownOpen && !loading
                ? 'max-h-96 opacity-100 transform translate-y-0' 
                : 'max-h-0 opacity-0 transform -translate-y-2 pointer-events-none'
            }`}>
              {templates.length === 0 && !loading && (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  No templates available
                </div>
              )}
              {templates.map(t => (
                <div
                  key={t.id}
                  className={`px-4 py-3 cursor-pointer transition-all duration-200 ease-in-out hover:bg-blue-50 ${selectedTemplate === t.id ? "text-black font-semibold bg-blue-100" : "text-gray-400 hover:text-black"}`}
                  onClick={() => { 
                    setSelectedTemplate(t.id);
                    setDropdownOpen(false);
                  }}
                >
                  <div className="font-medium">{t.reportName}</div>
                  {t.description && (
                    <div className="text-xs text-gray-500 mt-1">{t.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {selectedTemplateData && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-800 mb-1">Selected Template Details:</div>
                <div className="space-y-1">
                  {selectedTemplateData.description && (
                    <div><span className="font-medium">Description:</span> {selectedTemplateData.description}</div>
                  )}
                  {selectedTemplateData.reportTemplate && (
                    <div><span className="font-medium">Template:</span> {selectedTemplateData.reportTemplate}</div>
                  )}
                  {selectedTemplateData.aiProfile && (
                    <div><span className="font-medium">AI Profile:</span> {selectedTemplateData.aiProfile}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assessment stage (Pre / Post / Standalone) — BREAK-9 */}
      <div className="bg-white rounded-2xl p-8 max-w-xl mt-6">
        <div className="font-bold text-lg text-black mb-1">Assessment stage</div>
        <p className="text-sm text-gray-500 mb-4">
          Tag this as a Pre or Post assessment so the report can compare them.
          A Post-assessment links to the Pre it measures progress against.
        </p>
        <div className="flex flex-col gap-2">
          {STAGE_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                stage === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input
                type="radio"
                name="assessment-stage"
                className="mt-1"
                checked={stage === opt.value}
                onChange={() => setStage(opt.value)}
              />
              <span>
                <span className="block text-black font-medium">{opt.label}</span>
                <span className="block text-xs text-gray-500">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {stage === 'POST' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-black mb-1">
              Measures progress against
            </label>
            <select
              value={formData.comparesToAssessmentCenterId || ''}
              onChange={e => updateFormData('comparesToAssessmentCenterId', e.target.value || null)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a Pre-assessment…</option>
              {preCentres.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {preCentres.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No Pre-assessment centres found. Create one tagged “Pre-assessment” first.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportConfigurationStep;