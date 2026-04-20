import { NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../../lib/apiConfig';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params;
    
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Authorization token required' 
        }, 
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Make request to backend API with the token
    const response = await fetch(`${SERVER_API_BASE_URL_WITH_API}/assignments/participant/${participantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message || 'Failed to fetch participant assignments' 
        }, 
        { status: response.status || 404 }
      );
    }
  } catch (error) {
    console.error('Get participant assignments API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch participant assignments due to server error', 
        error: error?.toString() 
      }, 
      { status: 500 }
    );
  }
}
