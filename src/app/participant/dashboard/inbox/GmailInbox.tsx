"use client";

import React, { useState, useEffect, useMemo } from "react";
import { InboxActivityData, EmailContent, InboxScenario } from "./types";
import RichTextEditor from "@/components/RichTextEditor";
import { useAuth } from "@/context/AuthContext";
import { AssignmentSubmissionApi } from "@/lib/assignmentSubmissionApi";
import ScenariosPanel from "./ScenariosPanel";

interface AssignmentData {
  assessmentCenter: {
    id: string;
    name?: string;
    displayName?: string;
  };
}

interface GmailInboxProps {
  activityData?: InboxActivityData;
  assignmentData: AssignmentData;
  onRefresh?: () => void;
  /** Final submit for the entire assignment (shown when on Task step) */
  onFinalSubmit?: () => void;
  isAssignmentSubmitted?: boolean;
  isSubmittingAssignment?: boolean;
}

type MailboxView = "inbox" | "drafts" | "sent";
type EmailThread = {
  id: string;
  subject: string;
  participants: string[];
  lastMessage: string;
  lastMessageDate: Date;
  unread: boolean;
  originalEmail: EmailContent;
  replies: SubmissionThread[];
};

interface SubmissionThread {
  id: string;
  parentId?: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  content: string;
  date: Date;
  status: "DRAFT" | "SUBMITTED";
  fileUrl?: string;
  fileName?: string;
}

