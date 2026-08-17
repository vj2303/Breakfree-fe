'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Paperclip, Plus } from 'lucide-react';

import { DocumentSubmissionPreview } from '../lib/submissionPreview';
import { formatClock, markerColor, sortObservations } from '../lib/observations';
import type { Observation } from '../lib/observations';
import type { SubmissionRecord } from '../lib/types';
import ObservationList from './ObservationList';

export interface EvidencePanelProps {
  activityLabel: string;
  activityType: string;
  submissions: SubmissionRecord[];
  activeSubmissionId: string | null;
  onSelectSubmission: (submissionId: string) => void;
  observations: Observation[];
  disabled: boolean;
  /** Short label of the sub-competency open in the scoring form, e.g. "1.3 Recognises trends". */
  activeMappingLabel: string | null;
  labelsFor: (observation: Observation) => { competency: string; subCompetency: string } | null;
  onAddObservation: (text: string, timeSec: number | null, mapToActive: boolean) => void;
  onEditObservation: (id: string, text: string) => void;
  onDeleteObservation: (id: string) => void;
  onMapObservationToActive: (id: string) => void;
}

function evidenceHeading(submissionType?: string): string {
  switch (submissionType) {
    case 'VIDEO':
      return 'Video Submission';
    case 'DOCUMENT':
      return 'Document Submission';
    case 'TEXT':
      return 'Text Submission';
    default:
      return 'Submission';
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
      className={`rounded border px-1.5 py-0.5 text-[11px] ${
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
  observations,
  disabled,
  activeMappingLabel,
  labelsFor,
  onAddObservation,
  onEditObservation,
  onDeleteObservation,
  onMapObservationToActive,
}: EvidencePanelProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftTime, setDraftTime] = useState<number | null>(null);
  const [mapToActive, setMapToActive] = useState(true);

  const sorted = [...submissions].sort(
    (a, b) =>
      new Date(a.createdAt || a.submittedAt || 0).getTime() -
      new Date(b.createdAt || b.submittedAt || 0).getTime()
  );

  const isInbox = activityType === 'INBOX_ACTIVITY';
  const active = sorted.find((s) => s.id === activeSubmissionId) ?? sorted[0];
  const isVideo = !isInbox && active?.submissionType === 'VIDEO' && Boolean(active.fileUrl);
  const orderedObservations = sortObservations(observations);

  const openComposer = useCallback(() => {
    if (disabled) return;
    const video = videoRef.current;
    if (video) {
      video.pause();
      setDraftTime(video.currentTime);
    } else {
      setDraftTime(null);
    }
    setComposerOpen(true);
    // Focus after the composer mounts.
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }, [disabled]);

  // "N" for a quick note, as long as the assessor is not typing into a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'n' && event.key !== 'N') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      // Don't fire behind an open dialog (e.g. the final summary).
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      openComposer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openComposer]);

  const seekTo = (timeSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timeSec;
    setCurrentTime(timeSec);
  };

  const saveDraft = () => {
    const text = draft.trim();
    if (!text) return;
    onAddObservation(text, draftTime, mapToActive && Boolean(activeMappingLabel));
    setDraft('');
    setComposerOpen(false);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Evidence / Submission
        </h3>
        {active && !isInbox && (
          <button
            type="button"
            onClick={() => viewerRef.current?.requestFullscreen?.()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
          >
            <Maximize2 size={13} />
            Fullscreen
          </button>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className="p-4">
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
                <>
                  <div ref={viewerRef} className="overflow-hidden rounded-xl bg-black">
                    {isVideo && (
                      <div className="relative">
                        <p className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                          {activityLabel}
                        </p>
                        <video
                          ref={videoRef}
                          controls
                          className="max-h-[min(46vh,360px)] w-full bg-black"
                          preload="metadata"
                          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        >
                          <source src={active.fileUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}

                    {active.submissionType === 'DOCUMENT' && active.fileUrl && (
                      <div className="bg-white">
                        <DocumentSubmissionPreview
                          fileUrl={active.fileUrl}
                          fileName={active.fileName}
                          fileSize={active.fileSize}
                        />
                      </div>
                    )}

                    {active.submissionType === 'TEXT' && active.textContent && (
                      <div
                        className="prose prose-sm max-w-none bg-white p-3 text-xs text-gray-800"
                        dangerouslySetInnerHTML={{ __html: active.textContent }}
                      />
                    )}
                  </div>

                  {isVideo && (
                    <div className="mt-3">
                      <div className="relative h-9">
                        <div className="absolute inset-x-0 top-6 h-1.5 rounded-full bg-gray-200">
                          <div
                            className="h-1.5 rounded-full bg-violet-600"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        {orderedObservations.map((observation, index) => {
                          if (observation.timeSec === null || duration <= 0) return null;
                          const left = Math.min(
                            100,
                            Math.max(0, (observation.timeSec / duration) * 100)
                          );
                          const color = markerColor(index);
                          return (
                            <button
                              key={observation.id}
                              type="button"
                              onClick={() => seekTo(observation.timeSec as number)}
                              title={`${formatClock(observation.timeSec)} — ${observation.text}`}
                              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                              style={{ left: `${left}%` }}
                            >
                              <span
                                className={`flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-semibold text-white ring-2 ${color.dot} ${color.ring}`}
                              >
                                {index + 1}
                              </span>
                              <span className={`h-2 w-0.5 ${color.dot}`} />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-[11px] tabular-nums text-gray-500">
                        <span>{formatClock(currentTime)}</span>
                        <span>{formatClock(duration)}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      {active.fileName && (
                        <>
                          <Paperclip className="h-3.5 w-3.5" />
                          {active.fileName}
                        </>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusPill status={active.submissionStatus} />
                      {evidenceHeading(active.submissionType)} · {formatTimestamp(active)}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Observations */}
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openComposer}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Plus size={14} />
              Add Observation
            </button>
            <span className="text-xs text-gray-500">
              Press{' '}
              <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                N
              </kbd>{' '}
              for quick note
            </span>
          </div>

          {composerOpen && (
            <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-gray-600">
                <span className="font-medium tabular-nums text-violet-700">
                  {draftTime === null ? 'Untimed note' : `At ${formatClock(draftTime)}`}
                </span>
                {activeMappingLabel && (
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={mapToActive}
                      onChange={(e) => setMapToActive(e.target.checked)}
                      className="h-3.5 w-3.5 accent-violet-600"
                    />
                    Map to {activeMappingLabel}
                  </label>
                )}
              </div>
              <textarea
                ref={composerRef}
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setComposerOpen(false);
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveDraft();
                }}
                placeholder="What did you observe? e.g. “Reframed the problem around the customer before proposing options.”"
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!draft.trim()}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:bg-gray-300"
                >
                  Save Observation
                </button>
              </div>
            </div>
          )}

          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              My Observations ({orderedObservations.length})
            </p>
            <ObservationList
              observations={orderedObservations}
              labelsFor={labelsFor}
              disabled={disabled}
              onSeek={seekTo}
              onEdit={onEditObservation}
              onDelete={onDeleteObservation}
              onMapToActive={onMapObservationToActive}
              activeMappingLabel={activeMappingLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
