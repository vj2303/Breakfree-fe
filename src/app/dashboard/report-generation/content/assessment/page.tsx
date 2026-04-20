'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AssessmentCard from './components/AssessmentCard';
import CreateAssessmentModal from './components/CreateAssessmentModal';
import { AssessmentType, CaseStudy, InteractiveActivityType } from './types/assessment';
import { fetchCaseStudies, updateCaseStudy, deleteCaseStudy } from '@/lib/caseStudyApi';
import { fetchInboxActivities, deleteInboxActivity } from '@/lib/inboxActivityApi';

interface Scenario {
  id: string;
  title: string;
  readTime: number;
  exerciseTime: number;
}

interface Task {
  id: string;
  title: string;
  readTime: number;
  exerciseTime: number;
}

interface InboxActivity {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  scenarios?: Scenario[];
  contents?: unknown[];
  allottedTo?: number;
  attemptedBy?: number;
}

interface InboxActivitiesResponse {
  data: {
    inboxActivities: InboxActivity[];
  };
}

const ACTIVITY_TYPE_OPTIONS: { value: InteractiveActivityType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'GD', label: 'Group Discussion (GD)' },
  { value: 'ROLEPLAY', label: 'Roleplay' },
  { value: 'CASE_STUDY', label: 'Case Study' },
];

