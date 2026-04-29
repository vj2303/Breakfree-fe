import { NextRequest, NextResponse } from "next/server";
import { SERVER_API_BASE_URL_WITH_API } from "../../../../lib/apiConfig";
import { generateReport } from "../../../../lib/openai-report/generator";
import { transformToReportInput } from "../../../../lib/openai-report/transform";

/**
 * POST /api/reports/generate-openai
 *
 * Fetches assessment data for a participant + assessment center,
 * transforms it into the ReportInput shape, then runs the 3-call
 * OpenAI architecture (competency profiles, AI insights, 70-20-10 recs)
 * in parallel.
 *
 * Body: { participantId: string, assessmentCenterId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Authorization token required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { participantId, assessmentCenterId } = body;

    if (!participantId || !assessmentCenterId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: participantId, assessmentCenterId",
        },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OPENAI_API_KEY not configured. Add it to your environment variables.",
        },
        { status: 500 }
      );
    }

    // Fetch assessment center details (competencies, activities)
    const [acResponse, scoresResponse, participantResponse] = await Promise.all(
      [
        fetch(
          `${SERVER_API_BASE_URL_WITH_API}/assessment-centers/${assessmentCenterId}`,
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        ),
        fetch(
          `${SERVER_API_BASE_URL_WITH_API}/assessors/admin/scores?assessmentCenterId=${assessmentCenterId}&participantId=${participantId}&limit=100`,
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        ),
        fetch(
          `${SERVER_API_BASE_URL_WITH_API}/participants/${participantId}`,
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        ),
      ]
    );

    // Parse responses
    const acData = acResponse.ok ? await acResponse.json() : null;
    const scoresData = scoresResponse.ok
      ? await scoresResponse.json()
      : null;
    const participantData = participantResponse.ok
      ? await participantResponse.json()
      : null;

    // Build the raw data structure
    const rawData = {
      participant: participantData?.data || participantData?.success
        ? participantData.data
        : { id: participantId, name: "Participant" },
      assessmentCenter: acData?.data
        ? { id: assessmentCenterId, name: acData.data.name, displayName: acData.data.displayName }
        : { id: assessmentCenterId, name: "Assessment Centre" },
      scores: scoresData?.data?.scores || [],
      competencies: acData?.data?.competencies || [],
      activities: acData?.data?.activities || [],
    };

    // Transform to ReportInput
    const reportInput = transformToReportInput(rawData);

    // Check we have actual scoring data
    const scoringKeys = Object.keys(reportInput.scoring);
    if (scoringKeys.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No scoring data available for this participant/assessment center combination. Ensure assessor scores have been submitted.",
        },
        { status: 400 }
      );
    }

    // Run the 3-call OpenAI generation
    const report = await generateReport(reportInput, openaiApiKey);

    return NextResponse.json({
      success: true,
      data: {
        participant: rawData.participant,
        assessmentCenter: rawData.assessmentCenter,
        input: reportInput,
        report,
      },
    });
  } catch (error) {
    console.error("[generate-openai] Error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";

    // Surface OpenAI-specific errors
    if (message.includes("rate limit") || message.includes("429")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OpenAI rate limit exceeded. Please try again in a few moments.",
        },
        { status: 429 }
      );
    }
    if (message.includes("quota") || message.includes("insufficient_quota")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OpenAI API quota exceeded. Please check your billing and quota limits.",
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
