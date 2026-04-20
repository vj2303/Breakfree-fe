import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../../../lib/apiConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Await the params since they're now a Promise in Next.js 15
    const { participantId } = await params;

    const { searchParams } = new URL(request.url);
    const assessmentCenterId = searchParams.get('assessmentCenterId') || '';

    // Build query string
    const queryParams = new URLSearchParams();
    if (assessmentCenterId) queryParams.append('assessmentCenterId', assessmentCenterId);

    const backendUrl = `${SERVER_API_BASE_URL_WITH_API}/management-reports/participant/${participantId}/pre-post-assessment?${queryParams.toString()}`;

    // Forward request to backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch pre-post assessment data' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Management reports pre-post assessment API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