export default function AssessmentPage() {
  const [activeTab, setActiveTab] = useState<AssessmentType>('case-study');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState<InteractiveActivityType | 'ALL'>('ALL');
  const router = useRouter();
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [inboxActivities, setInboxActivities] = useState<InboxActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewCaseStudy, setPreviewCaseStudy] = useState<CaseStudy | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<CaseStudy | null>(null);

  // Filter case studies based on activity type
  const filteredCaseStudies = activityTypeFilter === 'ALL' 
    ? caseStudies 
    : caseStudies.filter(cs => cs.interactiveActivityType === activityTypeFilter);

  useEffect(() => {
    if (activeTab === 'case-study') {
      setLoading(true);
      fetchCaseStudies()
        .then(res => {
          setCaseStudies(res.data.caseStudies || []);
          setError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to fetch case studies');
          }
        })
        .finally(() => setLoading(false));
    } else if (activeTab === 'inbox-activity') {
      setLoading(true);
      fetchInboxActivities()
        .then((res: InboxActivitiesResponse) => {
          setInboxActivities(res.data?.inboxActivities || []);
          setError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to fetch inbox activities');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  const handleTabChange = (tab: AssessmentType) => {
    setActiveTab(tab);
  };

  const handleCreateAssessment = (data: {
    name: string;
    description: string;
    interactiveActivityType?: InteractiveActivityType;
  }) => {
    // Store modal data in localStorage for the next page
    if (activeTab === 'inbox-activity') {
      localStorage.setItem('inboxActivityDraft', JSON.stringify(data));
      router.push('/dashboard/report-generation/content/assessment/inbox-activity');
    } else {
      localStorage.setItem('caseStudyDraft', JSON.stringify(data));
      router.push('/dashboard/report-generation/content/assessment/case-study');
    }
  };

  const handleEdit = (assessment: { id: string }) => {
    // Navigate to the multi-step edit flow with the assessment id
    if (assessment.id) {
      if (activeTab === 'case-study') {
        router.push(`/dashboard/report-generation/content/assessment/case-study?id=${assessment.id}`);
      } else if (activeTab === 'inbox-activity') {
        router.push(`/dashboard/report-generation/content/assessment/inbox-activity?id=${assessment.id}`);
      }
    }
  };

  const handleRemove = async (id: string) => {
    const itemType = activeTab === 'inbox-activity' ? 'inbox activity' : 'case study';
    if (window.confirm(`Are you sure you want to delete this ${itemType}?`)) {
      setLoading(true);
      try {
        if (activeTab === 'inbox-activity') {
          await deleteInboxActivity(id);
          // Refresh inbox activities list
          const res = await fetchInboxActivities();
          setInboxActivities(res.data?.inboxActivities || []);
        } else {
          await deleteCaseStudy(id);
          // Refresh case studies list
          const res = await fetchCaseStudies();
          setCaseStudies(res.data.caseStudies || []);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(`Failed to delete ${itemType}`);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePreview = (id: string) => {
    const found = caseStudies.find((c) => c.id === id) || null;
    if (found) {
      setPreviewCaseStudy({
        id: String(found.id ?? ''),
        name: String(found.name ?? found.title ?? ''),
        description: String(found.description ?? ''),
        instructions: String(found.instructions ?? ''),
        videoUrl: String(found.videoUrl ?? ''),
        createdAt: String(found.createdAt ?? found.createdOn ?? ''),
        scenarios: found.scenarios ?? [],
        tasks: found.tasks ?? [],
        title: found.title ?? '',
        createdOn: found.createdOn ?? '',
        allottedTo: found.allottedTo ?? 0,
        attemptedBy: found.attemptedBy ?? 0,
      });
    } else {
      setPreviewCaseStudy(null);
    }
    setEditMode(false);
    if (found) {
      setEditData({
        id: String(found.id ?? ''),
        name: String(found.name ?? found.title ?? ''),
        description: String(found.description ?? ''),
        instructions: String(found.instructions ?? ''),
        videoUrl: String(found.videoUrl ?? ''),
        createdAt: String(found.createdAt ?? found.createdOn ?? ''),
        scenarios: found.scenarios ?? [],
        tasks: found.tasks ?? [],
        title: found.title ?? '',
        createdOn: found.createdOn ?? '',
        allottedTo: found.allottedTo ?? 0,
        attemptedBy: found.attemptedBy ?? 0,
      });
    } else {
      setEditData(null);
    }
  };

  const handleEditSave = async () => {
    setLoading(true);
    try {
      if (!editData) return;
      await updateCaseStudy(editData.id, {
        name: editData.name,
        description: editData.description,
        instructions: editData.instructions,
        videoUrl: editData.videoUrl,
      });
      const res = await fetchCaseStudies();
      setCaseStudies(res.data.caseStudies || []);
      setPreviewCaseStudy(null);
      setEditMode(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update case study');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-8">
            <div className="flex space-x-8">
              <button
                onClick={() => handleTabChange('case-study')}
                className={`pb-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'case-study'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Interactive Activities
              </button>
              <button
                onClick={() => handleTabChange('inbox-activity')}
                className={`pb-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'inbox-activity'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Inbox Activity
              </button>
            </div>
            
            {/* Activity Type Filter - only show for Interactive Activities tab */}
            {activeTab === 'case-study' && (
              <select
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value as InteractiveActivityType | 'ALL')}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                {ACTIVITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            {activeTab === 'inbox-activity' ? 'Create Inbox Activity' : 'Create Assessment'}
          </button>
        </div>

        {/* Content */}
        {loading && <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">Loading...</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'case-study' ? (
            filteredCaseStudies.length > 0 ? (
              filteredCaseStudies.map((assessment: CaseStudy) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={{
                    ...assessment,
                    title: assessment.name,
                    createdOn: new Date(assessment.createdAt).toLocaleDateString(),
                    allottedTo: assessment.allottedTo ?? 0,
                    attemptedBy: assessment.attemptedBy ?? 0,
                  }}
                  onEdit={handleEdit}
                  onPreview={handlePreview}
                  onRemove={handleRemove}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No activities found for the selected type.
              </div>
            )
          ) : (
            inboxActivities.map((activity: InboxActivity) => (
              <AssessmentCard
                key={activity.id}
                assessment={{
                  id: activity.id,
                  title: activity.name,
                  description: activity.description,
                  createdOn: new Date(activity.createdAt).toLocaleDateString(),
                  allottedTo: activity.allottedTo ?? 0,
                  attemptedBy: activity.attemptedBy ?? 0,
                }}
                onEdit={handleEdit}
                onPreview={handlePreview}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>

        {/* Create Assessment Modal */}
        <CreateAssessmentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          activeTab={activeTab}
          onSubmit={handleCreateAssessment}
        />

        {/* Preview Modal */}
        {previewCaseStudy && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-black"
                onClick={() => setPreviewCaseStudy(null)}
              >
                ×
              </button>
              {editMode ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">Edit Case Study</h2>
                  <input
                    className="w-full mb-2 px-3 py-2 border rounded"
                    value={editData?.name ?? ''}
                    onChange={e => setEditData(editData ? { ...editData, name: e.target.value } : null)}
                    placeholder="Name"
                  />
                  <textarea
                    className="w-full mb-2 px-3 py-2 border rounded"
                    value={editData?.description ?? ''}
                    onChange={e => setEditData(editData ? { ...editData, description: e.target.value } : null)}
                    placeholder="Description"
                  />
                  <textarea
                    className="w-full mb-2 px-3 py-2 border rounded"
                    value={editData?.instructions ?? ''}
                    onChange={e => setEditData(editData ? { ...editData, instructions: e.target.value } : null)}
                    placeholder="Instructions"
                  />
                  <input
                    className="w-full mb-2 px-3 py-2 border rounded"
                    value={editData?.videoUrl ?? ''}
                    onChange={e => setEditData(editData ? { ...editData, videoUrl: e.target.value } : null)}
                    placeholder="Video URL"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                      onClick={handleEditSave}
                      disabled={loading}
                    >
                      Save
                    </button>
                    <button
                      className="bg-gray-300 text-black px-4 py-2 rounded"
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-2">{previewCaseStudy.name || <span className='italic text-gray-400'>No Name</span>}</h2>
                  <p className="mb-2 text-gray-700">{previewCaseStudy.description || <span className='italic text-gray-400'>No Description</span>}</p>
                  <div className="flex gap-6 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Allotted to </span>
                      <span className="text-blue-600 font-medium">({previewCaseStudy.allottedTo ?? 0})</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Attempted By </span>
                      <span className="text-blue-600 font-medium">({previewCaseStudy.attemptedBy ?? 0})</span>
                    </div>
                  </div>
                  <div className="mb-2">
                    <strong>Instructions:</strong>
                    <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: previewCaseStudy.instructions || '<span class=\'italic text-gray-400\'>No Instructions</span>' }} />
                  </div>
                  <div className="mb-2">
                    <strong>Video URL:</strong> <span className="text-blue-600">{previewCaseStudy.videoUrl || <span className='italic text-gray-400'>No Video URL</span>}</span>
                  </div>
                  <div className="mb-2">
                    <strong>Scenarios:</strong>
                    <ul className="list-disc ml-6">
                      {(previewCaseStudy.scenarios || []).map((s: Scenario) => (
                        <li key={s.id}>{s.title || <span className='italic text-gray-400'>No Title</span>} (Read: {s.readTime || '-'} min, Exercise: {s.exerciseTime || '-'} min)</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-2">
                    <strong>Tasks:</strong>
                    <ul className="list-disc ml-6">
                      {(previewCaseStudy.tasks || []).map((t: Task) => (
                        <li key={t.id}>{t.title || <span className='italic text-gray-400'>No Title</span>} (Read: {t.readTime || '-'} min, Exercise: {t.exerciseTime || '-'} min)</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
                    onClick={() => setEditMode(true)}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}