const GmailInbox: React.FC<GmailInboxProps> = ({
  activityData,
  assignmentData,
  onRefresh,
  onFinalSubmit,
  isAssignmentSubmitted = false,
  isSubmittingAssignment = false,
}) => {
  const { token, assignments, fetchAssignments } = useAuth();
  const [mailboxView, setMailboxView] = useState<MailboxView>("inbox");
  const [mainView, setMainView] = useState<"inbox" | "scenarios">("inbox");
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(
    null,
  );
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    cc: "",
    content: "",
    replyToThreadId: null as string | null,
    parentSubmissionId: null as string | null,
    draftId: null as string | null,
  });
  const [submissions, setSubmissions] = useState<SubmissionThread[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  interface LocalDraft {
    id: string;
    to: string;
    subject: string;
    cc: string;
    content: string;
    replyToThreadId: string | null;
    parentSubmissionId: string | null;
    updatedAt: string;
  }

  const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>([]);

  interface SubmissionData {
    id?: string;
    parentSubmissionId?: string;
    notes?: string;
    textContent?: string;
    submittedAt?: string;
    createdAt?: string;
    submissionStatus?: string;
    fileUrl?: string;
    fileName?: string;
  }
  const existingSubmission = activityData?.submission as
    | SubmissionData
    | undefined;

  // Load existing submissions from activityData
  interface ActivityDataWithSubmissions extends InboxActivityData {
    allSubmissions?: SubmissionData[];
  }

  const contents = useMemo(
    () => activityData?.activityDetail?.contents || [],
    [activityData?.activityDetail?.contents],
  );
  const scenarios = activityData?.activityDetail?.scenarios || [];
  const organizationCharts =
    activityData?.activityDetail?.organizationCharts || [];

  const getDraftStorageKey = () => {
    const participantId = assignments?.participant?.id || "unknown-participant";
    const activityId = activityData?.activityId || "unknown-activity";
    return `inboxDrafts:${participantId}:${activityId}`;
  };

  const persistDrafts = (drafts: LocalDraft[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(getDraftStorageKey(), JSON.stringify(drafts));
    } catch (e) {
      console.error("Failed to persist drafts to localStorage", e);
    }
  };

  // Load drafts from localStorage on mount / when participant or activity changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(getDraftStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as LocalDraft[];
        setLocalDrafts(Array.isArray(parsed) ? parsed : []);
      } else {
        setLocalDrafts([]);
      }
    } catch (e) {
      console.error("Failed to load drafts from localStorage", e);
      setLocalDrafts([]);
    }
  }, [assignments?.participant?.id, activityData?.activityId]);

  useEffect(() => {
    // Check if activityData has allSubmissions (from updated API)
    const activityWithSubs = activityData as
      | ActivityDataWithSubmissions
      | undefined;
    const allSubmissions = activityWithSubs?.allSubmissions || [];

    if (allSubmissions.length > 0) {
      const threadSubmissions: SubmissionThread[] = allSubmissions
        .filter((sub: SubmissionData) => sub.id) // Filter out submissions without id
        .map((sub: SubmissionData) => {
          try {
            const notes = sub.notes ? JSON.parse(sub.notes) : {};
            return {
              id: sub.id!,
              parentId:
                sub.parentSubmissionId || notes.parentSubmissionId || undefined,
              subject: notes.subject || `Re: ${contents[0]?.subject || ""}`,
              from: assignments?.participant?.email || "",
              to: notes.to
                ? Array.isArray(notes.to)
                  ? notes.to
                  : notes.to.split(",").map((e: string) => e.trim())
                : contents[0]?.to || [],
              cc: notes.cc
                ? Array.isArray(notes.cc)
                  ? notes.cc
                  : notes.cc.split(",").map((e: string) => e.trim())
                : contents[0]?.cc || [],
              content: sub.textContent || "",
              date: new Date(sub.submittedAt || sub.createdAt || Date.now()),
              status: (sub.submissionStatus || "SUBMITTED") as
                | "DRAFT"
                | "SUBMITTED",
              fileUrl: sub.fileUrl,
              fileName: sub.fileName,
            };
          } catch {
            return {
              id: sub.id!,
              parentId: sub.parentSubmissionId || undefined,
              subject: `Re: ${contents[0]?.subject || ""}`,
              from: assignments?.participant?.email || "",
              to: contents[0]?.to || [],
              cc: contents[0]?.cc || [],
              content: sub.textContent || "",
              date: new Date(sub.submittedAt || sub.createdAt || Date.now()),
              status: (sub.submissionStatus || "SUBMITTED") as
                | "DRAFT"
                | "SUBMITTED",
              fileUrl: sub.fileUrl,
              fileName: sub.fileName,
            };
          }
        });
      setSubmissions(threadSubmissions);
    } else if (existingSubmission) {
      // Fallback to single submission for backward compatibility
      try {
        const notes = existingSubmission.notes
          ? JSON.parse(existingSubmission.notes)
          : {};
        const submission: SubmissionThread = {
          id: existingSubmission.id || "1",
          parentId:
            existingSubmission.parentSubmissionId ||
            notes.parentSubmissionId ||
            undefined,
          subject:
            notes.subject ||
            composeData.subject ||
            `Re: ${contents[0]?.subject || ""}`,
          from: assignments?.participant?.email || "",
          to: notes.to
            ? Array.isArray(notes.to)
              ? notes.to
              : notes.to.split(",").map((e: string) => e.trim())
            : contents[0]?.to || [],
          cc: notes.cc
            ? Array.isArray(notes.cc)
              ? notes.cc
              : notes.cc.split(",").map((e: string) => e.trim())
            : contents[0]?.cc || [],
          content: existingSubmission.textContent || "",
          date: new Date(
            existingSubmission.submittedAt ||
              existingSubmission.createdAt ||
              Date.now(),
          ),
          status: (existingSubmission.submissionStatus || "SUBMITTED") as
            | "DRAFT"
            | "SUBMITTED",
          fileUrl: existingSubmission.fileUrl,
          fileName: existingSubmission.fileName,
        };
        setSubmissions([submission]);
      } catch {
        const submission: SubmissionThread = {
          id: existingSubmission.id || "1",
          parentId: existingSubmission.parentSubmissionId || undefined,
          subject: `Re: ${contents[0]?.subject || ""}`,
          from: assignments?.participant?.email || "",
          to: contents[0]?.to || [],
          cc: contents[0]?.cc || [],
          content: existingSubmission.textContent || "",
          date: new Date(
            existingSubmission.submittedAt ||
              existingSubmission.createdAt ||
              Date.now(),
          ),
          status: (existingSubmission.submissionStatus || "SUBMITTED") as
            | "DRAFT"
            | "SUBMITTED",
          fileUrl: existingSubmission.fileUrl,
          fileName: existingSubmission.fileName,
        };
        setSubmissions([submission]);
      }
    }
  }, [
    existingSubmission,
    activityData,
    contents,
    assignments,
    composeData.subject,
  ]);

  // Build thread hierarchy from submissions - returns flat list sorted by date
  const buildThreadHierarchy = (
    submissions: SubmissionThread[],
  ): SubmissionThread[] => {
    if (submissions.length === 0) return [];

    // Sort by date to maintain chronological order
    const sorted = [...submissions].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    // If there are parent-child relationships, we'll maintain them in the flat list
    // The UI will show them with indentation based on parentId
    return sorted;
  };

  // Create email threads from contents
  const emailThreads: EmailThread[] = contents.map((content, index) => {
    // Find all submissions related to this email (by subject matching)
    const threadReplies = submissions.filter(
      (s) =>
        s.subject === content.subject ||
        s.subject === `Re: ${content.subject}` ||
        s.subject.startsWith(`Re: ${content.subject}`),
    );

    // Sort replies by date and build hierarchy
    const sortedReplies = threadReplies.sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    const hierarchicalReplies = buildThreadHierarchy(sortedReplies);

    return {
      id: content.id || `thread-${index}`,
      subject: content.subject,
      participants: [content.from, ...content.to],
      lastMessage:
        hierarchicalReplies.length > 0
          ? hierarchicalReplies[hierarchicalReplies.length - 1].content
              .replace(/<[^>]*>/g, "")
              .substring(0, 100)
          : content.emailContent.replace(/<[^>]*>/g, "").substring(0, 100),
      lastMessageDate:
        hierarchicalReplies.length > 0
          ? hierarchicalReplies[hierarchicalReplies.length - 1].date
          : new Date(content.date),
      unread: hierarchicalReplies.length === 0,
      originalEmail: content,
      replies: hierarchicalReplies,
    };
  });

  const sent = submissions.filter((s) => s.status === "SUBMITTED");

  const saveCurrentComposeAsDraft = (showAlert: boolean) => {
    const hasContent =
      composeData.to.trim() ||
      composeData.subject.trim() ||
      composeData.cc.trim() ||
      composeData.content.trim();

    if (!hasContent) {
      return;
    }

    setIsSavingDraft(true);
    setLocalDrafts((prev) => {
      const now = new Date().toISOString();
      const id = composeData.draftId || `draft-${Date.now()}`;
      const nextDraft: LocalDraft = {
        id,
        to: composeData.to,
        subject: composeData.subject,
        cc: composeData.cc,
        content: composeData.content,
        replyToThreadId: composeData.replyToThreadId,
        parentSubmissionId: composeData.parentSubmissionId,
        updatedAt: now,
      };
      const others = prev.filter((d) => d.id !== id);
      const updated = [...others, nextDraft];
      persistDrafts(updated);
      return updated;
    });
    setIsSavingDraft(false);

    if (showAlert) {
      alert("Draft saved locally.");
    }
  };

  const deleteDraftById = (id: string) => {
    setLocalDrafts((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      persistDrafts(updated);
      return updated;
    });
    // If currently editing this draft, clear compose state
    if (composeData.draftId === id) {
      setComposeData({
        to: "",
        subject: "",
        cc: "",
        content: "",
        replyToThreadId: null,
        parentSubmissionId: null,
        draftId: null,
      });
      setIsComposing(false);
    }
  };

  const handleOpenDraft = (draft: LocalDraft) => {
    setComposeData({
      to: draft.to,
      subject: draft.subject,
      cc: draft.cc,
      content: draft.content,
      replyToThreadId: draft.replyToThreadId,
      parentSubmissionId: draft.parentSubmissionId,
      draftId: draft.id,
    });
    setIsComposing(true);
    setMailboxView("drafts");
    setMainView("inbox");

    if (draft.replyToThreadId) {
      const thread = emailThreads.find((t) => t.id === draft.replyToThreadId);
      setSelectedThread(thread || null);
    } else {
      setSelectedThread(null);
    }
  };

  const handleCompose = (
    thread?: EmailThread,
    replyToSubmission?: SubmissionThread,
  ) => {
    if (thread) {
      // When replying, include original sender and allow user to add more
      const originalTo = thread.originalEmail.from;
      const originalCc = thread.originalEmail.cc?.join(", ") || "";
      // If there's a reply, include its recipients too
      const replyRecipients = replyToSubmission
        ? Array.isArray(replyToSubmission.to)
          ? replyToSubmission.to.join(", ")
          : replyToSubmission.to
        : "";
      const replyCc =
        replyToSubmission && replyToSubmission.cc
          ? Array.isArray(replyToSubmission.cc)
            ? replyToSubmission.cc.join(", ")
            : replyToSubmission.cc
          : "";

      // Combine recipients, allowing user to edit
      const combinedTo = replyRecipients || originalTo;
      const combinedCc = [originalCc, replyCc].filter(Boolean).join(", ");

      setComposeData({
        to: combinedTo,
        subject: `Re: ${thread.subject}`,
        cc: combinedCc,
        content: "",
        replyToThreadId: thread.id,
        parentSubmissionId: replyToSubmission?.id || null,
        draftId: null,
      });
      setSelectedThread(thread);
    } else {
      setComposeData({
        to: contents[0]?.from || "",
        subject: contents[0] ? `Re: ${contents[0].subject}` : "",
        cc: contents[0]?.cc?.join(", ") || "",
        content: "",
        replyToThreadId: null,
        parentSubmissionId: null,
        draftId: null,
      });
      setSelectedThread(null);
    }
    setIsComposing(true);
  };

  const handleSaveDraft = () => {
    // Local-only draft save
    saveCurrentComposeAsDraft(true);
  };

  const handleSubmit = async () => {
    if (!token || !assignmentData || !activityData) return;
    if (isAssignmentSubmitted) {
      alert("This activity has already been submitted. You cannot send more emails.");
      return;
    }
    if (!composeData.content.trim()) {
      alert("Please enter email content before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionPayload = {
        participantId: assignments?.participant?.id || "",
        assessmentCenterId: assignmentData.assessmentCenter.id,
        activityId: activityData.activityId,
        activityType: "INBOX_ACTIVITY" as const,
        submissionType: "TEXT" as const,
        textContent: composeData.content,
        notes: JSON.stringify({
          to: composeData.to,
          subject: composeData.subject,
          cc: composeData.cc,
          threadId: composeData.replyToThreadId,
        }),
        parentSubmissionId: composeData.parentSubmissionId || undefined,
        isDraft: false,
      };

      const response = await AssignmentSubmissionApi.submitAssignment(
        token,
        submissionPayload,
      );

      if (response.success) {
        alert("Email sent successfully!");
        setIsComposing(false);
        // If this email came from a local draft, remove that draft
        if (composeData.draftId) {
          setLocalDrafts((prev) => {
            const updated = prev.filter((d) => d.id !== composeData.draftId);
            persistDrafts(updated);
            return updated;
          });
        }
        setComposeData({
          to: "",
          subject: "",
          cc: "",
          content: "",
          replyToThreadId: null,
          parentSubmissionId: null,
          draftId: null,
        });
        if (fetchAssignments) {
          await fetchAssignments();
        }
        if (onRefresh) onRefresh();
      } else {
        alert(`Failed to send email: ${response.message}`);
      }
    } catch (error) {
      console.error("Error submitting email:", error);
      alert("An error occurred while sending the email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayThreads = () => {
    switch (mailboxView) {
      case "sent":
        return emailThreads.filter((t) =>
          t.replies.some((r) => r.status === "SUBMITTED"),
        );
      default:
        return emailThreads;
    }
  };

  return (
    <div className="flex flex-col min-h-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-gray-200">
            <button
              onClick={() => {
                if (isAssignmentSubmitted) {
                  alert("This activity has already been submitted. You cannot compose new emails.");
                  return;
                }
                setComposeData({
                  to: contents[0]?.from || "",
                  subject: contents[0] ? `Re: ${contents[0].subject}` : "",
                  cc: contents[0]?.cc?.join(", ") || "",
                  content: "",
                  replyToThreadId: null,
                  parentSubmissionId: null,
                  draftId: null,
                });
                setIsComposing(true);
                setSelectedThread(null);
              }}
              disabled={isAssignmentSubmitted}
              className="w-full bg-black text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Compose
            </button>
          </div>
          <nav className="flex-1 p-2">
            <button
              onClick={() => {
                if (isComposing) {
                  saveCurrentComposeAsDraft(false);
                  setIsComposing(false);
                }
                setMailboxView("inbox");
                setSelectedThread(null);
                setMainView("inbox");
              }}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2.5 text-sm transition-colors ${
                mailboxView === "inbox"
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-black"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Inbox
              {emailThreads.filter((t) => t.unread).length > 0 && (
                <span className="ml-auto bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded">
                  {emailThreads.filter((t) => t.unread).length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                if (isComposing) {
                  saveCurrentComposeAsDraft(false);
                  setIsComposing(false);
                }
                setMailboxView("drafts");
                setSelectedThread(null);
                setMainView("inbox");
              }}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2.5 text-sm transition-colors ${
                mailboxView === "drafts"
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-black"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Drafts
              {localDrafts.length > 0 && (
                <span className="ml-auto bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded">
                  {localDrafts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                if (isComposing) {
                  saveCurrentComposeAsDraft(false);
                  setIsComposing(false);
                }
                setMailboxView("sent");
                setSelectedThread(null);
                setMainView("inbox");
              }}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2.5 text-sm transition-colors ${
                mailboxView === "sent"
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-black"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Sent
              {sent.length > 0 && (
                <span className="ml-auto bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded">
                  {sent.length}
                </span>
              )}
            </button>
            {/* Organization Chart */}
            {organizationCharts.length > 0 && (
              <div className="border-t border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Organization Chart
                </div>
                <div className="space-y-2">
                  {organizationCharts.map((member) => (
                    <div
                      key={member.id}
                      className="bg-gray-50 border border-gray-200 rounded px-2.5 py-2"
                    >
                      <div className="text-xs font-semibold text-black">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        {member.designation}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {member.email}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top tabs: Inbox / Scenarios */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setMainView("inbox");
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  mainView === "inbox"
                    ? "bg-black text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                }`}
              >
                Inbox ({emailThreads.length})
              </button>
              {scenarios.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMainView("scenarios");
                    setSelectedThread(null);
                    setIsComposing(false);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    mainView === "scenarios"
                      ? "bg-black text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  Scenarios ({scenarios.length})
                </button>
              )}
            </div>
          </div>

          {mainView === "scenarios" ? (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
              {scenarios.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No scenarios available for this activity.
                </div>
              ) : (
                <ScenariosPanel scenarios={scenarios} />
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex">
              {/* Email list column */}
              <div className="w-80 border-r border-gray-200 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 bg-white">
                  <h2 className="text-sm font-semibold text-black capitalize">
                    {mailboxView}
                  </h2>
                </div>
                {mailboxView === "drafts" ? (
                  localDrafts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      <p>No drafts</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {localDrafts
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.updatedAt).getTime() -
                            new Date(a.updatedAt).getTime(),
                        )
                        .map((draft) => {
                          const plainText = draft.content.replace(
                            /<[^>]*>/g,
                            "",
                          );
                          return (
                            <div
                              key={draft.id}
                              className="p-3 hover:bg-gray-50 border-l-2 border-transparent hover:border-gray-300 transition-colors flex items-start justify-between gap-2"
                            >
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => handleOpenDraft(draft)}
                              >
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-medium truncate text-sm text-gray-700">
                                    {draft.subject || "(No subject)"}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                  {draft.to || contents[0]?.from || ""}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {plainText || "Draft with no body yet"}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    draft.updatedAt,
                                  ).toLocaleDateString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      !window.confirm(
                                        "Are you sure you want to delete this draft email?",
                                      )
                                    ) {
                                      return;
                                    }
                                    deleteDraftById(draft.id);
                                    alert("Draft email deleted successfully");
                                  }}
                                  className="text-[11px] text-red-600 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )
                ) : getDisplayThreads().length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    <p>No emails in {mailboxView}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {getDisplayThreads().map((thread) => {
                      const isSelected = selectedThread?.id === thread.id;
                      return (
                        <div
                          key={thread.id}
                          onClick={() => {
                            if (isComposing) {
                              saveCurrentComposeAsDraft(false);
                              setIsComposing(false);
                            }
                            setSelectedThread(thread);
                          }}
                          className={`p-3 cursor-pointer transition-colors border-l-2 ${
                            isSelected
                              ? "bg-gray-50 border-black"
                              : thread.unread
                                ? "bg-gray-50 border-black"
                                : "border-transparent hover:bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                {thread.unread && (
                                  <div className="w-1.5 h-1.5 bg-black rounded-full flex-shrink-0" />
                                )}
                                <p
                                  className={`font-medium truncate text-sm ${
                                    thread.unread || isSelected
                                      ? "text-black"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {thread.subject}
                                </p>
                              </div>
                              <p className="text-xs text-gray-600 truncate">
                                {thread.participants.join(", ")}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {thread.lastMessage}
                              </p>
                            </div>
                            <div className="ml-3 flex-shrink-0 text-xs text-gray-500">
                              {thread.lastMessageDate.toLocaleDateString()}
                            </div>
                          </div>
                          {thread.replies.length > 0 && (
                            <div className="mt-1.5 text-xs text-gray-500">
                              {thread.replies.length}{" "}
                              {thread.replies.length === 1
                                ? "reply"
                                : "replies"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detail pane */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedThread ? (
                  <div className="max-w-3xl">
                    {/* Original email header like PreviewStep */}
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold text-black mb-4">
                        {selectedThread.subject}
                      </h2>
                      <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                        <div>
                          <div className="font-semibold text-black">
                            {selectedThread.originalEmail.from}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">From:</span>{" "}
                            {selectedThread.originalEmail.from}
                            <br />
                            <span className="font-medium">To:</span>{" "}
                            {selectedThread.originalEmail.to.join(", ")}
                            {selectedThread.originalEmail.cc &&
                              selectedThread.originalEmail.cc.length > 0 && (
                                <>
                                  <br />
                                  <span className="font-medium">CC:</span>{" "}
                                  {selectedThread.originalEmail.cc.join(", ")}
                                </>
                              )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(
                            selectedThread.originalEmail.date,
                          ).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Original email body */}
                    <div className="mb-6">
                      <div
                        className="prose prose-sm max-w-none text-gray-800"
                        dangerouslySetInnerHTML={{
                          __html: selectedThread.originalEmail.emailContent,
                        }}
                      />
                    </div>

                    {/* Replies */}
                    {selectedThread.replies.map((reply) => {
                      const getDepth = (
                        submission: SubmissionThread,
                      ): number => {
                        if (!submission.parentId) return 0;
                        const parent = selectedThread.replies.find(
                          (r) => r.id === submission.parentId,
                        );
                        return parent ? getDepth(parent) + 1 : 0;
                      };
                      const depth = getDepth(reply);

                      return (
                        <div
                          key={reply.id}
                          className={`bg-white border border-gray-200 rounded p-3 mb-3 ${
                            depth > 0 ? "ml-6 border-l-2 border-l-gray-300" : ""
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-200">
                            <div className="flex-1">
                              <p className="font-semibold text-black text-sm mb-0.5">
                                {reply.from}
                              </p>
                              <p className="text-xs text-gray-600">
                                <span className="font-medium text-gray-700">
                                  To:
                                </span>{" "}
                                {Array.isArray(reply.to)
                                  ? reply.to.join(", ")
                                  : reply.to}
                                {reply.cc && reply.cc.length > 0 && (
                                  <span className="ml-2">
                                    <span className="font-medium text-gray-700">
                                      CC:
                                    </span>{" "}
                                    {Array.isArray(reply.cc)
                                      ? reply.cc.join(", ")
                                      : reply.cc}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 ml-3">
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  reply.status === "DRAFT"
                                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                    : "bg-green-50 text-green-700 border border-green-200"
                                }`}
                              >
                                {reply.status}
                              </span>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {reply.date.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div
                            className="prose prose-sm max-w-none text-gray-800 mt-2"
                            dangerouslySetInnerHTML={{ __html: reply.content }}
                          />
                          {reply.fileName && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded inline-block border border-gray-200">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a2 2 0 00-2.828-2.828L9 10.172 7.586 8.586a2 2 0 10-2.828 2.828l4 4a2 2 0 002.828 0L16.828 9.828a2 2 0 000-2.828z"
                                />
                              </svg>
                              {reply.fileName}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Inline reply editor (shows original above) */}
                    {isComposing &&
                    composeData.replyToThreadId === selectedThread.id ? (
                      <div className="mt-6 bg-white border border-gray-200 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold text-black">
                            Reply
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsComposing(false)}
                            className="text-gray-500 hover:text-black"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              To
                            </label>
                            <input
                              type="text"
                              value={composeData.to}
                              onChange={(e) =>
                                setComposeData({
                                  ...composeData,
                                  to: e.target.value,
                                })
                              }
                              className="text-black w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Subject
                            </label>
                            <input
                              type="text"
                              value={composeData.subject}
                              onChange={(e) =>
                                setComposeData({
                                  ...composeData,
                                  subject: e.target.value,
                                })
                              }
                              className="text-black w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              CC (optional)
                            </label>
                            <input
                              type="text"
                              value={composeData.cc}
                              onChange={(e) =>
                                setComposeData({
                                  ...composeData,
                                  cc: e.target.value,
                                })
                              }
                              className="text-black w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                            />
                          </div>
                        </div>
                        <div className="mb-4">
                          <RichTextEditor
                            content={composeData.content}
                            onChange={(html) =>
                              setComposeData({
                                ...composeData,
                                content: html,
                              })
                            }
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={isSavingDraft || isSubmitting}
                            className="px-4 py-1.5 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors"
                          >
                            {isSavingDraft ? "Saving..." : "Save Draft"}
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={
                              isSubmitting ||
                              isSavingDraft ||
                              !composeData.content.trim()
                            }
                            className="px-5 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {isSubmitting ? "Sending..." : "Send"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (isAssignmentSubmitted) {
                              alert("This activity has already been submitted. You cannot send more emails.");
                              return;
                            }
                            handleCompose(selectedThread);
                          }}
                          disabled={isAssignmentSubmitted}
                          className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ) : isComposing ? (
                  // New email compose (no thread selected)
                  <div className="max-w-3xl">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-black">
                        Compose
                      </h2>
                      <button
                        type="button"
                        onClick={() => setIsComposing(false)}
                        className="text-gray-500 hover:text-black"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="space-y-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            To
                          </label>
                          <input
                            type="text"
                            value={composeData.to}
                            onChange={(e) =>
                              setComposeData({
                                ...composeData,
                                to: e.target.value,
                              })
                            }
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={composeData.subject}
                            onChange={(e) =>
                              setComposeData({
                                ...composeData,
                                subject: e.target.value,
                              })
                            }
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            CC (optional)
                          </label>
                          <input
                            type="text"
                            value={composeData.cc}
                            onChange={(e) =>
                              setComposeData({
                                ...composeData,
                                cc: e.target.value,
                              })
                            }
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <RichTextEditor
                          content={composeData.content}
                          onChange={(html) =>
                            setComposeData({ ...composeData, content: html })
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={isSavingDraft || isSubmitting}
                          className="px-4 py-1.5 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors"
                        >
                          {isSavingDraft ? "Saving..." : "Save Draft"}
                        </button>
                        {composeData.draftId && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteDraftById(composeData.draftId!)
                            }
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
                          >
                            Delete Draft
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={
                            isSubmitting ||
                            isSavingDraft ||
                            !composeData.content.trim()
                          }
                          className="px-5 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {isSubmitting ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p className="text-lg mb-2">Select an email to view</p>
                      <p className="text-sm">
                        Click on an email from the list to see its content
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Final submit bar for entire assignment - visible inside inbox */}
      {onFinalSubmit && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex flex-col gap-2">
          {!isAssignmentSubmitted && (
            <p className="text-xs text-gray-600">
              Sending emails saves them to your Sent folder. Click <strong>Submit</strong> below to finalize and submit this assignment.
            </p>
          )}
          <div className="flex justify-end items-center">
          <button
            type="button"
            onClick={onFinalSubmit}
            disabled={isAssignmentSubmitted || isSubmittingAssignment}
            className="px-5 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
            aria-label="Submit assignment"
          >
            {isSubmittingAssignment ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting...
              </>
            ) : isAssignmentSubmitted ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Submitted
              </>
            ) : (
              <>
                Submit
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </>
            )}
          </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailInbox;
