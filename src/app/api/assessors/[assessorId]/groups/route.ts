import { NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../../lib/apiConfig';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessorId: string }> }
) {
  try {
    // Await the params since they're now a Promise
    const { assessorId } = await params;
    
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Forward the request to the external API
    const response = await fetch(`${SERVER_API_BASE_URL_WITH_API}/assessors/${assessorId}/groups`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch assessor groups' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching assessor groups:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}