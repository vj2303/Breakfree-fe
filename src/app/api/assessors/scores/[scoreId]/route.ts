import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../../lib/apiConfig';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ scoreId: string }> }
) {
  try {
    const { scoreId } = await params;
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Forward the request to the external API
    const response = await fetch(`${SERVER_API_BASE_URL_WITH_API}/assessors/scores/${scoreId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to update scores' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      ...data
    });

  } catch (error) {
    console.error('Error updating scores:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

