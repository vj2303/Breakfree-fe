"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import AssessmentCenterStepper from "./AssessmentCenterStepper";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Calendar,
  FileText,
  Award,
  Loader2,
  Users,
} from "lucide-react";
import AssignParticipantsModal from "./AssignParticipantsModal";
import { API_BASE_URL_WITH_API } from "@/lib/apiConfig";

// LocalStorage keys for persistence (must match the ones in create/page.tsx)
const STORAGE_KEYS = {
  FORM_DATA: "assessment-center-form-data",
  CURRENT_STEP: "assessment-center-current-step",
  EDIT_ID: "assessment-center-edit-id",
  IS_ACTIVE: "assessment-center-is-active",
};

export default function AssessmentCenterPage() {
  const [showStepper, setShowStepper] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingPersistence, setIsCheckingPersistence] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCenterForAssign, setSelectedCenterForAssign] = useState<{
    id: string;
    activities: any[];
    assignments: any[];
  } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);
  const {
    assessmentCenters,
    assessmentCentersLoading,
    fetchAssessmentCenters,
    deleteAssessmentCenter,
    token,
  } = useAuth();

  // Wrap fetchAssessmentCenters in useCallback to stabilize its reference
  const stableFetchAssessmentCenters = useCallback(() => {
    fetchAssessmentCenters();
  }, [fetchAssessmentCenters]);

  useEffect(() => {
    if (token && !assessmentCenters) {
      stableFetchAssessmentCenters();
    }
  }, [token, assessmentCenters, stableFetchAssessmentCenters]);

  // Check for persisted data and redirect to create/edit page if found
  // Only redirect if user navigated here directly (not from clicking a tab)
  useEffect(() => {
    // Only check once
    if (hasRedirectedRef.current) {
      setIsCheckingPersistence(false);
      return;
    }

    // Don't redirect if we're already on the create page
    if (pathname?.includes("/assessment-center/create")) {
      hasRedirectedRef.current = true;
      setIsCheckingPersistence(false);
      return;
    }

    // Check if user came from clicking a tab (referrer check)
    // If they explicitly navigated here, don't auto-redirect
    const shouldAutoRedirect =
      typeof window !== "undefined"
        ? sessionStorage.getItem("assessment-center-auto-redirect") !== "false"
        : true;

    if (!shouldAutoRedirect) {
      // User explicitly navigated here, clear the flag and don't redirect
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("assessment-center-auto-redirect");
      }
      hasRedirectedRef.current = true;
      setIsCheckingPersistence(false);
      return;
    }

    try {
      const isActive = localStorage.getItem(STORAGE_KEYS.IS_ACTIVE);
      const editId = localStorage.getItem(STORAGE_KEYS.EDIT_ID);
      const formData = localStorage.getItem(STORAGE_KEYS.FORM_DATA);

      // If there's persisted data, redirect to create/edit page
      if (isActive === "true" && formData) {
        hasRedirectedRef.current = true;

        if (editId) {
          // Redirect to edit page
          const editUrl = `/dashboard/report-generation/content/assessment-center/create?edit=${editId}`;
          router.replace(editUrl);
        } else {
          // Redirect to create page
          const createUrl =
            "/dashboard/report-generation/content/assessment-center/create";
          router.replace(createUrl);
        }
        setIsCheckingPersistence(false);
        return;
      }
    } catch (error) {
      console.error("Error checking persisted data:", error);
    }

    hasRedirectedRef.current = true;
    setIsCheckingPersistence(false);
  }, [router, pathname]);

  // Handle edit assessment center
  const handleEdit = (centerId: string) => {
    setActiveDropdown(null);
    const editUrl = `/dashboard/report-generation/content/assessment-center/create?edit=${centerId}`;
    window.location.href = editUrl;
  };

  // Handle assign participants
  const handleAssignParticipants = async (center: any) => {
    setActiveDropdown(null);
    try {
      // Fetch assessment center details to get activities and existing assignments
      const response = await fetch(
        `${API_BASE_URL_WITH_API}/assessment-centers/${center.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const activities = result.data.activities || [];

          // Fetch activity details (case studies and inbox activities)
          const activityIds = activities
            .map((act: any) => act.activityId)
            .filter(Boolean);

          if (activityIds.length > 0) {
            try {
              // Separate activity IDs by type
              const caseStudyIds = activities
                .filter((act: any) => act.activityType === "CASE_STUDY")
                .map((act: any) => act.activityId)
                .filter(Boolean);
              const inboxActivityIds = activities
                .filter((act: any) => act.activityType === "INBOX_ACTIVITY")
                .map((act: any) => act.activityId)
                .filter(Boolean);

              // Fetch case studies and inbox activities - only the ones we need
              const fetchPromises = [];
              if (caseStudyIds.length > 0) {
                fetchPromises.push(
                  fetch(
                    `${API_BASE_URL_WITH_API}/case-studies?page=1&limit=100`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    }
                  ).then((res) => res.json())
                );
              } else {
                fetchPromises.push(
                  Promise.resolve({ data: { caseStudies: [] } })
                );
              }

              if (inboxActivityIds.length > 0) {
                fetchPromises.push(
                  fetch(
                    `${API_BASE_URL_WITH_API}/inbox-activities?page=1&limit=100`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    }
                  ).then((res) => res.json())
                );
              } else {
                fetchPromises.push(
                  Promise.resolve({ data: { inboxActivities: [] } })
                );
              }

              const [caseStudiesData, inboxActivitiesData] = await Promise.all(
                fetchPromises
              );

              const caseStudies = caseStudiesData?.data?.caseStudies || [];
              const inboxActivities =
                inboxActivitiesData?.data?.inboxActivities || [];

              // De-duplicate activities by activityId (same activity can appear multiple times
              // with different competencyLibraryId due to Subject-Exercise Matrix)
              const uniqueActivityMap = new Map<string, any>();
              activities.forEach((act: any) => {
                const activityId = act.activityId;
                if (activityId && !uniqueActivityMap.has(activityId)) {
                  uniqueActivityMap.set(activityId, act);
                }
              });
              const uniqueActivities = Array.from(uniqueActivityMap.values());

              // Map activities with their details - matching the format from create flow (FormActivity)
              const activitiesWithDetails = uniqueActivities.map((act: any) => {
                const activityType =
                  act.activityType?.toLowerCase().replace("_", "-") || "";
                let activityDetail = null;

                if (act.activityType === "CASE_STUDY") {
                  activityDetail = caseStudies.find(
                    (cs: any) => cs.id === act.activityId
                  );
                } else if (act.activityType === "INBOX_ACTIVITY") {
                  activityDetail = inboxActivities.find(
                    (ia: any) => ia.id === act.activityId
                  );
                }

                // Use displayName if available, otherwise fall back to activity name
                // This matches the logic in ParticipantAssessorManagementStep
                const displayName =
                  act.displayName || activityDetail?.name || "Unnamed Activity";
                const activityName = activityDetail?.name || "Unnamed Activity";

                // Return in the same format as FormActivity interface
                const mappedActivity = {
                  id: act.activityId || act.id,
                  activityType: activityType,
                  activityContent: act.activityId || act.id, // This is the ID used in the select
                  displayName: displayName,
                  name: activityName,
                };

                console.log("Mapping activity:", {
                  original: act,
                  mapped: mappedActivity,
                  activityDetail: activityDetail,
                });

                return mappedActivity;
              });

              setSelectedCenterForAssign({
                id: center.id,
                activities: activitiesWithDetails,
                assignments: result.data.assignments || [],
              });
              setAssignModalOpen(true);
            } catch (error) {
              console.error("Error fetching activity details:", error);
              // Fallback: use activities without details but with displayName if available
              // De-duplicate by activityId first
              const uniqueFallbackMap = new Map<string, any>();
              activities.forEach((act: any) => {
                const activityId = act.activityId || act.id;
                if (activityId && !uniqueFallbackMap.has(activityId)) {
                  uniqueFallbackMap.set(activityId, act);
                }
              });
              const uniqueFallbackActivities = Array.from(uniqueFallbackMap.values());
              
              setSelectedCenterForAssign({
                id: center.id,
                activities: uniqueFallbackActivities.map((act: any) => ({
                  id: act.activityId || act.id,
                  activityType:
                    act.activityType?.toLowerCase().replace("_", "-") || "",
                  activityContent: act.activityId || act.id,
                  displayName: act.displayName || "Unnamed Activity",
                  name: "Unnamed Activity",
                })),
                assignments: result.data.assignments || [],
              });
              setAssignModalOpen(true);
            }
          } else {
            setSelectedCenterForAssign({
              id: center.id,
              activities: [],
              assignments: result.data.assignments || [],
            });
            setAssignModalOpen(true);
          }
        } else {
          alert("Failed to load assessment center details");
        }
      } else {
        alert("Failed to load assessment center details");
      }
    } catch (error) {
      console.error("Error fetching assessment center:", error);
      alert("An error occurred while loading assessment center details");
    }
  };

  // Handle delete assessment center
  const handleDelete = async (centerId: string) => {
    setIsDeleting(true);
    try {
      const result = await deleteAssessmentCenter(centerId);

      if (result.success) {
        setDeleteConfirmId(null);
      } else {
        console.error("Failed to delete assessment center:", result.message);
        alert(
          result.message ||
            "Failed to delete assessment center. Please try again."
        );
      }
    } catch (error) {
      console.error("Error deleting assessment center:", error);
      alert("An error occurred while deleting the assessment center.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        activeDropdown &&
        !target.closest(".dropdown-menu") &&
        !target.closest(".dropdown-trigger")
      ) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  // Show loading while checking for persisted data
  if (isCheckingPersistence) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showStepper) {
    return <AssessmentCenterStepper onBack={() => setShowStepper(false)} />;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
              Assessment Centers
            </h3>
            <p className="text-base text-gray-600">
              Manage and organize your assessment centers
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-900 text-white font-semibold shadow-md hover:bg-gray-800 transition-all duration-200 hover:shadow-lg"
            onClick={() =>
              router.push(
                "/dashboard/report-generation/content/assessment-center/create"
              )
            }
          >
            <Plus className="w-5 h-5" />
            Create Assessment Center
          </button>
        </div>

        {assessmentCentersLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
              <span className="text-gray-600">
                Loading assessment centers...
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessmentCenters?.assessmentCenters?.length ? (
              assessmentCenters.assessmentCenters.map((center) => (
                <div
                  key={center.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-grey-300 relative overflow-hidden group"
                >
                  <div className="p-6">
                    {/* Header with title and menu */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 pr-2">
                        <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 transition-colors">
                          {center.name || "Untitled Assessment Center"}
                        </h2>
                        {center.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {center.description}
                          </p>
                        )}
                      </div>

                      {/* Three dots menu */}
                      <div className="relative dropdown-menu">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(
                              activeDropdown === center.id ? null : center.id
                            );
                          }}
                          className="dropdown-trigger p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>

                        {activeDropdown === center.id && (
                          <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(center.id);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignParticipants(center);
                              }}
                              className="w-full flex items-center gap-3 text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                            >
                              <Users className="w-4 h-4" />
                              Assign Participants
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(center.id);
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instructions */}
                    {/* {center.displayInstructions && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900 mb-1.5 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          Instructions
                        </p>
                        <div 
                          className="text-xs text-blue-800 line-clamp-3 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: center.displayInstructions }}
                        />
                      </div>
                    )} */}

                    {/* Metadata */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">
                          Template:
                        </span>
                        <span className="text-gray-600">
                          {center.reportTemplateName || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Award className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">
                          Competencies:
                        </span>
                        <span className="text-gray-600">
                          {center.competencies?.length || 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">
                          Created:
                        </span>
                        <span className="text-gray-600">
                          {new Date(center.createdAt).toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "short", day: "numeric" }
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Template Type Badge */}
                    {center.reportTemplateType && (
                      <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {center.reportTemplateType}
                        </span>
                      </div>
                    )}

                    {/* Competencies Tags */}
                    {center.competencies && center.competencies.length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          Competencies
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {center.competencies.slice(0, 3).map((competency) => (
                            <span
                              key={competency.id}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200"
                            >
                              {competency.competencyName}
                            </span>
                          ))}
                          {center.competencies.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              +{center.competencies.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Assessment Centers Found
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Get started by creating your first assessment center to
                    organize and manage your assessments.
                  </p>
                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/report-generation/content/assessment-center/create"
                      )
                    }
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Assessment Center
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !isDeleting && setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Delete Assessment Center
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Are you sure you want to delete this assessment center? All
                associated data will be permanently removed.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Participants Modal */}
      {selectedCenterForAssign && (
        <AssignParticipantsModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedCenterForAssign(null);
          }}
          assessmentCenterId={selectedCenterForAssign.id}
          activities={selectedCenterForAssign.activities}
          existingAssignments={selectedCenterForAssign.assignments}
          onSuccess={() => {
            fetchAssessmentCenters();
          }}
        />
      )}
    </>
  );
}
