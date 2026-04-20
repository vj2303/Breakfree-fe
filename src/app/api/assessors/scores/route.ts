import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

/**
 * Proxies POST body to the backend `POST /assessors/scores`.
 * Score comments (see assessor scoring page) may include:
 * - `activitySubCompetencyComments`: nested map
 *   activityId → competencyId → subCompetencyName → scoreKey → string
 *   where scoreKey is `score1`|`score2`|… (descriptor keys) or `__numeric` for 0–10 rows.
 * - `assignmentSubCompetencyComments`: for the current assignment, same depth without activityId:
 *   competencyId → subCompetencyName → scoreKey → string
 * Legacy: inner value was a single string; backend should accept both during migration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Forward the request to the external API
    const response = await fetch(`${SERVER_API_BASE_URL_WITH_API}/assessors/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to submit scores' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      ...data
    });

  } catch (error) {
    console.error('Error submitting scores:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
