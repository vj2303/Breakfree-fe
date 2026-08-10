'use client';

import { useRef } from 'react';
import { Maximize2, Paperclip } from 'lucide-react';

import { DocumentSubmissionPreview } from '../lib/submissionPreview';
import type { SubmissionRecord } from '../lib/types';

export interface EvidencePanelProps {
  activityLabel: string;
  activityType: string;
  submissions: SubmissionRecord[];
  activeSubmissionId: string | null;
  onSelectSubmission: (submissionId: string) => void;
}

function evidenceHeading(submissionType?: string): string {
  switch (submissionType) {
    case 'VIDEO':
      return 'Evidence (Video Submission)';
    case 'DOCUMENT':
      return 'Evidence (Document Submission)';
    case 'TEXT':
      return 'Evidence (Text Submission)';
    default:
      return 'Evidence (Submission)';
  }
}

function formatTimestamp(sub: SubmissionRecord): string {
  const raw = sub.submittedAt || sub.createdAt;
  return raw ? new Date(raw).toLocaleString() : '—';
}

/** Nest replies under their parent so inbox activities read as threads. */
function buildThread(submissions: SubmissionRecord[]): SubmissionRecord[] {
  const roots = submissions.filter((sub) => !sub.parentSubmissionId);
  const addChildren = (parent: SubmissionRecord): SubmissionRecord => ({
    ...parent,
    replies: submissions
      .filter((s) => s.parentSubmissionId === parent.id)
      .map((child) => addChildren(child)),
  });
  return roots.map((root) => addChildren(root));
}

function StatusPill({ status }: { status?: string }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-xs ${
        status === 'SUBMITTED'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-yellow-200 bg-yellow-50 text-yellow-700'
      }`}
    >
      {status || 'SUBMITTED'}
    </span>
  );
}

function InboxSubmission({ sub, depth = 0 }: { sub: SubmissionRecord; depth?: number }) {
  let subject = 'Email Reply';
  let to: string[] | string = [];
  let cc: string[] | string = [];
  try {
    const notes = sub.notes ? JSON.parse(sub.notes) : {};
    subject = notes.subject || subject;
    to = notes.to || [];
    cc = notes.cc || [];
  } catch {
    // Notes are not JSON on older submissions — fall back to the defaults above.
  }

  return (
    <div
      className={`rounded border border-gray-200 bg-white p-3 ${
        depth > 0 ? 'ml-6 border-l-2 border-l-gray-300' : ''
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-black">{subject}</p>
          <p className="mt-0.5 text-xs text-gray-600">
            {Array.isArray(to) ? to.join(', ') : to}
            {cc && cc.length > 0 && ` | CC: ${Array.isArray(cc) ? cc.join(', ') : cc}`}
          </p>
        </div>
        <div className="text-right">
          <StatusPill status={sub.submissionStatus} />
          <p className="mt-0.5 text-xs text-gray-500">{formatTimestamp(sub)}</p>
        </div>
      </div>
      <div
        className="prose prose-sm mt-2 max-w-none rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800"
        dangerouslySetInnerHTML={{ __html: sub.textContent || '<p>No content</p>' }}
      />
      {sub.fileName && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-700">
          <Paperclip className="h-3.5 w-3.5" />
          {sub.fileName}
        </div>
      )}
      {sub.replies && sub.replies.length > 0 && (
        <div className="mt-3">
          {sub.replies.map((reply) => (
            <InboxSubmission key={reply.id} sub={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EvidencePanel({
  activityLabel,
  activityType,
  submissions,
  activeSubmissionId,
  onSelectSubmission,
}: EvidencePanelProps) {
  const viewerRef = useRef<HTMLDivElement>(null);

  const sorted = [...submissions].sort(
    (a, b) =>
      new Date(a.createdAt || a.submittedAt || 0).getTime() -
      new Date(b.createdAt || b.submittedAt || 0).getTime()
  );

  const isInbox = activityType === 'INBOX_ACTIVITY';
  const active = sorted.find((s) => s.id === activeSubmissionId) ?? sorted[0];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-black">
          {isInbox ? 'Evidence (Inbox Thread)' : evidenceHeading(active?.submissionType)}
        </h3>
        {active && !isInbox && (
          <button
            type="button"
            onClick={() => viewerRef.current?.requestFullscreen?.()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Maximize2 size={14} />
            Open in Fullscreen
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500">
          <p>No submissions yet for this activity</p>
        </div>
      ) : isInbox ? (
        <div className="space-y-3">
          {buildThread(sorted).map((thread) => (
            <InboxSubmission key={thread.id} sub={thread} />
          ))}
        </div>
      ) : (
        <>
          {sorted.length > 1 && (
            <div className="mb-3 flex gap-1.5 overflow-x-auto">
              {sorted.map((sub) => {
                const isActive = sub.id === active?.id;
                const stamp = sub.submittedAt || sub.createdAt;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSelectSubmission(sub.id)}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sub.submissionType || 'TEXT'}
                    {stamp ? ` · ${new Date(stamp).toLocaleDateString()}` : ''}
                  </button>
                );
              })}
            </div>
          )}

          {active && (
            <div>
              <div className="mb-1.5 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-black">{activityLabel}</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Type: {active.submissionType || 'TEXT'}
                  </p>
                </div>
                <div className="text-right">
                  <StatusPill status={active.submissionStatus} />
                  <p className="mt-0.5 text-xs text-gray-500">{formatTimestamp(active)}</p>
                </div>
              </div>

              <div ref={viewerRef} className="bg-white">
                {active.submissionType === 'VIDEO' && active.fileUrl && (
                  <div className="mt-2">
                    <video
                      controls
                      className="max-h-[min(60vh,460px)] w-full rounded-lg bg-black"
                      preload="metadata"
                    >
                      <source src={active.fileUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    {active.fileName && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-600">
                        <Paperclip className="h-3.5 w-3.5" />
                        {active.fileName}
                      </p>
                    )}
                  </div>
                )}

                {active.submissionType === 'DOCUMENT' && active.fileUrl && (
                  <DocumentSubmissionPreview
                    fileUrl={active.fileUrl}
                    fileName={active.fileName}
                    fileSize={active.fileSize}
                  />
                )}

                {active.submissionType === 'TEXT' && active.textContent && (
                  <div
                    className="prose prose-sm mt-2 max-w-none rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800"
                    dangerouslySetInnerHTML={{ __html: active.textContent }}
                  />
                )}
              </div>

              {active.notes && (
                <div className="mt-1.5 text-xs text-gray-600">
                  <p>
                    <strong className="text-black">Notes:</strong> {active.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
