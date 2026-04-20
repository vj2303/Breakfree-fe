"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL_WITH_API } from "@/lib/apiConfig";
import { FileText, Video, Clock, BookOpen } from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  data: string;
  readTime: number;
  exerciseTime: number;
}

interface Task {
  id: string;
  title: string;
  data: string;
  responseType: string;
  isMandatory: boolean;
  readTime: number;
  exerciseTime: number;
}

interface CaseStudyData {
  id: string;
  name: string;
  description: string;
  instructions: string;
  videoUrl?: string;
  scenarios: Scenario[];
  tasks: Task[];
}

interface AssessmentActivity {
  id: string;
  activityId: string;
  activityType: string;
  displayName?: string;
  displayInstructions?: string;
}

interface AssessmentCenterData {
  id: string;
  name: string;
  displayName: string;
  displayInstructions: string;
  activities: AssessmentActivity[];
}

const ParticipantView: React.FC = () => {
  const searchParams = useSearchParams();
  const caseStudyId = searchParams.get("id");
  const assessmentCenterId = searchParams.get("assessmentCenterId");
  const { token } = useAuth();

  const [caseStudy, setCaseStudy] = useState<CaseStudyData | null>(null);
  const [assessmentCenter, setAssessmentCenter] =
    useState<AssessmentCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    type: "task" | "scenario";
    data: Task | Scenario;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!caseStudyId || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch case study
        const caseStudyResponse = await fetch(
          `${API_BASE_URL_WITH_API}/case-studies/${caseStudyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!caseStudyResponse.ok) {
          throw new Error("Failed to fetch case study");
        }

        const caseStudyResult = await caseStudyResponse.json();
        if (caseStudyResult.success) {
          const caseStudyData = caseStudyResult.data;
          // Map the API response to our interface
          setCaseStudy({
            id: caseStudyData.id,
            name: caseStudyData.name || "",
            description: caseStudyData.description || "",
            instructions: caseStudyData.instructions || "",
            videoUrl: caseStudyData.videoUrl,
            scenarios: (caseStudyData.scenarios || []).map((s: any) => ({
              id: s.id,
              title: s.title || "",
              data: s.data || "",
              readTime: s.readTime || 0,
              exerciseTime: s.exerciseTime || 0,
            })),
            tasks: (caseStudyData.tasks || []).map((t: any) => ({
              id: t.id,
              title: t.title || "",
              data: t.data || "",
              responseType: t.responseType || "DOCUMENT",
              isMandatory: t.isMandatory !== undefined ? t.isMandatory : true,
              readTime: t.readTime || 0,
              exerciseTime: t.exerciseTime || 0,
            })),
          });
        }

        // Fetch assessment center if ID is provided
        if (assessmentCenterId) {
          const assessmentCenterResponse = await fetch(
            `${API_BASE_URL_WITH_API}/assessment-centers/${assessmentCenterId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (assessmentCenterResponse.ok) {
            const assessmentCenterResult =
              await assessmentCenterResponse.json();
            if (assessmentCenterResult.success) {
              setAssessmentCenter(assessmentCenterResult.data);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseStudyId, assessmentCenterId, token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading case study...</p>
        </div>
      </div>
    );
  }

  if (error || !caseStudy) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Case study not found"}</p>
        </div>
      </div>
    );
  }

  // Get activity-specific instructions if available
  const activityData = assessmentCenter?.activities?.find(
    (act) => act.activityId === caseStudyId && act.activityType === "CASE_STUDY"
  );

  const displayInstructions =
    activityData?.displayInstructions ||
    assessmentCenter?.displayInstructions ||
    "";
  const activityDisplayName = activityData?.displayName || caseStudy.name;

  // Format instructions for display
  const formatInstructions = (instructions: string) => {
    if (!instructions) return "";

    // Try to parse as HTML, if it fails, treat as plain text
    try {
      // Check if it's already HTML
      if (instructions.includes("<") && instructions.includes(">")) {
        return instructions;
      }
      // Otherwise, convert line breaks to HTML
      return instructions
        .split("\n")
        .map((line, index) => {
          if (line.trim() === "") return "<br />";
          return `<p>${line}</p>`;
        })
        .join("");
    } catch {
      return instructions;
    }
  };

  const getResponseTypeLabel = (responseType: string) => {
    switch (responseType?.toUpperCase()) {
      case "DOCUMENT":
      case "PPT":
      case "POWERPOINT":
        return "document";
      case "VIDEO":
        return "video";
      case "TEXT":
        return "text";
      default:
        return "document";
    }
  };

  const getResponseTypeIcon = (responseType: string) => {
    const type = getResponseTypeLabel(responseType);
    return type === "video" ? (
      <Video className="w-4 h-4" />
    ) : (
      <FileText className="w-4 h-4" />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Overview and Instructions Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Overview and Instructions
          </h1>

          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Interactive Activity - Participant Instructions
            </h2>

            {displayInstructions ? (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: formatInstructions(displayInstructions),
                }}
              />
            ) : (
              <div className="text-gray-700 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Part 1: Prepare & Upload
                  </h3>
                  <p className="text-sm">
                    Read the case study carefully and prepare your analysis and
                    recommendations in a PowerPoint presentation (max [X]
                    slides). Upload your PPT by the deadline specified.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Part 2: Present to Assessors
                  </h3>
                  <p className="text-sm">
                    Present your PPT to a panel of assessors in a virtual or
                    live session. Keep your presentation within [X] minutes and
                    be ready for follow-up questions.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mt-4">
                    <strong>Tips:</strong> Be clear, structured, and practical.
                    Show your reasoning, not just your answers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tasks, Scenarios, and Content Display Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tasks and Scenarios Stacked */}
          <div className="lg:col-span-1 space-y-6">
            {/* All Tasks Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                All Tasks ({caseStudy.tasks?.length || 0})
              </h2>
              <div className="space-y-3">
                {caseStudy.tasks && caseStudy.tasks.length > 0 ? (
                  caseStudy.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() =>
                        setSelectedItem({ type: "task", data: task })
                      }
                      className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        selectedItem?.type === "task" &&
                        selectedItem.data.id === task.id
                          ? "border-blue-500 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900 mb-1">
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span>Reading: {task.readTime || 0}min</span>
                            <span>Exercise: {task.exerciseTime || 0}min</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              getResponseTypeLabel(task.responseType) ===
                              "video"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {getResponseTypeIcon(task.responseType)}
                            {getResponseTypeLabel(task.responseType)}
                          </span>
                          {task.isMandatory && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500 text-sm">
                    No tasks available
                  </div>
                )}
              </div>
            </div>

            {/* All Scenarios Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                All Scenarios ({caseStudy.scenarios?.length || 0})
              </h2>
              <div className="space-y-3">
                {caseStudy.scenarios && caseStudy.scenarios.length > 0 ? (
                  caseStudy.scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      onClick={() =>
                        setSelectedItem({ type: "scenario", data: scenario })
                      }
                      className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        selectedItem?.type === "scenario" &&
                        selectedItem.data.id === scenario.id
                          ? "border-blue-500 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900 mb-1">
                            {scenario.title}
                          </h3>
                          <div className="text-xs text-gray-600">
                            <span>
                              {scenario.readTime || 0}min /{" "}
                              {scenario.exerciseTime || 0}min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500 text-sm">
                    No scenarios available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Content Display Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-full min-h-[600px]">
              {selectedItem ? (
                <div className="h-full">
                  {selectedItem.type === "task" ? (
                    <div>
                      <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {(selectedItem.data as Task).title}
                          </h2>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              <span>
                                Reading:{" "}
                                {(selectedItem.data as Task).readTime || 0}min
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                Exercise:{" "}
                                {(selectedItem.data as Task).exerciseTime || 0}
                                min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              getResponseTypeLabel(
                                (selectedItem.data as Task).responseType
                              ) === "video"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {getResponseTypeIcon(
                              (selectedItem.data as Task).responseType
                            )}
                            {getResponseTypeLabel(
                              (selectedItem.data as Task).responseType
                            )}
                          </span>
                          {(selectedItem.data as Task).isMandatory && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: (selectedItem.data as Task).data || "",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {(selectedItem.data as Scenario).title}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            Reading:{" "}
                            {(selectedItem.data as Scenario).readTime || 0}min
                          </span>
                          <span>
                            Exercise:{" "}
                            {(selectedItem.data as Scenario).exerciseTime || 0}
                            min
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-700">
                        <p className="font-semibold text-gray-900 mb-3">
                          Case Background:
                        </p>
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: (selectedItem.data as Scenario).data || "",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">Select a task or scenario</p>
                    <p className="text-sm">
                      Click on any item from the left to view its details here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantView;
