import { NextResponse } from 'next/server';

import { SERVER_API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

export async function GET(request: Request) {
  try {
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
    const response = await fetch(`${SERVER_API_BASE_URL_WITH_API}/auth/me`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return NextResponse.json(
        {
          success: true,
          message: result.message,
          data: result.data,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message || 'Failed to fetch user information' 
        }, 
        { status: response.status || 401 }
      );
    }
  } catch (error) {
    console.error('Get user info API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch user information due to server error', 
        error: error?.toString() 
      }, 
      { status: 500 }
    );
  }
}
