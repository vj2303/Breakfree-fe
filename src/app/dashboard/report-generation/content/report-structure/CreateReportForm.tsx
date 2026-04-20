"use client"
import React, { useState, useEffect } from 'react'
import { AIProfileApi } from '../../../../../lib/aiProfileApi'
import { useAuth } from '../../../../../context/AuthContext'
import { AIProfile } from '../ai-profile/types'
import { ReportStructureApi, ReportFormData, ReportStructure } from '../../../../../lib/reportStructureApi'

interface CreateReportFormProps {
  onCancel: () => void
  onSave: (data: ReportStructure) => void
  editingReport?: ReportStructure | null
}

const CreateReportForm: React.FC<CreateReportFormProps> = ({ onCancel, onSave, editingReport }) => {
  const { token } = useAuth()
  const [aiProfiles, setAiProfiles] = useState<AIProfile[]>([])
  const [aiProfilesLoading, setAiProfilesLoading] = useState(true)
  const [aiProfilesError, setAiProfilesError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Assessment types available
  const assessmentTypes = [
    { value: 'CASE_STUDY', label: 'Case Study' },
    { value: 'INBOX_ACTIVITY', label: 'Inbox Activity' }
  ];

  const [formData, setFormData] = useState<ReportFormData>({
    reportName: '',
    description: '',
    selectedAssessment: [],
    reportTemplate: 'Report Template 2',
    aiProfile: '',
    reportCover: {
      reportName: true,
      candidateName: true,
      date: true
    },
    part1Introduction: false,
    part2Analysis: {
      detailObservation: true,
      overallCompetencyRating: true
    },
    readinessVsApplication: false,
    part3Comments: {
      areasOfStrength: true,
      areasOfDevelopment: true
    },
    part4OverallRatings: {
      interpretingScoreTable: true,
      competenciesScoreMatrix: true,
      chartType: 'bar'
    },
    part5Recommendation: false
  })

  // Populate form data when editing
  useEffect(() => {
    if (editingReport) {
      // Handle backward compatibility: convert string to array if needed
      let selectedAssessment: string[] = [];
      const assessmentValue = editingReport.selectedAssessment;
      
      if (Array.isArray(assessmentValue)) {
        selectedAssessment = assessmentValue;
      } else if (typeof assessmentValue === 'string') {
        // Try to parse as JSON array, or split by comma, or use as single item
        try {
          const parsed = JSON.parse(assessmentValue);
          selectedAssessment = Array.isArray(parsed) ? parsed : [assessmentValue];
        } catch {
          // If not JSON, check if it's comma-separated
          if (assessmentValue.includes(',')) {
            selectedAssessment = assessmentValue.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else if (assessmentValue) {
            selectedAssessment = [assessmentValue];
          }
        }
      }
      
      setFormData({
        reportName: editingReport.reportName || '',
        description: editingReport.description || '',
        selectedAssessment: selectedAssessment,
        reportTemplate: editingReport.reportTemplate || 'Report Template 2',
        aiProfile: editingReport.aiProfile || '',
        reportCover: editingReport.reportCover || {
          reportName: true,
          candidateName: true,
          date: true
        },
        part1Introduction: editingReport.part1Introduction || false,
        part2Analysis: editingReport.part2Analysis ? {
          detailObservation: editingReport.part2Analysis.detailObservation ?? true,
          overallCompetencyRating: editingReport.part2Analysis.overallCompetencyRating ?? true
        } : {
          detailObservation: true,
          overallCompetencyRating: true
        },
        readinessVsApplication: editingReport.readinessVsApplication ?? false,
        part3Comments: editingReport.part3Comments || {
          areasOfStrength: true,
          areasOfDevelopment: true
        },
        part4OverallRatings: editingReport.part4OverallRatings || {
          interpretingScoreTable: true,
          competenciesScoreMatrix: true,
          chartType: 'bar'
        },
        part5Recommendation: editingReport.part5Recommendation || false
      })
    }
  }, [editingReport])

  // Fetch AI profiles on component mount
  useEffect(() => {
    const fetchAiProfiles = async () => {
      if (!token) {
        setAiProfilesLoading(false)
        setAiProfilesError('Authentication required')
        return
      }

      try {
        setAiProfilesLoading(true)
        setAiProfilesError(null)
        
        const response = await AIProfileApi.getProfiles(token, {
          page: 1,
          limit: 100 // Get all profiles for the dropdown
        })
        
        if (response.success && response.data) {
          setAiProfiles(response.data.aiProfiles || [])
        } else {
          setAiProfilesError(response.message || 'Failed to fetch AI profiles')
        }
      } catch (err) {
        setAiProfilesError('An error occurred while fetching AI profiles')
        console.error('Error fetching AI profiles:', err)
      } finally {
        setAiProfilesLoading(false)
      }
    }

    fetchAiProfiles()
  }, [token])

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedChange = (parent: string, field: string, value: unknown) => {
    setFormData(prev => {
      const parentValue = prev[parent as keyof ReportFormData]
      const parentObject = typeof parentValue === 'object' && parentValue !== null 
        ? parentValue as Record<string, unknown>
        : {}
      
      return {
        ...prev,
        [parent]: {
          ...parentObject,
          [field]: value
        }
      }
    })
  }

  const handleSave = async () => {
    if (!token) {
      setSubmitError('Authentication required')
      return
    }

    // Validate required fields
    if (!formData.reportName.trim()) {
      setSubmitError('Report name is required')
      return
    }

    if (!formData.description.trim()) {
      setSubmitError('Description is required')
      return
    }

    if (!formData.aiProfile) {
      setSubmitError('AI Profile is required')
      return
    }

    // Validate at least one assessment type is selected
    const selectedAssessments = Array.isArray(formData.selectedAssessment) 
      ? formData.selectedAssessment 
      : formData.selectedAssessment ? [formData.selectedAssessment] : [];
    
    if (selectedAssessments.length === 0) {
      setSubmitError('At least one Assessment Type must be selected')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)

      // Prepare data with selectedAssessment as JSON string for backend
      const submitData = {
        ...formData,
        selectedAssessment: JSON.stringify(selectedAssessments) // Convert array to JSON string
      };

      let response
      if (editingReport) {
        // Update existing report structure
        response = await ReportStructureApi.updateReportStructure(token, editingReport.id, submitData)
      } else {
        // Create new report structure
        response = await ReportStructureApi.createReportStructure(token, submitData)
      }
      
      if (response.success && response.data) {
        // Call the parent onSave callback with the data
        onSave(response.data)
      } else {
        setSubmitError(response.message || `Failed to ${editingReport ? 'update' : 'create'} report structure`)
      }
    } catch (err) {
      setSubmitError(`An unexpected error occurred while ${editingReport ? 'updating' : 'saving'} the report structure`)
      console.error(`Error ${editingReport ? 'updating' : 'saving'} report structure:`, err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get selected AI profile details
  const selectedAiProfile = aiProfiles.find(profile => profile.id === formData.aiProfile)

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-black">{editingReport ? 'Edit Report Structure' : 'Create New Report Structure'}</h1>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
          >
            {isSubmitting && (
              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? (editingReport ? 'Updating...' : 'Saving...') : (editingReport ? 'Update Report' : 'Save & Next')}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="space-y-4">
        {/* Error Message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2 flex-1">
                <p className="text-sm text-red-700">{submitError}</p>
                <button
                  onClick={() => setSubmitError(null)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* General Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-black mb-1.5">
              Report Name
            </label>
            <input
              type="text"
              value={formData.reportName}
              onChange={(e) => handleInputChange('reportName', e.target.value)}
              placeholder="Enter Name"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-black mb-1.5">
              Select AI profile
            </label>
            <select
              value={formData.aiProfile}
              onChange={(e) => handleInputChange('aiProfile', e.target.value)}
              disabled={aiProfilesLoading}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {aiProfilesLoading ? 'Loading AI profiles...' : 'Select AI Profile'}
              </option>
              {aiProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.title} ({profile.model})
                </option>
              ))}
            </select>
            {aiProfilesError && (
              <p className="mt-1 text-xs text-red-600">{aiProfilesError}</p>
            )}
            {aiProfiles.length === 0 && !aiProfilesLoading && !aiProfilesError && (
              <p className="mt-1 text-xs text-gray-500">No AI profiles available</p>
            )}
          </div>
        </div>

        {/* Selected AI Profile Details */}
        {selectedAiProfile && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="text-xs font-medium text-black mb-2">Selected AI Profile Details</h3>
            <div className="space-y-1 text-xs text-gray-700">
              <p><span className="font-medium">Title:</span> {selectedAiProfile.title}</p>
              <p><span className="font-medium">Model:</span> {selectedAiProfile.model}</p>
              <p><span className="font-medium">Temperature:</span> {selectedAiProfile.temperature}</p>
              <p><span className="font-medium">System Instruction:</span></p>
              <p className="text-xs bg-white p-2 rounded border-l-2 border-gray-300">
                {selectedAiProfile.systemInstruction}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-black mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-black mb-1.5">
              Select Assessment Type(s)
            </label>
            <div className="border border-gray-200 rounded-lg p-2.5 min-h-[100px] max-h-[180px] overflow-y-auto">
              {assessmentTypes.map((type) => {
                const selectedAssessments = Array.isArray(formData.selectedAssessment) 
                  ? formData.selectedAssessment 
                  : formData.selectedAssessment ? [formData.selectedAssessment] : [];
                const isChecked = selectedAssessments.includes(type.value);
                
                return (
                  <label key={type.value} className="flex items-center mb-1.5 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const current = Array.isArray(formData.selectedAssessment) 
                          ? formData.selectedAssessment 
                          : formData.selectedAssessment ? [formData.selectedAssessment] : [];
                        
                        let updated: string[];
                        if (e.target.checked) {
                          updated = [...current, type.value];
                        } else {
                          updated = current.filter((item: string) => item !== type.value);
                        }
                        handleInputChange('selectedAssessment', updated);
                      }}
                      className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-700">{type.label}</span>
                  </label>
                );
              })}
            </div>
            {Array.isArray(formData.selectedAssessment) && formData.selectedAssessment.length > 0 && (
              <p className="mt-1.5 text-xs text-gray-500">
                {formData.selectedAssessment.length} assessment type(s) selected
              </p>
            )}
          </div>
          
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Report Template
            </label>
            <select
              value={formData.reportTemplate}
              onChange={(e) => handleInputChange('reportTemplate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Report Template 1">Report Template 1</option>
              <option value="Report Template 2">Report Template 2</option>
            </select>
          </div> */}
        </div>

        {/* Report Structural Elements */}
        <div>
          <h2 className="text-base font-semibold text-black mb-4">
            Select Report Structural elements
          </h2>

          {/* Report Cover */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-black mb-2">Report Cover</h3>
            <div className="space-y-1.5">
              {[
                { key: 'reportName', label: 'Report Name' },
                { key: 'candidateName', label: 'Candidate Name' },
                { key: 'date', label: 'Date' }
              ].map((item) => (
                <label key={item.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.reportCover[item.key as keyof typeof formData.reportCover]}
                    onChange={(e) => handleNestedChange('reportCover', item.key, e.target.checked)}
                    className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Part 1: Introduction */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-black mb-2">
              Part 1: Introduction to the Report
            </h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.part1Introduction}
                onChange={(e) => handleInputChange('part1Introduction', e.target.checked)}
                className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
              />
              <span className="text-xs text-gray-700">Introduction</span>
            </label>
          </div>

          {/* Part 2: Analysis */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-black mb-2">
              Part 2: Analysis Of Report
            </h3>
            <div className="space-y-1.5">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.part2Analysis.detailObservation}
                  onChange={(e) => handleNestedChange('part2Analysis', 'detailObservation', e.target.checked)}
                  className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
                />
                <span className="text-xs text-gray-700">Detail Observation</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.part2Analysis.overallCompetencyRating}
                  onChange={(e) => handleNestedChange('part2Analysis', 'overallCompetencyRating', e.target.checked)}
                  className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
                />
                <span className="text-xs text-gray-700">Overall Competency Rating for each competency</span>
              </label>
            </div>
          </div>

          {/* Readiness vs. Application */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-black mb-2">
              Readiness vs. Application
            </h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.readinessVsApplication}
                onChange={(e) => handleInputChange('readinessVsApplication', e.target.checked)}
                className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
              />
              <span className="text-xs text-gray-700">Readiness vs. Application</span>
            </label>
          </div>

          {/* Part 3: Comments */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-black mb-2">
              Part 3: Comments and Evaluation
            </h3>
            <div className="space-y-1.5">
              {[
                { key: 'areasOfStrength', label: 'Areas Of Strength' },
                { key: 'areasOfDevelopment', label: 'Areas Of Development' }
              ].map((item) => (
                <label key={item.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.part3Comments[item.key as keyof typeof formData.part3Comments]}
                    onChange={(e) => handleNestedChange('part3Comments', item.key, e.target.checked)}
                    className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Part 4: Overall Ratings */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-black mb-2">
              Part 4: Overall Ratings
            </h3>
            <div className="space-y-1.5">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.part4OverallRatings.interpretingScoreTable}
                  onChange={(e) => handleNestedChange('part4OverallRatings', 'interpretingScoreTable', e.target.checked)}
                  className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
                />
                <span className="text-xs text-gray-700">Interpreting Score Table</span>
              </label>
              <div className="ml-5">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.part4OverallRatings.competenciesScoreMatrix}
                    onChange={(e) => handleNestedChange('part4OverallRatings', 'competenciesScoreMatrix', e.target.checked)}
                    className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <span className="text-xs text-gray-700">Competencies Score Matrix</span>
                </label>
                {formData.part4OverallRatings.competenciesScoreMatrix && (
                  <div className="ml-5 mt-1.5 space-y-1.5">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="chartType"
                        value="bar"
                        checked={formData.part4OverallRatings.chartType === 'bar'}
                        onChange={(e) => handleNestedChange('part4OverallRatings', 'chartType', e.target.value)}
                        className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300"
                      />
                      <span className="text-xs text-gray-700">Bar Graph</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="chartType"
                        value="pie"
                        checked={formData.part4OverallRatings.chartType === 'pie'}
                        onChange={(e) => handleNestedChange('part4OverallRatings', 'chartType', e.target.value)}
                        className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300"
                      />
                      <span className="text-xs text-gray-700">Pie Chart</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Part 5: Recommendation */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-black mb-2">
              Part 5: Recommendation - IDP
            </h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.part5Recommendation}
                onChange={(e) => handleInputChange('part5Recommendation', e.target.checked)}
                className="mr-2.5 h-3.5 w-3.5 text-black focus:ring-black border-gray-300 rounded"
              />
              <span className="text-xs text-gray-700">Recommendation</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateReportForm
