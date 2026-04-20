import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assessmentCenterId, participantId } = body;

    if (!assessmentCenterId || !participantId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: assessmentCenterId, participantId' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const response = await fetch(
      `${SERVER_API_BASE_URL_WITH_API}/report-structures/generate-from-assessment-center`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentCenterId,
          participantId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to generate report' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

