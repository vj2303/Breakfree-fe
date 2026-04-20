import React, { useState, useEffect, useMemo } from 'react';
import { InboxActivityData, EmailContent } from './types';
import RichTextEditor from '@/components/RichTextEditor';

interface TaskStepProps {
  activityData?: InboxActivityData;
  submissionData: {
    textContent?: string;
    notes?: string;
    file?: File;
    submissionType: 'TEXT' | 'DOCUMENT' | 'VIDEO';
  };
  setSubmissionData: (data: {
    textContent?: string;
    notes?: string;
    file?: File;
    submissionType: 'TEXT' | 'DOCUMENT' | 'VIDEO';
  }) => void;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
}

const TaskStep: React.FC<TaskStepProps> = ({ 
  activityData, 
  submissionData, 
  setSubmissionData,
  onSaveDraft,
  onSubmit 
}) => {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [emailContent, setEmailContent] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyCc, setReplyCc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  interface SubmissionData {
    id?: string;
    textContent?: string;
    submissionType?: string;
    submissionStatus?: string;
    submittedAt?: string;
    createdAt?: string;
    fileName?: string;
  }
  
  const [existingSubmission, setExistingSubmission] = useState<SubmissionData | null>(null);

  const contents = useMemo(() => activityData?.activityDetail?.contents || [], [activityData?.activityDetail?.contents]);
  const isSubmitted = activityData?.isSubmitted || false;
  const submission = activityData?.submission as SubmissionData | undefined;

  // Load existing submission/draft
  useEffect(() => {
    if (submission) {
      setExistingSubmission(submission);
      if (submission.textContent) {
        setEmailContent(submission.textContent);
        setSubmissionData({
          ...submissionData,
          textContent: submission.textContent,
          submissionType: (submission.submissionType as 'TEXT' | 'DOCUMENT' | 'VIDEO') || 'TEXT'
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission]);

  // Pre-fill reply fields from the first email
  useEffect(() => {
    if (contents.length > 0 && !existingSubmission) {
      const firstEmail = contents[0];
      setReplyTo(firstEmail.from);
      setReplySubject(`Re: ${firstEmail.subject}`);
      if (firstEmail.cc && firstEmail.cc.length > 0) {
        setReplyCc(firstEmail.cc.join(', '));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contents.length, existingSubmission]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmissionData({
        ...submissionData,
        file,
        submissionType: file.type.startsWith('video/') ? 'VIDEO' : 'DOCUMENT'
      });
    }
  };

  const removeFile = () => {
    setSubmissionData({
      ...submissionData,
      file: undefined,
      submissionType: 'TEXT'
    });
    setFileInputKey(prev => prev + 1);
  };

  const handleSaveDraft = async () => {
    if (onSaveDraft) {
      setIsSavingDraft(true);
      try {
        await onSaveDraft();
      } finally {
        setIsSavingDraft(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEmailContentChange = (html: string) => {
    setEmailContent(html);
    setSubmissionData({
      ...submissionData,
      textContent: html,
      submissionType: 'TEXT'
    });
  };

  if (!activityData?.activityDetail || contents.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-black">Task</h2>
        <div className="bg-white p-4 rounded border border-gray-200 text-gray-700">
          <p className="text-sm">No task content available for this activity.</p>
        </div>
      </div>
    );
  }

  const canEdit = !isSubmitted || (existingSubmission?.submissionStatus === 'DRAFT');

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-black">Task</h2>
      
      {/* Original Emails */}
      <div className="bg-white p-4 rounded border border-gray-200 mb-4">
        <h3 className="text-sm font-semibold mb-3 text-black">Inbox Emails</h3>
        <div className="space-y-3">
          {contents.map((content: EmailContent) => (
            <div key={content.id} className="border border-gray-200 rounded p-3 bg-gray-50">
              <div className="flex justify-between items-start mb-1.5">
                <h4 className="font-semibold text-sm text-black">{content.subject}</h4>
                <span className="text-xs text-gray-500">{new Date(content.date).toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-600 mb-1.5 space-y-0.5">
                <p><strong className="text-black">From:</strong> {content.from}</p>
                <p><strong className="text-black">To:</strong> {content.to.join(', ')}</p>
                {content.cc && content.cc.length > 0 && (
                  <p><strong className="text-black">CC:</strong> {content.cc.join(', ')}</p>
                )}
                {content.bcc && content.bcc.length > 0 && (
                  <p><strong className="text-black">BCC:</strong> {content.bcc.join(', ')}</p>
                )}
              </div>
              <div 
                className="prose prose-sm max-w-none text-sm text-gray-800 mt-2 p-2 bg-white rounded border border-gray-200"
                dangerouslySetInnerHTML={{ __html: content.emailContent }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Email Reply Interface */}
      <div className="bg-white p-4 rounded border border-gray-200">
        <h3 className="text-sm font-semibold mb-3 text-black">Compose Reply</h3>
        
        {isSubmitted && existingSubmission?.submissionStatus !== 'DRAFT' && (
          <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded">
            <p className="text-xs text-gray-700">
              <strong className="text-black">Status:</strong> This email has been submitted and cannot be edited.
            </p>
          </div>
        )}

        {existingSubmission?.submissionStatus === 'DRAFT' && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              <strong>Draft Saved:</strong> You have a saved draft. You can continue editing and submit when ready.
            </p>
          </div>
        )}

        {/* Email Form Fields */}
        <div className="space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <input
              type="text"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={replySubject}
              onChange={(e) => setReplySubject(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">CC (Optional)</label>
            <input
              type="text"
              value={replyCc}
              onChange={(e) => setReplyCc(e.target.value)}
              disabled={!canEdit}
              placeholder="Enter email addresses separated by commas"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Rich Text Editor for Email Body */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Message</label>
          {canEdit ? (
            <RichTextEditor
              content={emailContent}
              onChange={handleEmailContentChange}
            />
          ) : (
            <div 
              className="min-h-[200px] border border-gray-200 rounded bg-gray-50 p-3"
              dangerouslySetInnerHTML={{ __html: emailContent || '<p>No content</p>' }}
            />
          )}
        </div>

        {/* Document Upload */}
        {canEdit && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Attach Document (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded p-3">
              <input
                key={fileInputKey}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={!canEdit}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer flex items-center gap-2 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="h-5 w-5 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs text-gray-600">
                  {submissionData.file ? submissionData.file.name : 'Click to upload document'}
                </span>
              </label>
              {submissionData.file && (
                <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                  <span className="text-xs text-gray-700">{submissionData.file.name}</span>
                  <button
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className="px-4 py-1.5 rounded bg-gray-100 text-black text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSavingDraft && (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-black"></div>
              )}
              {isSavingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isSavingDraft || !emailContent.trim()}
              className="px-4 py-1.5 rounded bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              )}
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        )}

        {!canEdit && existingSubmission && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              <strong className="text-black">Submitted on:</strong> {new Date(existingSubmission.submittedAt || existingSubmission.createdAt || Date.now()).toLocaleString()}
            </p>
            {existingSubmission.fileName && (
              <p className="text-xs text-gray-600 mt-1">
                <strong className="text-black">Attachment:</strong> {existingSubmission.fileName}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskStep;
