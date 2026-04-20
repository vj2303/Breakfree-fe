import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../../lib/apiConfig';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const { id: reportStructureId } = await params;
    const body = await request.json();
    const { participantId, assessmentCenterId } = body;

    if (!participantId) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: participantId' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const response = await fetch(
      `${SERVER_API_BASE_URL_WITH_API}/report-structures/${reportStructureId}/generate-participant-report`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          ...(assessmentCenterId && { assessmentCenterId }), // Include assessmentCenterId if provided
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
    console.error('Error generating participant report:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

