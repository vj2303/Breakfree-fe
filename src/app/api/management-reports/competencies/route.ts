import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assessmentCenterId = searchParams.get('assessmentCenterId') || '';
    const search = searchParams.get('search') || '';
    const groupId = searchParams.get('groupId') || '';

    // Build query string
    const queryParams = new URLSearchParams();
    if (assessmentCenterId) queryParams.append('assessmentCenterId', assessmentCenterId);
    if (search) queryParams.append('search', search);
    if (groupId) queryParams.append('groupId', groupId);

    const backendUrl = `${SERVER_API_BASE_URL_WITH_API}/management-reports/competencies?${queryParams.toString()}`;

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
        { success: false, message: data.message || 'Failed to fetch competency data' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Management reports competencies API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

